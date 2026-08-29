import { Router } from 'express';
import * as controller from '../controllers/message.controller';
import { validate } from '../lib/validate';
import { asyncHandler } from '../lib/async-handler';
import { createBody, listQuery, idParam } from '../validators/message.schema';

const router = Router();

// Task 2.2 -- schedule a message for a given day + time
router.post('/messages', validate({ body: createBody }), asyncHandler(controller.create));
router.get('/messages', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/messages/:id', validate({ params: idParam }), asyncHandler(controller.getOne));

export default router;
