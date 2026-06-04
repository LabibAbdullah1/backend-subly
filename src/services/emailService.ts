import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const host = process.env.SMTP_HOST || 'mail.subly.my.id';
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const from = process.env.SMTP_FROM || 'Subly Managed Hosting <no-reply@subly.my.id>';

// Jalankan email dalam mode simulasi jika kredensial masih default/kosong
const isMock = !user || user === 'username' || pass === 'your_password_here' || pass === 'password';

const transporter = isMock 
  ? null 
  : nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // SSL jika port 465, TLS jika lainnya (e.g. 587)
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

// Simpan isi email terkirim terakhir khusus untuk pengujian otomatis
export let lastSentEmail: { to: string; subject: string; html: string; token: string } | null = null;

async function sendMail(to: string, subject: string, html: string, token: string): Promise<void> {
  lastSentEmail = { to, subject, html, token };

  // Write to a temporary file for cross-process access during tests
  try {
    const tempDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(tempDir, 'last_sent_email.json'),
      JSON.stringify(lastSentEmail, null, 2),
      'utf8'
    );
  } catch (err: any) {
    console.error('Gagal menulis last_sent_email.json:', err.message);
  }

  if (isMock) {
    console.log(`\n======================================================`);
    console.log(`[SMTP MOCK EMAIL] Sending Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Token: ${token}`);
    console.log(`======================================================\n`);
    return;
  }

  try {
    await transporter!.sendMail({
      from,
      to,
      subject,
      html
    });
    console.log(`✔ Email successfully sent to ${to}`);
  } catch (error: any) {
    console.error(`✖ Gagal mengirim email ke ${to}:`, error.message);
    console.log(`\n======================================================`);
    console.log(`[SMTP FALLBACK] Gagal mengirim email asli. Menggunakan mode simulasi.`);
    console.log(`Sending Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Token: ${token}`);
    console.log(`======================================================\n`);
  }
}

// Template Email HTML Premium
const emailWrapper = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Outfit', 'Inter', Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      width: 100% !important;
    }
    .wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%);
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
      font-size: 16px;
      color: #4b5563;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 14px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .footer {
      background-color: #f9fafb;
      padding: 25px;
      text-align: center;
      font-size: 13px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
    }
    .link-alt {
      word-break: break-all;
      color: #4f46e5;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        Ditenagai oleh <b>Subly Managed Hosting</b><br>
        Ini adalah email otomatis, mohon tidak membalas email ini.
      </div>
    </div>
  </div>
</body>
</html>
`;

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const activationUrl = `${frontendUrl}/verify-email?token=${token}`;

  const body = `
    <p>Halo <b>${name}</b>,</p>
    <p>Terima kasih telah mendaftar di <b>Subly Managed Hosting</b>. Untuk menjaga keamanan dan akuntabilitas kepemilikan akun Anda, silakan aktifkan akun Anda dengan menekan tombol di bawah ini:</p>
    
    <div class="btn-container">
      <a href="${activationUrl}" class="btn" target="_blank">Aktivasi Akun</a>
    </div>

    <p>Jika tombol di atas tidak berfungsi, silakan salin dan tempel tautan berikut ke browser Anda:</p>
    <p class="link-alt">${activationUrl}</p>
    
    <p>Tautan aktivasi ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar di platform kami, abaikan email ini.</p>
  `;

  await sendMail(to, 'Aktivasi Akun Anda - Subly Managed Hosting', emailWrapper('Verifikasi Akun Anda', body), token);
}

export async function sendResetPasswordEmail(to: string, name: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

  const body = `
    <p>Halo <b>${name}</b>,</p>
    <p>Kami menerima permintaan untuk mereset kata sandi akun Anda di <b>Subly Managed Hosting</b>. Silakan klik tombol di bawah ini untuk mengganti password Anda:</p>
    
    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>

    <p>Jika tombol di atas tidak berfungsi, silakan salin dan tempel tautan berikut ke browser Anda:</p>
    <p class="link-alt">${resetUrl}</p>
    
    <p>Tautan reset password ini hanya berlaku selama 1 jam demi alasan keamanan.</p>
    <p>Jika Anda tidak meminta untuk mengganti kata sandi Anda, abaikan email ini dan password Anda akan tetap aman.</p>
  `;

  await sendMail(to, 'Reset Kata Sandi Akun - Subly Managed Hosting', emailWrapper('Reset Password Akun', body), token);
}

export async function sendPaymentProofNotificationEmail(
  to: string, 
  clientName: string, 
  transactionId: string, 
  planName: string, 
  amount: number, 
  paymentId: string | number,
  token: string
): Promise<void> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const verifyUrl = `${backendUrl}/api/payments/${paymentId}/verify-via-email?token=${token}`;

  const body = `
    <p>Halo Admin,</p>
    <p>Seorang klien telah mengunggah bukti pembayaran untuk tagihan hosting baru di <b>Subly Managed Hosting</b>.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px 0; font-weight: bold; color: #9ca3af; width: 140px;">Klien:</td>
        <td style="padding: 10px 0; color: #1f2937;">${clientName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px 0; font-weight: bold; color: #9ca3af;">Invoice ID:</td>
        <td style="padding: 10px 0; font-family: monospace; color: #1f2937;">${transactionId}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px 0; font-weight: bold; color: #9ca3af;">Paket Hosting:</td>
        <td style="padding: 10px 0; color: #1f2937;">${planName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px 0; font-weight: bold; color: #9ca3af;">Total Nominal:</td>
        <td style="padding: 10px 0; font-weight: bold; color: #4f46e5;">Rp ${amount.toLocaleString('id-ID')}</td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="${verifyUrl}" class="btn" target="_blank" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">Verifikasi & Setujui Pembayaran</a>
    </div>

    <p>Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan menempel tautan verifikasi langsung berikut:</p>
    <p class="link-alt">${verifyUrl}</p>
  `;

  await sendMail(to, 'Notifikasi Bukti Pembayaran Klien Baru - Subly', emailWrapper('Verifikasi Pembayaran Masuk', body), token);
}
