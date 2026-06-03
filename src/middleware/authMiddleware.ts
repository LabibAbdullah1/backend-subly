import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: bigint;
    name: string;
    email: string;
    role: 'Admin' | 'Client';
  };
}

export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Akses ditolak. Token autentikasi tidak ditemukan.'
    });
  }

  const token = authHeader.split(' ')[1];
  const { decoded, error } = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Token tidak valid atau telah kedaluwarsa.',
      debugError: error
    });
  }

  try {
    // Cari user di database berdasarkan ID dari token
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) }
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({
        status: 'error',
        message: 'Pengguna tidak ditemukan atau akun telah dinonaktifkan.'
      });
    }

    // Pasang informasi user ke Request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'Admin' | 'Client'
    };

    // Update timestamp keaktifan user (last_seen_at) secara asinkron
    prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() }
    }).catch(err => console.error('Gagal memperbarui lastSeenAt:', err));

    next();
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memverifikasi autentikasi.',
      error: error.message
    });
  }
}

export function requireRole(allowedRoles: ('Admin' | 'Client')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Pengguna belum terautentikasi.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak. Anda tidak memiliki hak akses untuk halaman ini.'
      });
    }

    next();
  };
}
