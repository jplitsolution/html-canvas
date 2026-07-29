import { campaignsService } from './campaigns.service.js';

export async function campaignsRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    return campaignsService.findAll(request.user.id);
  });

  fastify.post('/', async (request, reply) => {
    reply.status(201);
    return campaignsService.create(request.body || {}, request.user.id);
  });

  fastify.get('/:id', async (request, reply) => {
    const id = request.params.id;
    const campaign = await campaignsService.findOne(id, request.user.id);
    const { flowConfig, verificationMode } = await campaignsService.getFlow(
      id,
      request.user.id,
    );
    return {
      ...campaign,
      flowConfig: JSON.stringify(flowConfig),
      verificationMode,
    };
  });

  fastify.patch('/:id', async (request, reply) => {
    return campaignsService.update(request.params.id, request.body || {}, request.user.id);
  });

  fastify.delete('/:id', async (request, reply) => {
    await campaignsService.remove(request.params.id, request.user.id);
    return { message: 'Campaign deleted successfully' };
  });

  fastify.post('/:id/apply-defaults', async (request, reply) => {
    return campaignsService.applyDefaultTemplates(request.params.id, request.user.id, false);
  });

  fastify.get('/:id/pages/:pageType', async (request, reply) => {
    return campaignsService.getPage(request.params.id, request.params.pageType, request.user.id);
  });

  fastify.patch('/:id/pages/:pageType', async (request, reply) => {
    return campaignsService.updatePageContent(
      request.params.id,
      request.params.pageType,
      request.body || {},
      request.user.id,
    );
  });

  fastify.get('/:id/flow', async (request, reply) => {
    return campaignsService.getFlow(request.params.id, request.user.id);
  });

  fastify.put('/:id/flow', async (request, reply) => {
    return campaignsService.updateFlow(request.params.id, request.body || {}, request.user.id);
  });

  fastify.get('/:id/api-config', async (request, reply) => {
    const config = await campaignsService.getApiConfig(request.params.id, request.user.id);
    return config || {};
  });

  fastify.patch('/:id/api-config', async (request, reply) => {
    return campaignsService.upsertApiConfig(
      request.params.id,
      request.body || {},
      request.user.id,
    );
  });
}
