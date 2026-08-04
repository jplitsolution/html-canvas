import { usersService } from './users.service.js';
import { authService } from '../auth/auth.service.js';
import { assertAdmin, withRole, USER_STATUSES } from '../../common/admin.js';

export async function usersRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/profile', async (request, reply) => {
    const user = await usersService.findById(request.user.id);
    if (!user) {
      reply.status(404);
      return { statusCode: 404, message: 'User not found' };
    }
    return withRole(user);
  });

  // --- Admin user management ---

  fastify.get('/admin', async (request, reply) => {
    assertAdmin(request);
    return usersService.listAll();
  });

  fastify.post('/admin', async (request, reply) => {
    assertAdmin(request);
    const { email, password, name, status } = request.body || {};
    if (!email || !password || !name) {
      reply.status(400);
      return {
        statusCode: 400,
        message: 'email, password and name are required',
      };
    }
    if (status && !USER_STATUSES.includes(status)) {
      reply.status(400);
      return {
        statusCode: 400,
        message: `status must be one of: ${USER_STATUSES.join(', ')}`,
      };
    }
    const user = await authService.adminCreateUser({
      email,
      password,
      name,
      status,
    });
    reply.status(201);
    return user;
  });

  fastify.patch('/admin/:id', async (request, reply) => {
    assertAdmin(request);
    const id = parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) {
      reply.status(400);
      return { statusCode: 400, message: 'Invalid user id' };
    }
    const { email, name, status, password } = request.body || {};
    const updated = await usersService.updateUser(id, { email, name, status });

    if (password != null && String(password).length > 0) {
      await authService.adminSetPassword(id, password);
    }

    return updated;
  });

  fastify.patch('/admin/:id/status', async (request, reply) => {
    assertAdmin(request);
    const id = parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) {
      reply.status(400);
      return { statusCode: 400, message: 'Invalid user id' };
    }
    const { status } = request.body || {};
    if (!status || !USER_STATUSES.includes(status)) {
      reply.status(400);
      return {
        statusCode: 400,
        message: `status must be one of: ${USER_STATUSES.join(', ')}`,
      };
    }
    return usersService.updateUser(id, { status });
  });

  fastify.patch('/admin/:id/password', async (request, reply) => {
    assertAdmin(request);
    const id = parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) {
      reply.status(400);
      return { statusCode: 400, message: 'Invalid user id' };
    }
    const { password } = request.body || {};
    await authService.adminSetPassword(id, password);
    return { message: 'Password updated' };
  });
}
