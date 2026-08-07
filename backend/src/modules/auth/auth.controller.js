import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { signAccessToken } from '../../common/middleware/auth.middleware.js';
import { withRole } from '../../common/admin.js';
import { authService } from './auth.service.js';
import { usersService } from '../users/users.service.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({
        statusCode: 400,
        message: 'email, password and name are required',
      });
    }
    const user = await authService.register({ email, password, name });
    res.status(201).json(user);
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'email and password are required',
      });
    }
    const user = await authService.validateUser({ email, password });
    const token = signAccessToken({ email: user.email, sub: user.id });
    res.json({
      user,
      accessToken: token,
    });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await usersService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }
    const status = user.status || 'active';
    if (status !== 'active') {
      return res.status(403).json({
        statusCode: 403,
        message:
          status === 'suspended'
            ? 'Your account has been suspended. Contact admin.'
            : 'Your account is inactive. Contact admin.',
      });
    }
    res.json(withRole(user));
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        statusCode: 400,
        message: 'oldPassword and newPassword are required',
      });
    }
    await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  }),
};
