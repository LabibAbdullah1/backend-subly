import { z } from 'zod';

export const CreatePlanSchema = z.object({
  name: z.string().min(1, 'Nama paket wajib diisi').max(255),
  type: z.string().min(1, 'Tipe paket wajib diisi').default('PHP'),
  isActive: z.boolean().default(false),
  price: z.number().int().nonnegative('Harga harus bernilai positif'),
  durationMonths: z.number().int().positive('Durasi minimal 1 bulan'),
  maxStorageMb: z.number().int().positive('Kuota penyimpanan minimal 1 MB'),
  maxDatabases: z.number().int().nonnegative('Jumlah database tidak boleh negatif'),
  description: z.string().optional()
});

export const CreateVoucherSchema = z.object({
  code: z.string().min(1, 'Kode voucher wajib diisi').toUpperCase(),
  type: z.enum(['fixed', 'percent']),
  rewardAmount: z.number().positive('Diskon harus bernilai positif'),
  usageLimit: z.number().int().positive('Limit penggunaan minimal 1').optional(),
  expiresAt: z.string().datetime('Format tanggal kedaluwarsa tidak valid').optional()
});

export const VerifyVoucherSchema = z.object({
  code: z.string().min(1, 'Kode voucher wajib diisi').toUpperCase()
});

export const CheckoutSchema = z.object({
  planId: z.union([z.number().int(), z.string()]),
  voucherCode: z.string().optional(),
  subdomainId: z.union([z.number().int(), z.string()]).optional(),
  isDiskUpgrade: z.boolean().optional(),
  diskUpgradeSizeMb: z.union([z.number().int(), z.string()]).optional()
});
