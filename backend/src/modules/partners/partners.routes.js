import { partnersService } from './partners.service.js';
import { postbackService } from './postback.service.js';

export async function partnersRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/vendors', async (request, reply) => {
    return partnersService.listVendors(request.user.id);
  });

  fastify.post('/vendors', async (request, reply) => {
    reply.status(201);
    return partnersService.createVendor(request.body || {}, request.user.id);
  });

  fastify.get('/vendors/:id', async (request, reply) => {
    return partnersService.getVendor(request.params.id, request.user.id);
  });

  fastify.patch('/vendors/:id', async (request, reply) => {
    return partnersService.updateVendor(
      request.params.id,
      request.body || {},
      request.user.id,
    );
  });

  fastify.delete('/vendors/:id', async (request, reply) => {
    await partnersService.removeVendor(request.params.id, request.user.id);
    return { message: 'Vendor deleted' };
  });

  // --- Postbacks admin (user-scoped) ---
  fastify.get('/postbacks/summary', async (request) => {
    const days = request.query?.days;
    return postbackService.getSummary(request.user.id, { days });
  });

  fastify.get('/postbacks', async (request) => {
    return postbackService.listPostbacks(request.user.id, request.query || {});
  });

  fastify.get('/postbacks/:id', async (request) => {
    return postbackService.getPostbackById(
      request.params.id,
      request.user.id,
    );
  });
}
