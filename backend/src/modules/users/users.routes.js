import { usersService } from './users.service.js';

export async function usersRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/profile', async (request, reply) => {
    const user = await usersService.findById(request.user.id);
    if (!user) {
      reply.status(404);
      return { statusCode: 404, message: 'User not found' };
    }
    delete user.password;
    return user;
  });
}
