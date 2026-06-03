import { Router } from 'express';
import { login, register, verifyEmail, forgotPassword, resetPassword, getMe, getAllUsers } from '../controllers/authController.js';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateJWT, getMe);
router.get('/users', authenticateJWT, requireRole(['Admin']), getAllUsers);

export default router;
