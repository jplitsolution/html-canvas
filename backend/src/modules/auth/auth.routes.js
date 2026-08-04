import { authService } from './auth.service.js';
import { usersService } from '../users/users.service.js';
import { withRole } from '../../common/admin.js';

export async function authRoutes(fastify, options) {
  fastify.post('/register', async (request, reply) => {
    const { email, password, name } = request.body || {};
    if (!email || !password || !name) {
      reply.status(400);
      return { statusCode: 400, message: 'email, password and name are required' };
    }
    const user = await authService.register({ email, password, name });
    reply.status(201);
    return user;
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body || {};
    if (!email || !password) {
      reply.status(400);
      return { statusCode: 400, message: 'email and password are required' };
    }
    const user = await authService.validateUser({ email, password });
    const token = fastify.jwt.sign({ email: user.email, sub: user.id });
    return {
      user,
      accessToken: token,
    };
  });

  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const user = await usersService.findById(request.user.id);
      if (!user) {
        reply.status(404);
        return { statusCode: 404, message: 'User not found' };
      }
      const status = user.status || 'active';
      if (status !== 'active') {
        reply.status(403);
        return {
          statusCode: 403,
          message:
            status === 'suspended'
              ? 'Your account has been suspended. Contact admin.'
              : 'Your account is inactive. Contact admin.',
        };
      }
      return withRole(user);
    },
  );

  fastify.post(
    '/change-password',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { oldPassword, newPassword } = request.body || {};
      if (!oldPassword || !newPassword) {
        reply.status(400);
        return { statusCode: 400, message: 'oldPassword and newPassword are required' };
      }
      await authService.changePassword(
        request.user.id,
        oldPassword,
        newPassword,
      );
      return { message: 'Password changed successfully' };
    },
  );
}
