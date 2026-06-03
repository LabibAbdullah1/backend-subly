import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'subly_jwt_secret_super_secure_key_123';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload, options?: jwt.SignOptions): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
    ...options
  });
}

export function verifyToken(token: string): { decoded: JwtPayload | null; error: string | null } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { decoded, error: null };
  } catch (error: any) {
    return { decoded: null, error: error.message };
  }
}
