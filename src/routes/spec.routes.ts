import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import * as policyController from '../controllers/policy.controller';
import * as messageController from '../controllers/message.controller';
import { uploadFile, handleUploadErrors } from '../lib/file-upload';
import { validate } from '../lib/validate';
import { asyncHandler } from '../lib/async-handler';
import { searchQuery, aggregateQuery } from '../validators/policy.schema';
import { createBody } from '../validators/message.schema';

// The assessment brief names four exact URLs. The project's own API lives under /api/*;
// these root-level routes point the brief's URLs at the same controllers.
const router = Router();

router.post('/upload', uploadFile, handleUploadErrors, uploadController.upload); // Task 1.1
router.get('/search', validate({ query: searchQuery }), asyncHandler(policyController.search)); // Task 1.2
router.get('/aggregate', validate({ query: aggregateQuery }), asyncHandler(policyController.aggregateByUser)); // Task 1.3
router.post('/scheduleMessage', validate({ body: createBody }), asyncHandler(messageController.create)); // Task 2.2

export default router;
