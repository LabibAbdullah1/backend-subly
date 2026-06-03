import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { listFiles, deleteFile } from '../controllers/fileManagerController.js';

const router = Router();

router.get('/subdomains/:id/file-manager', authenticateJWT, listFiles);
router.delete('/subdomains/:id/file-manager', authenticateJWT, deleteFile);

export default router;
