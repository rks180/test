import { Router } from 'express';
import * as controller from '../controllers/upload.controller';
import { uploadFile, handleUploadErrors } from '../lib/file-upload';

const router = Router();

router.post('/upload', uploadFile, handleUploadErrors, controller.upload);
router.get('/upload/:jobId', controller.status);
router.get('/uploads', controller.list);

export default router;
