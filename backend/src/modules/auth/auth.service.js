import * as bcrypt from 'bcrypt';
import { usersService } from '../users/users.service.js';
import {
  isAdminEmail,
  normalizeEmail,
  withRole,
} from '../../common/admin.js';

export const createAuthService = (uService = usersService) => {
  const register = async (registerDto) => {
    const email = normalizeEmail(registerDto.email);
    // Public register only bootstraps the single admin account.
    if (!isAdminEmail(email)) {
      const err = new Error(
        'Public registration is disabled. Ask an admin to create your account.',
      );
      err.statusCode = 403;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await uService.create({
      email,
      name: registerDto.name,
      password: hashedPassword,
      status: 'active',
    });

    return withRole(user);
  };

  const validateUser = async (loginDto) => {
    const user = await uService.findByEmailWithPassword(loginDto.email);
    if (!user || !user.password) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const status = user.status || 'active';
    if (status === 'suspended') {
      const err = new Error('Your account has been suspended. Contact admin.');
      err.statusCode = 403;
      throw err;
    }
    if (status === 'inactive') {
      const err = new Error('Your account is inactive. Contact admin.');
      err.statusCode = 403;
      throw err;
    }

    return withRole(user);
  };

  const changePassword = async (userId, oldPassword, newPassword) => {
    const user = await uService.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 401;
      throw err;
    }

    const userWithPassword = await uService.findByEmailWithPassword(user.email);
    if (!userWithPassword || !userWithPassword.password) {
      const err = new Error('Invalid current password');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(oldPassword, userWithPassword.password);
    if (!isMatch) {
      const err = new Error('Invalid current password');
      err.statusCode = 401;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await uService.updatePassword(userId, hashedPassword);
  };

  const login = (user, jwtSignFn) => {
    const payload = { email: user.email, sub: user.id };
    const accessToken = jwtSignFn ? jwtSignFn(payload) : null;
    return {
      user: withRole(user),
      accessToken,
    };
  };

  const adminCreateUser = async ({ email, password, name, status = 'active' }) => {
    const normalized = normalizeEmail(email);
    if (isAdminEmail(normalized)) {
      const err = new Error('Cannot create another admin account');
      err.statusCode = 400;
      throw err;
    }
    if (!password || String(password).length < 6) {
      const err = new Error('password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await uService.create({
      email: normalized,
      name,
      password: hashedPassword,
      status: status || 'active',
    });
    return withRole(user);
  };

  const adminSetPassword = async (userId, newPassword) => {
    if (!newPassword || String(newPassword).length < 6) {
      const err = new Error('password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }
    const user = await uService.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await uService.updatePassword(userId, hashedPassword);
    return withRole(user);
  };

  return {
    register,
    validateUser,
    changePassword,
    login,
    adminCreateUser,
    adminSetPassword,
  };
};

export const authService = createAuthService();
