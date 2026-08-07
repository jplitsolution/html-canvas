import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { uploadController } from './upload.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    return cb(null, true);
  },
});

const router = Router();

router.post('/', authenticate, upload.single('file'), uploadController.upload);

export default router;
