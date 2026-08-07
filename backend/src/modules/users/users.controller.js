import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { assertAdmin, withRole, USER_STATUSES } from '../../common/admin.js';
import { usersService } from './users.service.js';
import { authService } from '../auth/auth.service.js';

export const usersController = {
  profile: asyncHandler(async (req, res) => {
    const user = await usersService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }
    res.json(withRole(user));
  }),

  listAdmin: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const data = await usersService.listAll();
    res.json(data);
  }),

  createAdmin: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const { email, password, name, status } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({
        statusCode: 400,
        message: 'email, password and name are required',
      });
    }
    if (status && !USER_STATUSES.includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        message: `status must be one of: ${USER_STATUSES.join(', ')}`,
      });
    }
    const user = await authService.adminCreateUser({
      email,
      password,
      name,
      status,
    });
    res.status(201).json(user);
  }),

  updateAdmin: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ statusCode: 400, message: 'Invalid user id' });
    }
    const { email, name, status, password } = req.body || {};
    const updated = await usersService.updateUser(id, { email, name, status });

    if (password != null && String(password).length > 0) {
      await authService.adminSetPassword(id, password);
    }

    res.json(updated);
  }),

  updateStatus: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ statusCode: 400, message: 'Invalid user id' });
    }
    const { status } = req.body || {};
    if (!status || !USER_STATUSES.includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        message: `status must be one of: ${USER_STATUSES.join(', ')}`,
      });
    }
    const data = await usersService.updateUser(id, { status });
    res.json(data);
  }),

  updatePassword: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ statusCode: 400, message: 'Invalid user id' });
    }
    const { password } = req.body || {};
    await authService.adminSetPassword(id, password);
    res.json({ message: 'Password updated' });
  }),
};
