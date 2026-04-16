const express = require('express');
const router = express.Router();
const PolicyController = require('../controllers/policy.controller');
const { authMiddleware, roleMiddleware } = require('../controllers/auth.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/policies';
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const finalDir = path.join(uploadDir, datePath);

    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    cb(null, finalDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}`));
    }
  }
});

router.post('/upload', authMiddleware, roleMiddleware('admin', 'operator'), upload.single('file'), PolicyController.upload);
router.put('/:id/fields', authMiddleware, roleMiddleware('admin', 'operator'), PolicyController.updateFields);
router.post('/:id/publish', authMiddleware, roleMiddleware('admin'), PolicyController.publish);
router.get('/', PolicyController.getList);
router.get('/:id', PolicyController.getById);
router.get('/:id/compare', PolicyController.compareVersions);
router.get('/:id/download', PolicyController.downloadFile);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), PolicyController.delete);

module.exports = router;
