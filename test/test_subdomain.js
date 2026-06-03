import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

async function runSubdomainTests() {
  console.log('=== MEMULAI PENGUJIAN API SUBDOMAIN PROVISIONING ===\n');

  try {
    // 1. Pembersihan data tester sebelumnya
    await prisma.payment.deleteMany({
      where: {
        OR: [
          { transactionId: { startsWith: 'PAY-SUB-' } }
        ]
      }
    });

    await prisma.subdomain.deleteMany({
      where: { name: 'mysubtest' }
    });

    await prisma.plan.deleteMany({
      where: { name: 'Starter PHP Subtest' }
    });

    // 2. Buat user client tester
    const clientEmail = `client_sub_${Date.now()}@subly.my.id`;
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);
    const clientUser = await prisma.user.create({
      data: {
        name: 'Client Subdomain Tester',
        email: clientEmail,
        password: passwordHash,
        role: 'Client'
      }
    });
    console.log('✔ Client User created:', clientEmail);

    // 3. Buat plan & transaksi pembayaran sukses (sebagai slot kosong)
    const plan = await prisma.plan.create({
      data: {
        name: 'Starter PHP Subtest',
        type: 'PHP',
        price: BigInt(15000),
        durationMonths: 3,
        maxStorageMb: 50,
        maxDatabases: 1,
        isActive: true
      }
    });

    const payment = await prisma.payment.create({
      data: {
        userId: clientUser.id,
        planId: plan.id,
        transactionId: `PAY-SUB-${Date.now()}`,
        amount: BigInt(15000),
        status: 'success'
      }
    });
    console.log('✔ Success Payment created as available slot. ID:', payment.id.toString());

    // 4. Login untuk mengambil JWT Token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('4. Login Response:', loginRes.status, loginData);
    if (!loginData.token) {
      throw new Error(`Login gagal, token tidak ditemukan. Response: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.token;
    console.log('✔ Login success, Token obtained.');

    // 5. UJI: Klaim Subdomain via API
    const claimRes = await fetch(`${BASE_URL}/api/subdomains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'mysubtest',
        paymentId: payment.id.toString()
      })
    });
    
    const claimData = await claimRes.json();
    console.log('\n5. API Claim Subdomain Response:', claimRes.status, claimData);

    if (claimRes.status === 201) {
      console.log('\n✔ Pengujian API Klaim & Provisioning cPanel Berhasil!');
      
      // Verifikasi di DB
      const dbSubdomain = await prisma.subdomain.findFirst({
        where: { name: 'mysubtest' },
        include: { databases: true }
      });

      console.log('\n--- Hasil Verifikasi Database ---');
      console.log('Nama Subdomain:', dbSubdomain?.name);
      console.log('Full Domain:', dbSubdomain?.fullDomain);
      console.log('Document Root:', dbSubdomain?.docRoot);
      console.log('Status Subdomain:', dbSubdomain?.status);
      console.log('Expired At:', dbSubdomain?.expiredAt);
      console.log('Database MySQL yang Dibuat:', dbSubdomain?.databases[0]?.dbName);
      console.log('Database User yang Dibuat:', dbSubdomain?.databases[0]?.dbUser);
      console.log('Password Enkripsi di DB:', dbSubdomain?.databases[0]?.dbPassword.substring(0, 40) + '...');

      // Verifikasi hubungan payment -> subdomain
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id }
      });
      console.log('Tautan Subdomain di Payment Slot:', updatedPayment?.subdomainId?.toString());
      console.log('\n=== PENGUJIAN API SUBDOMAIN SELESAI (100% SUKSES) ===');
    } else {
      console.error('\n✖ Pengujian Gagal: Status respon bukan 201');
    }

  } catch (err) {
    console.error('✖ Terjadi kesalahan saat pengujian:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runSubdomainTests();
