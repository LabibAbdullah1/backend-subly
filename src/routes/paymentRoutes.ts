import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { uploadProof } from '../utils/upload.js';
import {
  checkout,
  uploadProofFile,
  confirmPayment,
  getPayments,
  verifyViaEmail,
  cancelPayment
} from '../controllers/paymentController.js';

const router = Router();

router.get('/payments', authenticateJWT, getPayments);
router.get('/payments/:id/verify-via-email', verifyViaEmail);
router.post('/payments/checkout', authenticateJWT, checkout);
router.post('/payments/:id/cancel', authenticateJWT, cancelPayment);
router.post(
  '/payments/:id/proof',
  authenticateJWT,
  uploadProof.single('proof'),
  uploadProofFile
);
router.post('/payments/:id/confirm', authenticateJWT, requireRole(['Admin']), confirmPayment);

export default router;
