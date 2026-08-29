import { Router } from 'express';
import * as controller from '../controllers/message.controller';

const router = Router();

// Task 2.2 -- schedule a message for a given day + time
router.post('/messages', controller.create);
router.get('/messages', controller.list);
router.get('/messages/:id', controller.getOne);

export default router;
