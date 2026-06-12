import bcryptjs from 'bcryptjs';
import { Request, Response } from 'express';
import prisma from '../config/db.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../validator/auth.js';
import { sendVerificationEmail, sendResetPasswordEmail } from '../services/emailService.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { serializeBigInt } from '../utils/serialize.js';

export async function register(req: Request, res: Response) {
  // Validate request body
  const validation = RegisterSchema.safeParse(req.body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.errors.forEach((err: any) => {
      const field = err.path[0] as string;
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(err.message);
    });
    return res.status(422).json({ errors });
  }

  const { name, email, password } = validation.data;

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(422).json({
        errors: {
          email: ['Email sudah terdaftar.']
        }
      });
    }

    // Hash password (compatibel dengan Laravel bcrypt)
    const salt = await bcryptjs.genSalt(12);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user (default role is Client)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'Client'
      }
    });

    // Generate verification token (24 hours expiry)
    const verificationToken = signToken({
      userId: user.id.toString(),
      role: user.role
    }, { expiresIn: '24h' });

    // Send email verification link
    await sendVerificationEmail(user.email, user.name, verificationToken);

    return res.status(201).json({
      success: true,
      message: 'Registrasi sukses, silakan verifikasi email Anda sebelum masuk.'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat registrasi.',
      error: error.message
    });
  }
}

export async function login(req: Request, res: Response) {
  // Validate request body
  const validation = LoginSchema.safeParse(req.body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.errors.forEach((err: any) => {
      const field = err.path[0] as string;
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(err.message);
    });
    return res.status(422).json({ errors });
  }

  const { email, password } = validation.data;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.deletedAt) {
      return res.status(422).json({
        errors: {
          email: ['Kredensial login tidak cocok dengan data kami.']
        }
      });
    }

    // Verify password (support legacy Laravel Blowfish bcrypt hashes by converting prefix $2y$ to $2a$)
    const dbPassword = user.password.replace(/^\$2y\$/, '$2a$');
    const isPasswordMatch = await bcryptjs.compare(password, dbPassword);
    if (!isPasswordMatch) {
      return res.status(422).json({
        errors: {
          email: ['Kredensial login tidak cocok dengan data kami.']
        }
      });
    }

    // Restrict Client login if email is not verified
    if (user.role === 'Client' && !user.emailVerifiedAt) {
      return res.status(403).json({
        status: 'unverified',
        message: 'Silakan verifikasi email Anda terlebih dahulu.'
      });
    }

    // Update lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() }
    });

    // Generate JWT token
    const token = signToken({
      userId: user.id.toString(),
      role: user.role
    });

    return res.status(200).json({
      token,
      role: user.role
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat login.',
      error: error.message
    });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const token = req.query.token as string;
  if (!token) {
    return res.status(422).json({ status: 'error', message: 'Token verifikasi wajib disertakan.' });
  }

  const { decoded, error } = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return res.status(400).json({
      status: 'error',
      message: 'Token verifikasi tidak valid atau telah kedaluwarsa.',
      debugError: error
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) }
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan.' });
    }

    if (user.emailVerifiedAt) {
      return res.status(200).json({
        success: true,
        message: 'Email Anda sudah terverifikasi sebelumnya.'
      });
    }

    // Update emailVerifiedAt
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() }
    });

    return res.status(200).json({
      success: true,
      message: 'Email Anda berhasil diverifikasi. Silakan masuk.'
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memverifikasi email.',
      error: err.message
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const validation = ForgotPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { email } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Jika user tidak ditemukan, return sukses semu untuk mencegah email harvesting/enumeration
    if (!user || user.deletedAt) {
      return res.status(200).json({
        success: true,
        message: 'Jika email terdaftar di sistem kami, instruksi reset kata sandi telah dikirim.'
      });
    }

    // Generate random reset token (64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Upsert token di tabel password_reset_tokens
    await prisma.passwordResetToken.upsert({
      where: { email },
      update: { token: resetToken, createdAt: new Date() },
      create: { email, token: resetToken }
    });

    // Send reset email via SMTP
    await sendResetPasswordEmail(user.email, user.name, resetToken);

    return res.status(200).json({
      success: true,
      message: 'Jika email terdaftar di sistem kami, instruksi reset kata sandi telah dikirim.'
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat meminta reset password.',
      error: err.message
    });
  }
}

export async function validateResetToken(req: Request, res: Response) {
  const token = req.query.token as string;
  const email = req.query.email as string;

  if (!token || !email) {
    return res.status(422).json({
      success: false,
      message: 'Token dan email wajib disertakan.'
    });
  }

  try {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { email }
    });

    if (!tokenRecord || tokenRecord.token !== token) {
      return res.status(422).json({
        success: false,
        message: 'Tautan reset kata sandi tidak valid atau tidak cocok.'
      });
    }

    const tokenTime = tokenRecord.createdAt ? new Date(tokenRecord.createdAt).getTime() : 0;
    const nowTime = Date.now();
    if (nowTime - tokenTime > 60 * 60 * 1000) {
      return res.status(422).json({
        success: false,
        message: 'Tautan reset kata sandi telah kedaluwarsa (berlaku maksimal 1 jam).'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token valid.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses verifikasi token.',
      error: err.message
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const validation = ResetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { email, token, password } = validation.data;

  try {
    // 1. Verifikasi kecocokan token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { email }
    });

    if (!tokenRecord || tokenRecord.token !== token) {
      return res.status(422).json({
        errors: {
          token: ['Token reset kata sandi tidak cocok atau tidak valid untuk email ini.']
        }
      });
    }

    // 2. Verifikasi kadaluwarsa token (1 jam)
    const tokenTime = tokenRecord.createdAt ? new Date(tokenRecord.createdAt).getTime() : 0;
    const nowTime = Date.now();
    if (nowTime - tokenTime > 60 * 60 * 1000) {
      return res.status(422).json({
        errors: {
          token: ['Token reset kata sandi telah kedaluwarsa.']
        }
      });
    }

    // 3. Hash password baru & Update di database
    const salt = await bcryptjs.genSalt(12);
    const hashedPassword = await bcryptjs.hash(password, salt);

    await prisma.$transaction(async (tx) => {
      // Perbarui password user (dan tandai terverifikasi jika sebelumnya belum)
      await tx.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          emailVerifiedAt: new Date() // Reset password membuktikan kepemilikan email
        }
      });

      // Hapus token reset dari database
      await tx.passwordResetToken.delete({
        where: { email }
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Kata sandi Anda berhasil diperbarui.'
    });

  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memproses reset password.',
      error: err.message
    });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan.' });
    }

    return res.status(200).json({
      success: true,
      data: serializeBigInt(user)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data profile.',
      error: error.message
    });
  }
}

export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
        subdomains: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: serializeBigInt(users)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil daftar user.',
      error: error.message
    });
  }
}

