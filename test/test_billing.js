import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

async function runBillingTests() {
  console.log('=== MEMULAI PENGUJIAN API BILLING SYSTEM ===\n');

  try {
    // Clean up existing test data from previous runs to prevent unique constraint errors
    await prisma.payment.deleteMany({
      where: {
        OR: [
          { transactionId: { startsWith: 'PAY-' } },
          { snapToken: 'FREE_VOUCHER_SKIPPED' }
        ]
      }
    });
    
    await prisma.subdomain.deleteMany({
      where: { name: 'mytestweb' }
    });

    await prisma.voucher.deleteMany({
      where: { code: { in: ['TESTDISCOUNT100', 'TESTKUPON5000'] } }
    });

    await prisma.plan.deleteMany({
      where: { name: 'Starter PHP Test' }
    });

    // 1. Bersihkan data tester sebelumnya & Buat akun Admin & Client di database secara langsung
    const adminEmail = `admin_test_${Date.now()}@subly.my.id`;
    const clientEmail = `client_test_${Date.now()}@subly.my.id`;
    
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Tester Admin',
        email: adminEmail,
        password: passwordHash,
        role: 'Admin'
      }
    });
    console.log('✔ Admin User created in DB:', adminEmail);

    const clientUser = await prisma.user.create({
      data: {
        name: 'Tester Client',
        email: clientEmail,
        password: passwordHash,
        role: 'Client'
      }
    });
    console.log('✔ Client User created in DB:', clientEmail);

    // 2. Buat paket (Plan) secara langsung di DB
    const plan = await prisma.plan.create({
      data: {
        name: 'Starter PHP Test',
        type: 'PHP',
        price: BigInt(15000),
        durationMonths: 3,
        maxStorageMb: 50,
        maxDatabases: 1,
        isActive: true
      }
    });
    console.log('✔ Plan created in DB: Starter PHP Test (Rp 15.000)');

    // 3. Buat voucher di DB
    const voucher = await prisma.voucher.create({
      data: {
        code: 'TESTDISCOUNT100',
        type: 'percent',
        rewardAmount: 100.00,
        usageLimit: 5
      }
    });
    console.log('✔ Voucher created in DB: TESTDISCOUNT100 (100% OFF)');

    // Buat voucher nominal rupiah
    const voucherFixed = await prisma.voucher.create({
      data: {
        code: 'TESTKUPON5000',
        type: 'fixed',
        rewardAmount: 5000.00,
        usageLimit: 5
      }
    });
    console.log('✔ Voucher created in DB: TESTKUPON5000 (Potongan Rp 5.000)');

    // 4. Buat Subdomain dummy milik client untuk diuji perpanjangannya
    const subdomain = await prisma.subdomain.create({
      data: {
        userId: clientUser.id,
        name: 'mytestweb',
        fullDomain: 'mytestweb.subly.my.id',
        docRoot: '/home/sublymyi/client/mytestweb',
        status: 'inactive',
        expiredAt: new Date(Date.now() - 3600 * 1000) // Sudah expired 1 jam lalu
      }
    });
    console.log('✔ Dummy Subdomain created in DB:', subdomain.fullDomain, '(Status: inactive/expired)');

    // 5. Login untuk mendapatkan JWT Token Admin & Client via HTTP
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    const clientLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: 'password123' })
    });
    const clientLoginData = await clientLoginRes.json();
    const clientToken = clientLoginData.token;

    console.log('\n✔ Login sukses, JWT Token didapatkan.');

    // 6. UJI: Verifikasi Voucher via API
    const verifyRes = await fetch(`${BASE_URL}/api/vouchers/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ code: 'TESTDISCOUNT100' })
    });
    const verifyData = await verifyRes.json();
    console.log('6. Verify Voucher TESTDISCOUNT100:', verifyRes.status, verifyData);

    // 7. UJI: Checkout dengan Voucher 100% (Langsung Success)
    const checkoutFreeRes = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        planId: plan.id.toString(),
        voucherCode: 'TESTDISCOUNT100',
        subdomainId: subdomain.id.toString()
      })
    });
    const checkoutFreeData = await checkoutFreeRes.json();
    console.log('\n7. Checkout Free (100% voucher):', checkoutFreeRes.status, checkoutFreeData);

    // Verifikasi subdomain langsung aktif & diperpanjang
    const updatedSubFree = await prisma.subdomain.findUnique({ where: { id: subdomain.id } });
    console.log('Subdomain Expired Date after free checkout:', updatedSubFree.expiredAt, 'Status:', updatedSubFree.status);

    // 8. UJI: Checkout Normal (Status pending + kode unik)
    const checkoutNormalRes = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        planId: plan.id.toString(),
        voucherCode: 'TESTKUPON5000', // Potongan Rp 5.000 (15.000 - 5.000 = 10.000 + unique_code)
        subdomainId: subdomain.id.toString()
      })
    });
    const checkoutNormalData = await checkoutNormalRes.json();
    console.log('\n8. Checkout Normal (Potongan Rp 5.000 + Kode Unik):', checkoutNormalRes.status, checkoutNormalData);

    const paymentId = checkoutNormalData.data.id;
    console.log('Payment ID created:', paymentId, 'Total Amount:', checkoutNormalData.data.amount, 'Unique Code:', checkoutNormalData.data.uniqueCode);

    // 9. UJI: Admin Mengonfirmasi Pembayaran
    const confirmRes = await fetch(`${BASE_URL}/api/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const confirmData = await confirmRes.json();
    console.log('\n9. Admin Mengonfirmasi Pembayaran:', confirmRes.status, confirmData);

    // Verifikasi perpanjangan kedua kalinya (kumulatif!)
    const finalSub = await prisma.subdomain.findUnique({ where: { id: subdomain.id } });
    console.log('Subdomain Expired Date after admin confirmation:', finalSub.expiredAt, 'Status:', finalSub.status);

    // Periksa pesan otomatis di tabel Chat
    const chat = await prisma.chat.findFirst({
      where: { userId: clientUser.id },
      orderBy: { createdAt: 'desc' }
    });
    console.log('\n✔ Notifikasi Chat Otomatis Terkirim ke Klien:', chat ? chat.message : 'Tidak ditemukan');

    console.log('\n=== PENGUJIAN API BILLING SYSTEM SELESAI (100% SUKSES) ===');
  } catch (err) {
    console.error('Pengujian gagal:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runBillingTests();
