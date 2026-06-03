import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const lastSentEmailPath = path.join(process.cwd(), 'uploads/last_sent_email.json');

function readLastSentEmail() {
  if (!fs.existsSync(lastSentEmailPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(lastSentEmailPath, 'utf8'));
  } catch (err) {
    return null;
  }
}

async function waitForEmail(targetEmail, maxWaitMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const data = readLastSentEmail();
    if (data && data.to === targetEmail) {
      try {
        fs.unlinkSync(lastSentEmailPath);
      } catch (e) {}
      return data;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

async function runEmailAuthTests() {
  console.log('=== MEMULAI PENGUJIAN API VERIFIKASI EMAIL & RESET PASSWORD ===\n');

  const testEmail = `client_auth_${Date.now()}@subly.my.id`;
  const testPassword = 'password123';
  const newPassword = 'newsecurepass123';

  try {
    // 1. Pembersihan data tester lama jika ada
    await prisma.chat.deleteMany({
      where: {
        user: { email: { contains: 'client_auth_' } }
      }
    });

    await prisma.report.deleteMany({
      where: {
        user: { email: { contains: 'client_auth_' } }
      }
    });

    await prisma.subdomain.deleteMany({
      where: {
        user: { email: { contains: 'client_auth_' } }
      }
    });

    await prisma.passwordResetToken.deleteMany({
      where: { email: testEmail }
    });

    await prisma.user.deleteMany({
      where: {
        email: { contains: 'client_auth_' }
      }
    });

    // 2. UJI 1: Registrasi Akun Klien Baru
    console.log('--- UJI 1: Registrasi Akun (Aktivasi Email Tertunda) ---');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Client Email Auth Tester',
        email: testEmail,
        password: testPassword,
        password_confirmation: testPassword
      })
    });
    const registerData = await registerRes.json();
    console.log('Register Response Status (Harus 201):', registerRes.status, registerData.message);
    
    if (registerRes.status !== 201) {
      throw new Error('Gagal melakukan registrasi user baru.');
    }

    // Periksa apakah mock email terkirim dan menangkap token verifikasi
    const emailData = await waitForEmail(testEmail);
    if (!emailData) {
      throw new Error('Mock email aktivasi tidak terdeteksi terkirim.');
    }
    const verificationToken = emailData.token;
    console.log('✔ Uji 1 Berhasil: Registrasi sukses, email mock verifikasi terkirim dengan token.');

    // 3. UJI 2: Login Akun Unverified (Harus Ditolak 403)
    console.log('\n--- UJI 2: Login Akun Belum Terverifikasi (Harus Ditolak 403) ---');
    const loginRes1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const loginData1 = await loginRes1.json();
    console.log('Login Response Status (Harus 403):', loginRes1.status, loginData1);
    
    if (loginRes1.status !== 403 || loginData1.status !== 'unverified') {
      throw new Error('Login tidak dibatasi padahal email belum diverifikasi!');
    }
    console.log('✔ Uji 2 Berhasil: Login diblokir karena email belum diaktifkan.');

    // 4. UJI 3: Aktivasi / Verifikasi Email Klien
    console.log('\n--- UJI 3: Aktivasi Email via Tautan token ---');
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${verificationToken}`);
    const verifyData = await verifyRes.json();
    console.log('Verify Email Response Status (Harus 200):', verifyRes.status, verifyData.message);

    if (verifyRes.status !== 200) {
      throw new Error('Gagal memverifikasi token email.');
    }

    // 5. UJI 4: Login Akun Setelah Terverifikasi (Harus Sukses 200)
    console.log('\n--- UJI 4: Login Akun Terverifikasi ---');
    const loginRes2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const loginData2 = await loginRes2.json();
    console.log('Login Response Status (Harus 200):', loginRes2.status);
    if (loginRes2.status !== 200 || !loginData2.token) {
      throw new Error('Gagal login setelah email terverifikasi.');
    }
    console.log('✔ Uji 4 Berhasil: Berhasil login ke sistem setelah email aktif.');

    // 6. UJI 5: Request Lupa Password (Forgot Password)
    console.log('\n--- UJI 5: Permintaan Lupa Password (Forgot Password) ---');
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail
      })
    });
    const forgotData = await forgotRes.json();
    console.log('Forgot Password Response Status (Harus 200):', forgotRes.status, forgotData.message);

    if (forgotRes.status !== 200) {
      throw new Error('Gagal meminta tautan reset password.');
    }

    // Dapatkan token reset kata sandi dari mock email terkirim
    const emailDataReset = await waitForEmail(testEmail);
    if (!emailDataReset) {
      throw new Error('Mock email reset password tidak terdeteksi terkirim.');
    }
    const resetToken = emailDataReset.token;
    console.log('✔ Uji 5 Berhasil: Email instruksi reset password terkirim dengan token.');

    // 7. UJI 6: Reset Password (Ganti Kata Sandi)
    console.log('\n--- UJI 6: Reset Password Baru ---');
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        token: resetToken,
        password: newPassword,
        password_confirmation: newPassword
      })
    });
    const resetData = await resetRes.json();
    console.log('Reset Password Response Status (Harus 200):', resetRes.status, resetData.message);

    if (resetRes.status !== 200) {
      throw new Error('Gagal mereset kata sandi.');
    }

    // Pastikan token reset terhapus dari database
    const tokenDbRecord = await prisma.passwordResetToken.findUnique({
      where: { email: testEmail }
    });
    console.log('Apakah token reset sudah dihapus dari DB?', tokenDbRecord === null);
    if (tokenDbRecord !== null) {
      throw new Error('Token reset password masih tersimpan di DB setelah berhasil digunakan.');
    }

    // 8. UJI 7: Login dengan Password Lama & Baru
    console.log('\n--- UJI 7: Verifikasi Login dengan Password Lama & Baru ---');
    
    // Login dengan password lama (harus ditolak)
    const loginOldRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    console.log('Login Password Lama Status (Harus 422):', loginOldRes.status);
    if (loginOldRes.status !== 422) {
      throw new Error('Masih bisa login menggunakan kata sandi lama!');
    }

    // Login dengan password baru (harus berhasil)
    const loginNewRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword
      })
    });
    const loginNewData = await loginNewRes.json();
    console.log('Login Password Baru Status (Harus 200):', loginNewRes.status);
    if (loginNewRes.status !== 200 || !loginNewData.token) {
      throw new Error('Gagal login menggunakan kata sandi baru.');
    }
    console.log('✔ Uji 7 Berhasil: Kata sandi baru terverifikasi aktif.');

    console.log('\n=== SELURUH PENGUJIAN SPRINT 7 SELESAI (100% SUKSES) ===');

  } catch (err) {
    console.error('✖ Terjadi kesalahan saat pengujian:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runEmailAuthTests();
