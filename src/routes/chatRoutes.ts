import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { getChats, sendChat, markAsRead, deleteChat } from '../controllers/chatController.js';

const router = Router();

// Pastikan direktori uploads/chats/ ada
const chatDir = path.join(process.cwd(), 'uploads/chats');
if (!fs.existsSync(chatDir)) {
  fs.mkdirSync(chatDir, { recursive: true });
}

// Konfigurasi Storage untuk gambar chat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  }
});

// Hanya izinkan gambar JPG, JPEG, PNG, WEBP
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Hanya gambar (JPG, JPEG, PNG, WEBP) yang diperbolehkan untuk lampiran chat.'), false);
  }
};

const uploadChatImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Batasan ukuran lampiran 5MB
  }
});

router.get('/chats', authenticateJWT, getChats);
router.post('/chats', authenticateJWT, uploadChatImage.single('image'), sendChat);
router.post('/chats/read', authenticateJWT, markAsRead);
router.delete('/chats/:id', authenticateJWT, deleteChat);

export default router;
