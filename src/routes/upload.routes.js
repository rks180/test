'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');

const controller = require('../controllers/upload.controller');

const ALLOWED = ['.csv', '.xlsx', '.xlsm'];

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});

const uploadMw = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) return cb(new Error(`Only ${ALLOWED.join(', ')} files are allowed`));
    cb(null, true);
  },
});

const router = express.Router();

router.post('/upload', uploadMw.single('file'), controller.upload);
router.get('/upload/:jobId', controller.status);
router.get('/uploads', controller.list);

module.exports = router;
