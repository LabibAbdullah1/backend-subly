import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { getSettings, updateSettings } from '../controllers/settingController.js';

const router = Router();

// Ensure uploads/settings directory exists
const settingsDir = path.join(process.cwd(), 'uploads/settings');
if (!fs.existsSync(settingsDir)) {
  fs.mkdirSync(settingsDir, { recursive: true });
}

// Multer storage configuration for settings assets
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, settingsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `qris_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimeType && extName) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar (jpg, jpeg, png, gif) yang diperbolehkan!'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/settings', authenticateJWT, getSettings);
router.post('/settings', authenticateJWT, requireRole(['Admin']), upload.single('qris_image'), updateSettings);

export default router;
