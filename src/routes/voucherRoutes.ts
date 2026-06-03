import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  verifyVoucher,
  getAllVouchers,
  createVoucher,
  deleteVoucher
} from '../controllers/voucherController.js';

const router = Router();

router.post('/vouchers/verify', authenticateJWT, verifyVoucher); // Verify code before checkout
router.get('/vouchers', authenticateJWT, requireRole(['Admin']), getAllVouchers);
router.post('/vouchers', authenticateJWT, requireRole(['Admin']), createVoucher);
router.delete('/vouchers/:id', authenticateJWT, requireRole(['Admin']), deleteVoucher);

export default router;
