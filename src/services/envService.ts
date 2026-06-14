import prisma from '../config/db.js';
import { callCpanelApi } from './cpanelService.js';
import fs from 'fs';
import path from 'path';

export async function writeEnvFiles(subdomainId: bigint, docRoot: string): Promise<void> {
  // 1. Ambil semua env variables untuk subdomain dari DB
  const envs = await prisma.subdomainEnv.findMany({
    where: { subdomainId }
  });

  // 2. Buat format string .env standar
  let envContent = '';
  for (const env of envs) {
    envContent += `${env.key}=${env.value}\n`;
  }

  // 3. Simpan berkas .env langsung menggunakan fs
  const envPath = getPhysicalEnvPath(docRoot);
  const targetDir = path.dirname(envPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log(`✔ Env file (.env) written successfully at: ${envPath} for subdomain ID: ${subdomainId.toString()}`);
}

function getPhysicalEnvPath(docRoot: string): string {
  if (process.platform === 'win32') {
    const match = docRoot.match(/\/home\/[^/]+\/client\/([^/]+)(.*)/);
    if (match) {
      const subdomain = match[1];
      const subPath = match[2];
      const mockDir = path.join(process.cwd(), 'uploads/client', subdomain, subPath);
      if (!fs.existsSync(mockDir)) {
        fs.mkdirSync(mockDir, { recursive: true });
      }
      return path.join(mockDir, '.env');
    }
    const parts = docRoot.split('/');
    const lastPart = parts[parts.length - 1] || 'default';
    const fallbackPath = path.join(process.cwd(), 'uploads/client', lastPart);
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    return path.join(fallbackPath, '.env');
  }
  return path.join(docRoot, '.env');
}

export async function syncEnvFileWithDatabase(subdomainId: bigint, docRoot: string): Promise<void> {
  const envPath = getPhysicalEnvPath(docRoot);
  
  if (!fs.existsSync(envPath)) {
    // 1. Jika berkas .env tidak ada di root folder server, buat file baru dari database
    await writeEnvFiles(subdomainId, docRoot);
    return;
  }

  // 2. Jika berkas .env sudah ada, baca dan sinkronisasikan ke database
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const parsedEnvs: { key: string; value: string; isSecret: boolean }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Lewati baris kosong atau komentar
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue; // abaikan baris yang tidak berformat key=value
    }

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Hapus tanda kutip luar jika ada (e.g. "myvalue" atau 'myvalue')
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    // Validasi penamaan key env (hanya karakter alfanumerik dan underscore)
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      continue;
    }

    const upperKey = key.toUpperCase();
    const isSecret = /pass|secret|key|token/i.test(upperKey);

    parsedEnvs.push({
      key: upperKey,
      value,
      isSecret
    });
  }

  // Bandingkan dengan data env di database saat ini
  const existingEnvs = await prisma.subdomainEnv.findMany({
    where: { subdomainId }
  });

  let hasChanges = false;
  if (existingEnvs.length !== parsedEnvs.length) {
    hasChanges = true;
  } else {
    const existingMap = new Map(existingEnvs.map((e) => [e.key, e.value]));
    for (const parsed of parsedEnvs) {
      if (existingMap.get(parsed.key) !== parsed.value) {
        hasChanges = true;
        break;
      }
    }
  }

  if (hasChanges) {
    console.log(`[Sync Env] Mengubah env di database untuk subdomain ID: ${subdomainId.toString()} agar sesuai dengan file fisik.`);
    await prisma.$transaction(async (tx) => {
      // Hapus data env lama
      await tx.subdomainEnv.deleteMany({
        where: { subdomainId }
      });

      // Simpan data env baru
      if (parsedEnvs.length > 0) {
        await tx.subdomainEnv.createMany({
          data: parsedEnvs.map((env) => ({
            subdomainId,
            key: env.key,
            value: env.value,
            isSecret: env.isSecret
          }))
        });
      }
    });
  }
}

// Translate cPanel docRoot to physical folder path
export function getPhysicalDocRoot(docRoot: string): string {
  if (process.platform === 'win32') {
    const match = docRoot.match(/\/home\/[^/]+\/client\/([^/]+)(.*)/);
    if (match) {
      const subdomain = match[1];
      const subPath = match[2];
      const mockDir = path.join(process.cwd(), 'uploads/client', subdomain, subPath);
      if (!fs.existsSync(mockDir)) {
        fs.mkdirSync(mockDir, { recursive: true });
      }
      return mockDir;
    }
    const parts = docRoot.split('/');
    const lastPart = parts[parts.length - 1] || 'default';
    const fallbackPath = path.join(process.cwd(), 'uploads/client', lastPart);
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    return fallbackPath;
  }
  return docRoot;
}

export async function writeDefaultSubdomainFiles(docRoot: string, status: string): Promise<void> {
  const targetDir = getPhysicalDocRoot(docRoot);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Tulis file status .subly_status
  const statusPath = path.join(targetDir, '.subly_status');
  fs.writeFileSync(statusPath, status, 'utf8');

  // 2. Definisi templates
  const welcomeHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain Aktif - Subly Managed Hosting</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0f172a;
      color: #f1f5f9;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 500px;
      padding: 40px;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
      display: inline-block;
      animation: float 3s ease-in-out infinite;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 16px 0;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px 0;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="icon">🚀</span>
    <h1>Subdomain Berhasil Aktif!</h1>
    <p>Subdomain Anda telah aktif dan siap digunakan. Silakan unggah berkas proyek Anda menggunakan File Manager di dashboard Subly.</p>
  </div>
</body>
</html>`;

  const suspendedHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subdomain Nonaktif - Subly Managed Hosting</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0f172a;
            color: #f1f5f9;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 500px;
            padding: 40px;
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .icon {
            font-size: 64px;
            margin-bottom: 24px;
            display: inline-block;
            animation: float 3s ease-in-out infinite;
        }
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 16px 0;
            background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            font-size: 15px;
            line-height: 1.6;
            color: #94a3b8;
            margin: 0 0 24px 0;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
    </style>
</head>
<body>
    <div class="container">
        <span class="icon">⚠️</span>
        <h1>Subdomain Nonaktif</h1>
        <p>Masa aktif subdomain ini telah kedaluwarsa atau ditangguhkan oleh Administrator. Silakan hubungi admin atau lakukan pembayaran perpanjangan sewa.</p>
    </div>
</body>
</html>`;

  const indexPhpContent = `<?php
// Subly Managed Hosting - System Default Router
$status = '${status}';

if ($status === 'suspended' || $status === 'expired' || $status === 'inactive') {
    ?>
    ${suspendedHtml}
    <?php
    exit;
}

// Cek apakah ada file project lain selain system files
$files = scandir(__DIR__);
$hasClientFiles = false;
foreach ($files as $file) {
    if ($file === '.' || $file === '..' || $file === 'index.php' || $file === '.subly_status' || $file === '.htaccess' || $file === '.env' || $file === 'index.php.bak' || $file === '.htaccess.bak') {
        continue;
    }
    $hasClientFiles = true;
    break;
}

$clientHtml = null;
if (file_exists('index.html')) {
    $clientHtml = 'index.html';
} elseif (file_exists('index.htm')) {
    $clientHtml = 'index.htm';
}

if (!$hasClientFiles || !$clientHtml) {
    ?>
    ${welcomeHtml}
    <?php
    exit;
} else {
    include $clientHtml;
    exit;
}
?>`;

  const indexPhpPath = path.join(targetDir, 'index.php');
  const htaccessPath = path.join(targetDir, '.htaccess');

  // 3. Tulis logika berdasarkan status
  if (status === 'suspended' || status === 'expired' || status === 'inactive') {
    // a. Backup index.php milik klien jika ada & bukan milik sistem
    if (fs.existsSync(indexPhpPath)) {
      const existingContent = fs.readFileSync(indexPhpPath, 'utf8');
      if (!existingContent.includes('System Default Router')) {
        const backupIndexPhp = path.join(targetDir, 'index.php.bak');
        if (!fs.existsSync(backupIndexPhp)) {
          fs.renameSync(indexPhpPath, backupIndexPhp);
          console.log(`[Suspended Write] Backed up client index.php to index.php.bak`);
        }
      }
    }

    // Tulis index.php default sistem
    fs.writeFileSync(indexPhpPath, indexPhpContent, 'utf8');

    // b. Backup .htaccess milik klien jika ada & bukan milik sistem
    if (fs.existsSync(htaccessPath)) {
      const existingHtaccess = fs.readFileSync(htaccessPath, 'utf8');
      if (!existingHtaccess.includes('Subly Suspended Redirect')) {
        const backupHtaccess = path.join(targetDir, '.htaccess.bak');
        if (!fs.existsSync(backupHtaccess)) {
          fs.renameSync(htaccessPath, backupHtaccess);
          console.log(`[Suspended Write] Backed up client .htaccess to .htaccess.bak`);
        }
      }
    }

    // Tulis .htaccess baru untuk mengarahkan semua request ke index.php
    const redirectHtaccess = `# Subly Suspended Redirect
RewriteEngine On
RewriteRule ^(.*)$ index.php [L]
`;
    fs.writeFileSync(htaccessPath, redirectHtaccess, 'utf8');

  } else {
    // c. Status ACTIVE:
    // Restore index.php klien jika ada backup
    const backupIndexPhp = path.join(targetDir, 'index.php.bak');
    if (fs.existsSync(backupIndexPhp)) {
      if (fs.existsSync(indexPhpPath)) {
        fs.unlinkSync(indexPhpPath);
      }
      fs.renameSync(backupIndexPhp, indexPhpPath);
      console.log(`[Active Write] Restored client index.php from index.php.bak`);
    } else {
      // Jika tidak ada backup, pastikan index.php sistem ditulis agar melayani selamat datang jika kosong
      if (!fs.existsSync(indexPhpPath)) {
        fs.writeFileSync(indexPhpPath, indexPhpContent, 'utf8');
      } else {
        const existingContent = fs.readFileSync(indexPhpPath, 'utf8');
        if (existingContent.includes('System Default Router')) {
          fs.writeFileSync(indexPhpPath, indexPhpContent, 'utf8');
        }
      }
    }

    // Restore .htaccess klien jika ada backup
    const backupHtaccess = path.join(targetDir, '.htaccess.bak');
    if (fs.existsSync(backupHtaccess)) {
      if (fs.existsSync(htaccessPath)) {
        fs.unlinkSync(htaccessPath);
      }
      fs.renameSync(backupHtaccess, htaccessPath);
      console.log(`[Active Write] Restored client .htaccess from .htaccess.bak`);
    } else {
      // Jika tidak ada backup, hapus .htaccess jika isinya adalah redirect sistem
      if (fs.existsSync(htaccessPath)) {
        const existingHtaccess = fs.readFileSync(htaccessPath, 'utf8');
        if (existingHtaccess.includes('Subly Suspended Redirect')) {
          fs.unlinkSync(htaccessPath);
        }
      }
    }
  }
}

