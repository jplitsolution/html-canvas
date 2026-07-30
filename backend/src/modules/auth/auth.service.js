import * as bcrypt from 'bcrypt';
import { usersService } from '../users/users.service.js';

export const createAuthService = (uService = usersService) => {
  const register = async (registerDto) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await uService.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
    });

    const result = { ...user };
    delete result.password;
    return result;
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

    const result = { ...user };
    delete result.password;
    return result;
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
      user,
      accessToken,
    };
  };

  return {
    register,
    validateUser,
    changePassword,
    login,
  };
};

export const authService = createAuthService();
