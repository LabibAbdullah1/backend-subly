import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

async function runDeploymentTests() {
  console.log('=== MEMULAI PENGUJIAN API DEPLOYMENT & GIT INTEGRATION ===\n');

  try {
    // 1. Pembersihan data tester sebelumnya
    await prisma.deployment.deleteMany({
      where: {
        subdomain: { name: 'deploytest' }
      }
    });

    await prisma.subdomainEnv.deleteMany({
      where: {
        subdomain: { name: 'deploytest' }
      }
    });

    await prisma.subdomain.deleteMany({
      where: { name: 'deploytest' }
    });

    await prisma.payment.deleteMany({
      where: {
        OR: [
          { transactionId: { startsWith: 'PAY-DEP-' } }
        ]
      }
    });

    await prisma.plan.deleteMany({
      where: { name: 'Plan Deployment Test' }
    });

    // 2. Buat user client tester
    const clientEmail = `client_dep_${Date.now()}@subly.my.id`;
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);
    const clientUser = await prisma.user.create({
      data: {
        name: 'Client Deployment Tester',
        email: clientEmail,
        password: passwordHash,
        role: 'Client'
      }
    });
    console.log('✔ Client User created:', clientEmail);

    // 3. Buat plan & transaksi pembayaran sukses (sebagai slot kosong)
    const plan = await prisma.plan.create({
      data: {
        name: 'Plan Deployment Test',
        type: 'NodeJS',
        price: BigInt(50000),
        durationMonths: 1,
        maxStorageMb: 10, // 10MB quota limit
        maxDatabases: 2,
        isActive: true
      }
    });

    const payment = await prisma.payment.create({
      data: {
        userId: clientUser.id,
        planId: plan.id,
        transactionId: `PAY-DEP-${Date.now()}`,
        amount: BigInt(50000),
        status: 'success'
      }
    });

    // 4. Buat subdomain awal
    const subdomain = await prisma.subdomain.create({
      data: {
        userId: clientUser.id,
        name: 'deploytest',
        fullDomain: `deploytest.subly.my.id`,
        docRoot: `/home/sublymyi/client/deploytest`,
        status: 'active'
      }
    });

    // Hubungkan payment ke subdomain
    await prisma.payment.update({
      where: { id: payment.id },
      data: { subdomainId: subdomain.id }
    });
    console.log('✔ Subdomain created and linked to payment. ID:', subdomain.id.toString());

    // 5. Login untuk mengambil JWT Token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error(`Login gagal: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.token;
    console.log('✔ Login success, Token obtained.');

    // 6. UJI 1: Chunked Upload ZIP File Aman (3 chunks)
    console.log('\n--- UJI 1: Chunked Upload ZIP File (Valid) ---');
    
    // Buat file ZIP valid programmatik
    const validZip = new AdmZip();
    validZip.addFile('index.js', Buffer.from('console.log("App running successfully");'));
    validZip.addFile('package.json', Buffer.from('{"name": "deploytest", "version": "1.0.0"}'));
    const zipBuffer = validZip.toBuffer();
    
    const uploadId = `upload_${Date.now()}`;
    const totalChunks = 3;
    const chunkSize = Math.ceil(zipBuffer.length / totalChunks);
    const fileName = 'project-valid.zip';

    let lastUploadResStatus = 0;
    let lastUploadResData = {};

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, zipBuffer.length);
      const chunkSlice = zipBuffer.subarray(start, end);

      const formData = new FormData();
      formData.append('subdomainId', subdomain.id.toString());
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileName', fileName);
      formData.append('notes', 'Uji coba chunked upload Sprint 5');

      const blob = new Blob([chunkSlice]);
      formData.append('chunk', blob, `chunk-${i}`);

      const chunkRes = await fetch(`${BASE_URL}/api/deployments/upload-chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      lastUploadResStatus = chunkRes.status;
      lastUploadResData = await chunkRes.json();
      console.log(`Uploaded Chunk ${i + 1}/${totalChunks} - Status:`, chunkRes.status);
    }

    console.log('Hasil upload akhir:', lastUploadResStatus, lastUploadResData);
    if (lastUploadResStatus !== 201) {
      throw new Error('Gagal mengupload ZIP valid (Harus status 201)');
    }
    console.log('✔ Uji 1 Berhasil: ZIP terupload, divalidasi, diekstrak, dan tercatat.');

    // 7. UJI 2: Chunked Upload ZIP File Berbahaya (Ditolak)
    console.log('\n--- UJI 2: Chunked Upload ZIP File (Malicious .exe) ---');
    const malZip = new AdmZip();
    malZip.addFile('app.js', Buffer.from('console.log("App");'));
    malZip.addFile('malicious.exe', Buffer.from('MZ...fake executable content'));
    const malZipBuffer = malZip.toBuffer();

    const malUploadId = `upload_mal_${Date.now()}`;
    const malTotalChunks = 2;
    const malChunkSize = Math.ceil(malZipBuffer.length / malTotalChunks);
    let malLastResStatus = 0;
    let malLastResData = {};

    for (let i = 0; i < malTotalChunks; i++) {
      const start = i * malChunkSize;
      const end = Math.min(start + malChunkSize, malZipBuffer.length);
      const chunkSlice = malZipBuffer.subarray(start, end);

      const formData = new FormData();
      formData.append('subdomainId', subdomain.id.toString());
      formData.append('uploadId', malUploadId);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', malTotalChunks.toString());
      formData.append('fileName', 'project-malicious.zip');

      const blob = new Blob([chunkSlice]);
      formData.append('chunk', blob, `chunk-${i}`);

      const chunkRes = await fetch(`${BASE_URL}/api/deployments/upload-chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      malLastResStatus = chunkRes.status;
      malLastResData = await chunkRes.json();
    }

    console.log('Hasil upload berbahaya:', malLastResStatus, malLastResData);
    if (malLastResStatus !== 500 || !JSON.stringify(malLastResData).includes('Security Violation')) {
      throw new Error('Gagal memblokir file berbahaya. Harus status 500 dengan Security Violation');
    }
    console.log('✔ Uji 2 Berhasil: Upload ZIP berisi file berbahaya (.exe) berhasil ditolak.');

    // 8. UJI 3: Pengecekan Repositori Git Publik
    console.log('\n--- UJI 3: Pengecekan Repositori Git Publik (octocat/Spoon-Knife) ---');
    const checkGitRes = await fetch(`${BASE_URL}/api/subdomains/git/check-repository`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        git_url: 'https://github.com/octocat/Spoon-Knife'
      })
    });
    const checkGitData = await checkGitRes.json();
    console.log('GitHub Branches list:', checkGitRes.status, checkGitData);
    if (checkGitRes.status !== 200 || !checkGitData.branches.includes('main')) {
      throw new Error('Gagal mengambil branch repositori GitHub publik.');
    }
    console.log('✔ Uji 3 Berhasil: Cabang branch repositori git berhasil dibaca.');

    // 9. UJI 4: Hubungkan Git & Deploy Awal
    console.log('\n--- UJI 4: Hubungkan Git & Deploy Awal ---');
    const connectGitRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/git/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        git_url: 'https://github.com/octocat/Spoon-Knife',
        git_branch: 'main'
      })
    });
    const connectGitData = await connectGitRes.json();
    console.log('Connect Git Response:', connectGitRes.status, connectGitData);
    if (connectGitRes.status !== 200) {
      throw new Error('Gagal menghubungkan Git dan memicu deploy.');
    }
    console.log('✔ Uji 4 Berhasil: Git terhubung dan deploy awal berhasil dipicu.');

    // 10. UJI 5: Sinkronisasi Variabel Lingkungan (Environment Variables)
    console.log('\n--- UJI 5: Sinkronisasi Variabel Lingkungan ---');
    const updateEnvRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/env/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        keys: ['APP_NAME', 'PORT'],
        values: ['Subly App Test', '3000'],
        secrets: [false, true]
      })
    });
    const updateEnvData = await updateEnvRes.json();
    console.log('Update Env Response:', updateEnvRes.status, updateEnvData);
    if (updateEnvRes.status !== 200) {
      throw new Error('Gagal memperbarui variabel lingkungan.');
    }

    // Uji Update RAW
    const rawEnvText = `
    # Konfigurasi Database
    DATABASE_NAME=mysubly_prod
    DATABASE_USER=mysubly_user
    PORT=4000
    `;
    const updateEnvRawRes = await fetch(`${BASE_URL}/api/subdomains/${subdomain.id.toString()}/env/update-raw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        raw_env: rawEnvText
      })
    });
    const updateEnvRawData = await updateEnvRawRes.json();
    console.log('Update Env Raw Response:', updateEnvRawRes.status, updateEnvRawData);
    if (updateEnvRawRes.status !== 200) {
      throw new Error('Gagal memperbarui raw variabel lingkungan.');
    }

    // Verifikasi fisik file .env dan .htaccess di Windows Mock folder
    const mockFolder = path.join(process.cwd(), 'uploads/client/deploytest');
    const envFile = path.join(mockFolder, '.env');
    const htaccessFile = path.join(mockFolder, '.htaccess');

    console.log('\n--- Hasil Verifikasi File Fisik Lokal ---');
    console.log('Apakah file .env dibuat?', fs.existsSync(envFile));
    console.log('Apakah file .htaccess dibuat?', fs.existsSync(htaccessFile));
    
    if (fs.existsSync(envFile)) {
      console.log('Isi File .env:\n', fs.readFileSync(envFile, 'utf8').trim());
    }
    if (fs.existsSync(htaccessFile)) {
      console.log('Isi File .htaccess:\n', fs.readFileSync(htaccessFile, 'utf8').trim());
    }

    console.log('\n=== SELURUH PENGUJIAN SPRINT 5 SELESAI (100% SUKSES) ===');

  } catch (err) {
    console.error('✖ Terjadi kesalahan saat pengujian:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runDeploymentTests();
