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

router.get('/temp-verify-all', async (req, res) => {
  try {
    const prisma = (await import('../config/db.js')).default;
    await prisma.user.updateMany({
      data: { emailVerifiedAt: new Date() }
    });
    res.json({ success: true, message: "Semua user berhasil diverifikasi secara manual." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/temp-delete-user', async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "Email parameter required" });
    const prisma = (await import('../config/db.js')).default;
    await prisma.user.deleteMany({
      where: { email }
    });
    res.json({ success: true, message: `User dengan email ${email} berhasil dihapus dari database.` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/temp-test-smtp', async (req, res) => {
  const to = (req.query.to as string) || 'labibabdullahhasan@gmail.com';
  try {
    const nodemailer = (await import('nodemailer')).default;
    const host = process.env.SMTP_HOST || 'mail.subly.my.id';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || 'Subly Managed Hosting <no-reply@subly.my.id>';

    const testTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection first
    await testTransporter.verify();

    // Send a test email
    await testTransporter.sendMail({
      from,
      to,
      subject: 'Uji Coba SMTP - Subly Managed Hosting',
      html: '<p>Halo! Ini adalah email uji coba untuk mengetes SMTP server di project Subly.</p>'
    });

    res.json({ success: true, message: `Email uji coba berhasil dikirim ke ${to}` });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Uji SMTP gagal', 
      error: err.message, 
      code: err.code,
      stack: err.stack 
    });
  }
});

export default router;
