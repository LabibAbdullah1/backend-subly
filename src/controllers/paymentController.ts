import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { serializeBigInt } from '../utils/serialize.js';
import { CheckoutSchema } from '../validator/billing.js';
import crypto from 'crypto';
import { sendPaymentProofNotificationEmail } from '../services/emailService.js';

// 1. Checkout (Client only)
export async function checkout(req: AuthenticatedRequest, res: Response) {
  const validation = CheckoutSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { planId, voucherCode, subdomainId } = validation.data;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    // Cari plan
    const plan = await prisma.plan.findFirst({
      where: { id: BigInt(planId), isActive: true, deletedAt: null }
    });

    if (!plan) {
      return res.status(404).json({ status: 'error', message: 'Paket hosting tidak ditemukan atau tidak aktif.' });
    }

    let finalPrice = plan.price; // BigInt
    let voucherId: bigint | null = null;

    // Jika menggunakan voucher
    if (voucherCode) {
      const voucher = await prisma.voucher.findUnique({
        where: { code: voucherCode.toUpperCase() }
      });

      if (!voucher) {
        return res.status(422).json({ status: 'error', message: 'Kode voucher tidak valid.' });
      }

      // Verifikasi kedaluwarsa voucher
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        return res.status(422).json({ status: 'error', message: 'Kode voucher sudah kedaluwarsa.' });
      }

      // Verifikasi limit penggunaan
      if (voucher.usageLimit !== null) {
        const usageCount = await prisma.payment.count({
          where: { voucherId: voucher.id, status: 'success' }
        });
        if (usageCount >= voucher.usageLimit) {
          return res.status(422).json({ status: 'error', message: 'Kuota kode voucher sudah habis.' });
        }
      }

      // Hitung diskon
      let discountAmount = BigInt(0);
      if (voucher.type === 'percent') {
        const rewardPercent = parseFloat(voucher.rewardAmount.toString());
        discountAmount = (finalPrice * BigInt(Math.round(rewardPercent))) / BigInt(100);
      } else {
        // fixed diskon
        discountAmount = BigInt(Math.round(parseFloat(voucher.rewardAmount.toString())));
      }

      finalPrice = finalPrice - discountAmount;
      if (finalPrice < BigInt(0)) {
        finalPrice = BigInt(0);
      }

      voucherId = voucher.id;
    }

    let uniqueCode: number | null = null;
    let paymentStatus: 'pending' | 'success' = 'pending';
    let transactionId = `PAY-${Date.now()}-${userId}`;

    // Cari target subdomain jika renewal
    let targetSubdomainId: bigint | null = subdomainId ? BigInt(subdomainId) : null;

    // Jika finalPrice = 0 (Gratis 100%), langsung sukses
    if (finalPrice === BigInt(0)) {
      paymentStatus = 'success';

      const payment = await prisma.payment.create({
        data: {
          userId,
          planId: plan.id,
          voucherId,
          subdomainId: targetSubdomainId,
          transactionId,
          snapToken: 'FREE_VOUCHER_SKIPPED',
          amount: BigInt(0),
          uniqueCode: null,
          status: 'success'
        }
      });

      // Jika ini adalah perpanjangan (renew) dan subdomain_id diisi, langsung update subdomain
      if (targetSubdomainId) {
        const subdomain = await prisma.subdomain.findUnique({
          where: { id: targetSubdomainId }
        });

        if (subdomain) {
          const currentExpired = subdomain.expiredAt ? new Date(subdomain.expiredAt) : new Date();
          const baseDate = currentExpired > new Date() ? currentExpired : new Date();
          const newExpired = new Date(baseDate);
          newExpired.setMonth(newExpired.getMonth() + plan.durationMonths);

          await prisma.subdomain.update({
            where: { id: subdomain.id },
            data: {
              expiredAt: newExpired,
              status: 'active'
            }
          });

          // Kirim chat notifikasi otomatis
          await prisma.chat.create({
            data: {
              userId,
              isAdmin: true,
              message: `Sistem: Pembayaran gratis untuk subdomain ${subdomain.fullDomain} berhasil diterapkan. Masa aktif diperpanjang hingga ${newExpired.toLocaleDateString('id-ID')}.`,
              isRead: false
            }
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Checkout sukses (Voucher Gratis 100%).',
        data: serializeBigInt(payment)
      });
    }

    // Jika harga > 0, generate kode unik 3 digit
    // Cari jika user tersebut memiliki cache/pending kode unik sebelumnya untuk reuse
    const existingPending = await prisma.payment.findFirst({
      where: {
        userId,
        status: 'pending',
        createdAt: {
          gte: new Date(Date.now() - 1 * 60 * 60 * 1000) // Masih berlaku dalam 1 jam
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPending && existingPending.uniqueCode) {
      uniqueCode = existingPending.uniqueCode;
    } else {
      // Generate 100 - 999
      uniqueCode = Math.floor(100 + Math.random() * 900);
    }

    const finalAmount = finalPrice + BigInt(uniqueCode);

    const payment = await prisma.payment.create({
      data: {
        userId,
        planId: plan.id,
        voucherId,
        subdomainId: targetSubdomainId,
        transactionId,
        amount: finalAmount,
        uniqueCode,
        status: 'pending'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Checkout berhasil. Silakan lakukan transfer sesuai nominal tagihan beserta kode unik.',
      data: serializeBigInt({
        ...payment,
        expiresInSeconds: 3600 // 1 Jam
      })
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal melakukan checkout pembayaran.',
      error: error.message
    });
  }
}

// 2. Upload Bukti Pembayaran (Client only)
export async function uploadProofFile(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Silakan lampirkan file gambar bukti transfer.' });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: BigInt(id), userId, deletedAt: null }
    });

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Transaksi pembayaran tidak ditemukan.' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: `Tidak dapat mengunggah bukti pembayaran untuk transaksi berstatus ${payment.status}` });
    }

    // Cek apakah invoice sudah kedaluwarsa (> 1 jam)
    const paymentTime = new Date(payment.createdAt || '').getTime();
    if (Date.now() - paymentTime > 60 * 60 * 1000) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' }
      });
      return res.status(400).json({ status: 'error', message: 'Invoice pembayaran telah kedaluwarsa (batas waktu 1 jam).' });
    }

    const proofPath = `uploads/proofs/${req.file.filename}`;

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        proofPath
      },
      include: {
        user: true,
        plan: true
      }
    });

    // Send email notification to admin
    try {
      const adminEmailSetting = await prisma.setting.findUnique({
        where: { key: 'admin_notification_email' }
      });
      
      let adminEmail = adminEmailSetting?.value;
      if (!adminEmail) {
        // Fallback: search for first admin user
        const firstAdmin = await prisma.user.findFirst({
          where: { role: 'Admin', deletedAt: null }
        });
        adminEmail = firstAdmin?.email || 'admin@subly.my.id';
      }

      const jwtSecret = process.env.JWT_SECRET || 'subly-secret';
      const token = crypto.createHmac('sha256', jwtSecret).update(updatedPayment.id.toString()).digest('hex');

      await sendPaymentProofNotificationEmail(
        adminEmail,
        updatedPayment.user.name,
        updatedPayment.transactionId || `PAY-${updatedPayment.id}`,
        updatedPayment.plan.name,
        Number(updatedPayment.amount),
        updatedPayment.id.toString(),
        token
      );
    } catch (mailErr: any) {
      console.error('Gagal mengirim email notifikasi ke admin:', mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Bukti transfer berhasil diunggah. Menunggu konfirmasi admin.',
      data: serializeBigInt(updatedPayment)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengunggah bukti transfer.',
      error: error.message
    });
  }
}

// 3. Confirm Payment (Admin only)
export async function confirmPayment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: { plan: true, subdomain: true }
    });

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Transaksi pembayaran tidak ditemukan.' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: `Transaksi sudah berstatus ${payment.status}.` });
    }

    // Cek apakah invoice kedaluwarsa (> 1 jam) sebelum dikonfirmasi
    const paymentTime = new Date(payment.createdAt || '').getTime();
    if (Date.now() - paymentTime > 60 * 60 * 1000) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' }
      });
      return res.status(400).json({ status: 'error', message: 'Invoice pembayaran telah kedaluwarsa dan otomatis digagalkan.' });
    }

    // 1. Update status pembayaran ke success
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'success' }
    });

    // 2. Jika ada subdomain yang ditautkan, perpanjang masa aktifnya
    if (payment.subdomainId && payment.subdomain) {
      const planDurationMonths = payment.plan.durationMonths;
      const currentExpired = payment.subdomain.expiredAt ? new Date(payment.subdomain.expiredAt) : new Date();

      // Jika subdomain sudah expired, perpanjangan dimulai dari waktu sekarang
      const baseDate = currentExpired > new Date() ? currentExpired : new Date();
      const newExpired = new Date(baseDate);
      newExpired.setMonth(newExpired.getMonth() + planDurationMonths);

      await prisma.subdomain.update({
        where: { id: payment.subdomainId },
        data: {
          expiredAt: newExpired,
          status: 'active'
        }
      });

      // 3. Kirim notifikasi chat ke client
      await prisma.chat.create({
        data: {
          userId: payment.userId,
          isAdmin: true,
          message: `Sistem: Pembayaran tagihan ${payment.transactionId} telah diverifikasi oleh Admin. Masa aktif subdomain ${payment.subdomain.fullDomain} berhasil diperpanjang hingga ${newExpired.toLocaleDateString('id-ID')}. Terima kasih!`,
          isRead: false
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaksi pembayaran berhasil dikonfirmasi dan disetujui.',
      data: serializeBigInt(updatedPayment)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengonfirmasi transaksi pembayaran.',
      error: error.message
    });
  }
}

export async function getPayments(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    let payments;
    if (role === 'Admin') {
      payments = await prisma.payment.findMany({
        where: { deletedAt: null },
        include: { plan: true, user: true, subdomain: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      payments = await prisma.payment.findMany({
        where: { userId: BigInt(userId), deletedAt: null },
        include: { plan: true, subdomain: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeBigInt(payments)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data transaksi.',
      error: error.message
    });
  }
}

export async function verifyViaEmail(req: any, res: Response) {
  const { id } = req.params;
  const { token } = req.query;

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: { plan: true, subdomain: true }
    });

    if (!payment) {
      return res.status(404).send('<h1>Error 404</h1><p>Transaksi pembayaran tidak ditemukan.</p>');
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'subly-secret';
    const expectedToken = crypto.createHmac('sha256', jwtSecret).update(id.toString()).digest('hex');

    if (token !== expectedToken) {
      return res.status(403).send('<h1>Akses Ditolak</h1><p>Token verifikasi email tidak valid atau sudah kedaluwarsa.</p>');
    }

    if (payment.status !== 'pending') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #4f46e5;">Transaksi Sudah Diproses</h1>
          <p>Transaksi ini sudah disetujui sebelumnya dengan status <b>${payment.status}</b>.</p>
          <a href="${frontendUrl}/dashboard" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Buka Dashboard Admin</a>
        </div>
      `);
    }

    // 1. Update status pembayaran ke success
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'success' }
    });

    // 2. Jika ada subdomain yang ditautkan, perpanjang masa aktifnya
    if (payment.subdomainId && payment.subdomain) {
      const planDurationMonths = payment.plan.durationMonths;
      const currentExpired = payment.subdomain.expiredAt ? new Date(payment.subdomain.expiredAt) : new Date();

      const baseDate = currentExpired > new Date() ? currentExpired : new Date();
      const newExpired = new Date(baseDate);
      newExpired.setMonth(newExpired.getMonth() + planDurationMonths);

      await prisma.subdomain.update({
        where: { id: payment.subdomainId },
        data: {
          expiredAt: newExpired,
          status: 'active'
        }
      });

      // 3. Kirim notifikasi chat ke client
      await prisma.chat.create({
        data: {
          userId: payment.userId,
          isAdmin: true,
          message: `Sistem: Pembayaran tagihan ${payment.transactionId} telah diverifikasi via Email oleh Admin. Masa aktif subdomain ${payment.subdomain.fullDomain} berhasil diperpanjang hingga ${newExpired.toLocaleDateString('id-ID')}. Terima kasih!`,
          isRead: false
        }
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #10b981;">Pembayaran Berhasil Diverifikasi</h1>
        <p>Transaksi <b>${payment.transactionId}</b> telah disetujui. Subdomain klien telah diaktifkan secara otomatis.</p>
        <a href="${frontendUrl}/dashboard" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Buka Dashboard Admin</a>
      </div>
    `);

  } catch (error: any) {
    return res.status(500).send(`<h1>Terjadi Kesalahan</h1><p>${error.message}</p>`);
  }
}
