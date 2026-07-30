import { templatesService } from './templates.service.js';

export async function templatesRoutes(fastify, options) {
  fastify.get('/prebuilt', async (request, reply) => {
    return templatesService.findAllPrebuilt();
  });

  fastify.get(
    '/user',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      return templatesService.findUserTemplates(request.user.id);
    },
  );

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    let userId;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = fastify.jwt.decode(token);
        if (payload && payload.sub != null) {
          userId = Number(payload.sub);
        }
      } catch {
        // Ignore token parse error
      }
    }
    return templatesService.findOne(id, userId);
  });

  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      reply.status(201);
      return templatesService.create(request.body || {}, request.user.id);
    },
  );

  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      await templatesService.remove(id, request.user.id);
      return { message: 'Template deleted successfully' };
    },
  );
}
