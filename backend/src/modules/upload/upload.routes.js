import { uploadService } from './upload.service.js';

export async function uploadRoutes(fastify, options) {
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        reply.status(400);
        return { statusCode: 400, message: 'Please provide a file in the form field "file"' };
      }

      if (!data.mimetype || !data.mimetype.startsWith('image/')) {
        reply.status(400);
        return { statusCode: 400, message: 'Only image files are allowed' };
      }

      const buffer = await data.toBuffer();
      const fileObj = {
        buffer,
        mimetype: data.mimetype,
        filename: data.filename,
        originalname: data.filename,
        size: buffer.length,
      };

      const uploadResult = await uploadService.uploadImage(fileObj);
      reply.status(201);
      return {
        url: uploadResult.url,
        publicId: uploadResult.key,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      };
    },
  );
}
