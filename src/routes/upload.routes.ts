import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';

import * as controller from '../controllers/upload.controller';
import { BadRequestError } from '../lib/http-error';

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

// Turn multer/file-filter errors into a 400 instead of a 500.
function handleUploadErrors(err: unknown, _req: Request, _res: Response, next: NextFunction): void {
  if (err instanceof MulterError || (err instanceof Error && !('status' in err))) {
    next(new BadRequestError(err.message));
    return;
  }
  next(err);
}

const router = Router();

router.post('/upload', uploadMw.single('file'), handleUploadErrors, controller.upload);
router.get('/upload/:jobId', controller.status);
router.get('/uploads', controller.list);

export default router;
