import { partnersService } from './partners.service.js';

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

  fastify.get('/vendors/:id/affiliates', async (request, reply) => {
    return partnersService.listAffiliates(request.params.id, request.user.id);
  });

  fastify.post('/affiliates', async (request, reply) => {
    reply.status(201);
    return partnersService.createAffiliate(request.body || {}, request.user.id);
  });

  fastify.patch('/affiliates/:id', async (request, reply) => {
    return partnersService.updateAffiliate(
      request.params.id,
      request.body || {},
      request.user.id,
    );
  });

  fastify.delete('/affiliates/:id', async (request, reply) => {
    await partnersService.removeAffiliate(request.params.id, request.user.id);
    return { message: 'Affiliate deleted' };
  });
}
