import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { templatesController } from './templates.controller.js';

const router = Router();

router.get('/prebuilt', templatesController.listPrebuilt);
router.get('/user', authenticate, templatesController.listUser);
router.get('/:id', templatesController.getOne);
router.post('/', authenticate, templatesController.create);
router.delete('/:id', authenticate, templatesController.remove);

export default router;
