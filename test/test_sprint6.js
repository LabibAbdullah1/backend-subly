import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

async function runSprint6Tests() {
  console.log('=== MEMULAI PENGUJIAN API SPRINT 6: FILE MANAGER, CHAT, & TICKET ===\n');

  try {
    // 1. Pembersihan data tester sebelumnya
    await prisma.chat.deleteMany({
      where: {
        user: { email: { contains: 'sprint6' } }
      }
    });

    await prisma.report.deleteMany({
      where: {
        user: { email: { contains: 'sprint6' } }
      }
    });

    await prisma.subdomain.deleteMany({
      where: { name: 'sprint6test' }
    });

    await prisma.user.deleteMany({
      where: {
        email: { contains: 'sprint6' }
      }
    });

    // 2. Buat akun Admin & Klien tester
    const adminEmail = `admin_sprint6_${Date.now()}@subly.my.id`;
    const clientEmail = `client_sprint6_${Date.now()}@subly.my.id`;
    
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Sprint6 Admin',
        email: adminEmail,
        password: passwordHash,
        role: 'Admin'
      }
    });
    console.log('✔ Admin User created:', adminEmail);

    const clientUser = await prisma.user.create({
      data: {
        name: 'Sprint6 Client',
        email: clientEmail,
        password: passwordHash,
        role: 'Client'
      }
    });
    console.log('✔ Client User created:', clientEmail);

    // 3. Buat subdomain uji
    const subdomain = await prisma.subdomain.create({
      data: {
        userId: clientUser.id,
        name: 'sprint6test',
        fullDomain: 'sprint6test.subly.my.id',
        docRoot: '/home/sublymyi/client/sprint6test',
        status: 'active'
      }
    });
    console.log('✔ Subdomain created. ID:', subdomain.id.toString());

    // 4. Siapkan direktori mock lokal dan file dummy
    const mockFolder = path.join(process.cwd(), 'uploads/client/sprint6test');
    if (!fs.existsSync(mockFolder)) {
      fs.mkdirSync(mockFolder, { recursive: true });
    }
    
    // Tulis berkas-berkas uji
    fs.writeFileSync(path.join(mockFolder, 'index.html'), '<h1>Hello Subly</h1>', 'utf8');
    fs.writeFileSync(path.join(mockFolder, '.env'), 'PORT=4000\nSECRET=123', 'utf8');
    fs.writeFileSync(path.join(mockFolder, 'dummy.txt'), 'This is dummy file content', 'utf8');
    
    const subfolder = path.join(mockFolder, 'subfolder');
    if (!fs.existsSync(subfolder)) {
      fs.mkdirSync(subfolder);
    }
    fs.writeFileSync(path.join(subfolder, 'config.json'), '{"active": true}', 'utf8');
    console.log('✔ Local mock directories and files generated.');

    // 5. Login untuk mengambil JWT Token Klien & Admin
    const clientLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: 'password123' })
    });
    const clientLoginData = await clientLoginRes.json();
    const clientToken = clientLoginData.token;

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;
    console.log('✔ Client & Admin tokens obtained.');

    // 6. UJI 1: File Manager - Menelusuri File & Folder
    console.log('\n--- UJI 1: File Manager - List Files ---');
    const listRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/file-manager`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const listData = await listRes.json();
    console.log('List Root Folder (Status):', listRes.status);
    console.log('Root Folders found:', listData.folders.map(f => f.name));
    console.log('Root Files found:', listData.files.map(f => f.name));

    if (listRes.status !== 200 || listData.files.length < 3) {
      throw new Error('Gagal menelusuri folder root.');
    }

    // Uji penelusuran subfolder
    const listSubRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/file-manager?path=subfolder`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const listSubData = await listSubRes.json();
    console.log('List Subfolder Folders:', listSubData.folders.map(f => f.name));
    console.log('List Subfolder Files:', listSubData.files.map(f => f.name));
    if (listSubRes.status !== 200 || listSubData.files[0].name !== 'config.json') {
      throw new Error('Gagal menelusuri subfolder.');
    }

    // Uji Directory Traversal Block
    const traversalRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/file-manager?path=../`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const traversalData = await traversalRes.json();
    console.log('Traversal Block Response (Harus 400):', traversalRes.status, traversalData.message);
    if (traversalRes.status !== 400) {
      throw new Error('Directory traversal lolos dan tidak diblokir!');
    }
    console.log('✔ Uji 1 Berhasil: List file manager & proteksi directory traversal berjalan lancar.');

    // 7. UJI 2: File Manager - Menghapus File Secara Aman
    console.log('\n--- UJI 2: File Manager - Delete Files (Proteksi Berkas Kritis) ---');
    
    // Coba hapus .env (harus ditolak)
    const deleteEnvRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/file-manager`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ path: '.env' })
    });
    const deleteEnvData = await deleteEnvRes.json();
    console.log('Delete .env Response (Harus 403):', deleteEnvRes.status, deleteEnvData.message);
    if (deleteEnvRes.status !== 403) {
      throw new Error('File .env berhasil dihapus! Ini melanggar proteksi berkas kritis.');
    }

    // Hapus dummy.txt (harus berhasil)
    const deleteDummyRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/file-manager`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ path: 'dummy.txt' })
    });
    const deleteDummyData = await deleteDummyRes.json();
    console.log('Delete dummy.txt Response (Harus 200):', deleteDummyRes.status, deleteDummyData.message);
    
    const isDummyExists = fs.existsSync(path.join(mockFolder, 'dummy.txt'));
    console.log('Apakah file dummy.txt masih ada di disk?', isDummyExists);

    if (deleteDummyRes.status !== 200 || isDummyExists) {
      throw new Error('Gagal menghapus file dummy.txt.');
    }
    console.log('✔ Uji 2 Berhasil: Proteksi berkas kritis dan penghapusan file normal sukses.');

    // 8. UJI 3: Support Ticket (Report) System
    console.log('\n--- UJI 3: Support Ticket (Report) ---');
    
    // Client buat tiket baru
    const createReportRes = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        subject: 'Database Error MySQL',
        message: 'Koneksi ke database gagal dengan error 1045'
      })
    });
    const createReportData = await createReportRes.json();
    console.log('Create Report Response (Status):', createReportRes.status);
    if (createReportRes.status !== 201) {
      throw new Error('Gagal membuat tiket bantuan baru.');
    }
    const reportId = createReportData.data.id;

    // Client ambil list tiket
    const clientReportsRes = await fetch(`${BASE_URL}/api/reports`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const clientReportsData = await clientReportsRes.json();
    console.log('Client reports found count:', clientReportsData.data.length);

    // Admin ambil list tiket
    const adminReportsRes = await fetch(`${BASE_URL}/api/reports`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminReportsData = await adminReportsRes.json();
    console.log('Admin reports found count:', adminReportsData.data.length);

    // Admin perbarui status tiket
    const updateReportRes = await fetch(`${BASE_URL}/api/reports/${reportId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'resolved' })
    });
    const updateReportData = await updateReportRes.json();
    console.log('Admin Update Status Response (Harus 200 & resolved):', updateReportRes.status, updateReportData.data.status);
    if (updateReportRes.status !== 200 || updateReportData.data.status !== 'resolved') {
      throw new Error('Gagal merubah status tiket oleh Admin.');
    }
    console.log('✔ Uji 3 Berhasil: Siklus hidup Support Ticket berhasil disimulasikan.');

    // 9. UJI 4: Live Chat Support
    console.log('\n--- UJI 4: Live Chat Support ---');
    
    // Klien kirim pesan teks
    const clientSendRes = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        message: 'Halo Admin, tolong bantu saya.'
      })
    });
    console.log('Client Send Text Message Status (Harus 201):', clientSendRes.status);
    if (clientSendRes.status !== 201) {
      throw new Error('Klien gagal mengirim pesan teks.');
    }

    // Klien kirim pesan gambar (upload file Multer)
    const mockImageBuffer = Buffer.from('fake image content');
    const chatFormData = new FormData();
    chatFormData.append('message', 'Ini bukti tangkapan layar kendala.');
    const imageBlob = new Blob([mockImageBuffer], { type: 'image/png' });
    chatFormData.append('image', imageBlob, 'screenshot.png');

    const clientSendImgRes = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      },
      body: chatFormData
    });
    const clientSendImgData = await clientSendImgRes.json();
    console.log('Client Send Image Message Status (Harus 201):', clientSendImgRes.status);
    console.log('Image path saved:', clientSendImgData.data.imagePath);
    if (clientSendImgRes.status !== 201 || !clientSendImgData.data.imagePath) {
      throw new Error('Klien gagal mengirim pesan lampiran gambar.');
    }

    // Admin ambil riwayat percakapan klien tersebut
    const adminGetChatsRes = await fetch(`${BASE_URL}/api/chats?userId=${clientUser.id.toString()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminGetChatsData = await adminGetChatsRes.json();
    console.log('Admin retrieve chats count:', adminGetChatsData.data.length);
    if (adminGetChatsRes.status !== 200 || adminGetChatsData.data.length < 2) {
      throw new Error('Admin gagal mengambil riwayat chat.');
    }

    // Admin mengirim pesan balasan ke klien
    const adminSendRes = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        message: 'Baik, tiket Anda sudah kami resolved.',
        userId: clientUser.id.toString()
      })
    });
    const adminSendData = await adminSendRes.json();
    console.log('Admin Send Chat Status:', adminSendRes.status);
    if (adminSendRes.status !== 201 || !adminSendData.data.isAdmin) {
      throw new Error('Admin gagal mengirim balasan chat.');
    }

    // Klien menandai percakapan sebagai telah dibaca
    const markReadRes = await fetch(`${BASE_URL}/api/chats/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      }
    });
    console.log('Client Mark as Read Status:', markReadRes.status);
    if (markReadRes.status !== 200) {
      throw new Error('Gagal menandai pesan terbaca.');
    }

    console.log('\n=== SELURUH PENGUJIAN SPRINT 6 SELESAI (100% SUKSES) ===');

  } catch (err) {
    console.error('✖ Terjadi kesalahan saat pengujian:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runSprint6Tests();
