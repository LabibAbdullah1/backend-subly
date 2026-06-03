import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { uploadProof } from '../utils/upload.js';
import {
  checkout,
  uploadProofFile,
  confirmPayment
} from '../controllers/paymentController.js';

const router = Router();

router.post('/payments/checkout', authenticateJWT, checkout);
router.post(
  '/payments/:id/proof',
  authenticateJWT,
  uploadProof.single('proof'),
  uploadProofFile
);
router.post('/payments/:id/confirm', authenticateJWT, requireRole(['Admin']), confirmPayment);

export default router;
