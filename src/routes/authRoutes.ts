import { Router } from 'express';
import { login, register, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
