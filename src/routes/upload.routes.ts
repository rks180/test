import path from 'path';
import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';

import * as controller from '../controllers/upload.controller';

const ALLOWED = ['.csv', '.xlsx', '.xlsm'];

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});

const uploadMw = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) return cb(new Error(`Only ${ALLOWED.join(', ')} files are allowed`));
    cb(null, true);
  },
});

const router = Router();

router.post('/upload', uploadMw.single('file'), controller.upload);
router.get('/upload/:jobId', controller.status);
router.get('/uploads', controller.list);

export default router;
