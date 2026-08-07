import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { uploadService } from './upload.service.js';

export const uploadController = {
  upload: asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Please provide a file in the form field "file"',
      });
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Only image files are allowed',
      });
    }

    const fileObj = {
      buffer: file.buffer,
      mimetype: file.mimetype,
      filename: file.originalname,
      originalname: file.originalname,
      size: file.size,
    };

    const uploadResult = await uploadService.uploadImage(fileObj);
    res.status(201).json({
      url: uploadResult.url,
      publicId: uploadResult.key,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  }),
};
