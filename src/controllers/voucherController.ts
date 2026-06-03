import { Request, Response } from 'express';
import prisma from '../config/db.js';
import { serializeBigInt } from '../utils/serialize.js';
import { CreateVoucherSchema, VerifyVoucherSchema } from '../validator/billing.js';

// Verify Voucher Code (Public/Client)
export async function verifyVoucher(req: Request, res: Response) {
  const validation = VerifyVoucherSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { code } = validation.data;

  try {
    const voucher = await prisma.voucher.findUnique({
      where: { code }
    });

    if (!voucher) {
      return res.status(404).json({
        status: 'error',
        message: 'Kode voucher tidak valid.'
      });
    }

    // Periksa apakah voucher kedaluwarsa
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return res.status(422).json({
        status: 'error',
        message: 'Kode voucher sudah kedaluwarsa.'
      });
    }

    // Periksa apakah kuota penggunaan habis
    if (voucher.usageLimit !== null) {
      // Hitung jumlah pembayaran sukses yang menggunakan voucher ini
      const usageCount = await prisma.payment.count({
        where: {
          voucherId: voucher.id,
          status: 'success'
        }
      });

      if (usageCount >= voucher.usageLimit) {
        return res.status(422).json({
          status: 'error',
          message: 'Kuota penggunaan kode voucher sudah habis.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Voucher berhasil diterapkan.',
      data: {
        id: voucher.id.toString(),
        code: voucher.code,
        type: voucher.type,
        rewardAmount: voucher.rewardAmount
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memverifikasi voucher',
      error: error.message
    });
  }
}

// Get All Vouchers (Admin only)
export async function getAllVouchers(req: Request, res: Response) {
  try {
    const vouchers = await prisma.voucher.findMany();
    return res.status(200).json(serializeBigInt(vouchers));
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data voucher',
      error: error.message
    });
  }
}

// Create Voucher (Admin only)
export async function createVoucher(req: Request, res: Response) {
  const validation = CreateVoucherSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { code, type, rewardAmount, usageLimit, expiresAt } = validation.data;

  try {
    const existing = await prisma.voucher.findUnique({
      where: { code }
    });

    if (existing) {
      return res.status(422).json({
        status: 'error',
        message: 'Voucher dengan kode tersebut sudah ada.'
      });
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        type,
        rewardAmount,
        usageLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Voucher berhasil dibuat',
      data: serializeBigInt(voucher)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat voucher',
      error: error.message
    });
  }
}
