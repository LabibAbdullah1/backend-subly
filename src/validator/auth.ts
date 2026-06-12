import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string()
    .min(1, 'Nama wajib diisi')
    .max(255, 'Nama maksimal 255 karakter'),
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .toLowerCase()
    .max(255),
  password: z.string()
    .min(8, 'Password minimal 8 karakter'),
  password_confirmation: z.string()
    .min(1, 'Konfirmasi password wajib diisi')
}).refine((data) => data.password === data.password_confirmation, {
  message: "Konfirmasi password tidak cocok",
  path: ["password_confirmation"],
});

export const LoginSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password wajib diisi'),
  remember: z.boolean().optional()
});

export const ForgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .toLowerCase()
});

export const ResetPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .toLowerCase(),
  token: z.string()
    .min(1, 'Token reset password wajib diisi'),
  password: z.string()
    .min(8, 'Password minimal 8 karakter'),
  password_confirmation: z.string()
    .min(1, 'Konfirmasi password wajib diisi')
}).refine((data) => data.password === data.password_confirmation, {
  message: "Konfirmasi password tidak cocok",
  path: ["password_confirmation"],
});

export const UpdateUserSchema = z.object({
  name: z.string()
    .min(1, 'Nama wajib diisi')
    .max(255, 'Nama maksimal 255 karakter'),
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .toLowerCase()
    .max(255),
  role: z.enum(['Admin', 'Client']),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .optional()
    .or(z.literal(''))
});

