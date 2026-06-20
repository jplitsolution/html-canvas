/**
 * uploadRoutes.js  —  Standalone Express.js equivalent of NestJS UploadController
 *
 * This file is the pure Express/MERN implementation of the image-upload route.
 * It mirrors POST /api/uploads in the NestJS backend exactly:
 *   - Multer memory storage  →  NestJS FileInterceptor('file') with memoryStorage
 *   - Form field name: "file"  (must match FileInterceptor and frontend FormData)
 *   - Cloudinary streaming via upload_stream
 *   - Structured { success, url, publicId } JSON response
 *
 * ─── Integration options ─────────────────────────────────────────────────────
 * A) Mount this file in a plain Express app:
 *      app.use('/api/upload', require('./uploadRoutes'))
 *
 * B) The NestJS project already has an equivalent endpoint at POST /api/uploads
 *    (see upload.controller.ts).  Use that in production; this file serves as
 *    standalone reference / testing outside of the NestJS IoC container.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express   = require('express');
const multer    = require('multer');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Cloudinary is configured from environment variables.
// In the NestJS project these are injected via ConfigService / CloudinaryProvider.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Multer: in-memory storage so the buffer can be piped straight to Cloudinary.
 * Field name "file" must match:
 *   - NestJS: FileInterceptor('file')
 *   - Frontend: formData.append('file', selectedFile)
 */
const storage = multer.memoryStorage();

/** Image-only MIME filter */
const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are accepted.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

/**
 * POST /image
 * (When mounted: POST /api/upload/image)
 *
 * Accepts: multipart/form-data  →  field name: "file"
 * Returns: { success, url, publicId }
 */
router.post('/image', (req, res) => {
  // Run Multer first to parse the multipart body and catch its own errors.
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle Multer specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File is too large. Maximum size allowed is 5MB.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Multer upload error: ${err.message}`,
      });
    } else if (err) {
      // Handle file filter error or other custom errors
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    // Verify a file was actually provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image file in the form-data parameter named "image".',
      });
    }

    try {
      /**
       * Stream the file buffer directly to Cloudinary.
       * This uses Cloudinary's upload_stream API which accepts configuration options
       * and a callback function.
       */
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'templatecraft_uploads', // Root folder inside Cloudinary
          resource_type: 'image', // Ensures resource is categorized correctly
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary API upload error:', error);
            return res.status(502).json({
              success: false,
              error: 'Failed to upload image to Cloudinary storage service.',
              details: error.message || error,
            });
          }

          if (!result) {
            return res.status(500).json({
              success: false,
              error: 'Cloudinary returned an empty response.',
            });
          }

          return res.status(200).json({
            success:  true,
            url:      result.secure_url, // matches NestJS upload.controller.ts field name
            publicId: result.public_id,
          });
        }
      );

      // Convert buffer to read stream and pipe to Cloudinary upload stream
      Readable.from(req.file.buffer).pipe(uploadStream);

    } catch (uploadError) {
      console.error('Buffer streaming error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Internal server error occurred while preparing the upload stream.',
      });
    }
  });
});

module.exports = router;
