import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import prisma from '../../config/db.js';
import { RegisterSchema, LoginSchema } from '../../validator/auth.js';
import { signToken } from '../../utils/jwt.js';

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
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'Client'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Registrasi sukses, silakan masuk ke akun Anda.'
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

    // Verify password
    const isPasswordMatch = await bcryptjs.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(422).json({
        errors: {
          email: ['Kredensial login tidak cocok dengan data kami.']
        }
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
