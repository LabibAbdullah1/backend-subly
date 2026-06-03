import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';
import { getBaseDirectory } from './fileManagerService.js';

const suspendedHtmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subdomain Suspended - Subly Managed Hosting</title>
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
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            transition: all 0.2s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
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
        <p>Masa aktif subdomain ini telah kedaluwarsa atau ditangguhkan. Silakan lakukan perpanjangan paket sewa Anda melalui dashboard Subly Managed Hosting.</p>
        <a href="http://localhost:3000" class="btn">Kembali ke Dashboard</a>
    </div>
</body>
</html>
`;

export async function cleanupExpiredSubdomains(): Promise<{ suspendedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let suspendedCount = 0;

  try {
    // 1. Cari subdomain aktif yang tanggal kedaluwarsanya kurang dari waktu saat ini
    const expiredSubdomains = await prisma.subdomain.findMany({
      where: {
        status: 'active',
        expiredAt: {
          lt: new Date()
        },
        deletedAt: null
      }
    });

    console.log(`[Cron Expired Subdomains] Found ${expiredSubdomains.length} expired subdomains.`);

    for (const subdomain of expiredSubdomains) {
      try {
        const baseDir = getBaseDirectory(subdomain.docRoot);

        if (fs.existsSync(baseDir)) {
          // a. Backup index.html milik klien jika ada
          const indexHtmlPath = path.join(baseDir, 'index.html');
          if (fs.existsSync(indexHtmlPath)) {
            const backupIndexHtmlPath = path.join(baseDir, 'index.html.bak');
            if (!fs.existsSync(backupIndexHtmlPath)) {
              fs.renameSync(indexHtmlPath, backupIndexHtmlPath);
              console.log(`[Cron Expired Subdomains] Backed up index.html for ${subdomain.name}`);
            } else {
              // Jika backup sudah ada, hapus index asli
              fs.unlinkSync(indexHtmlPath);
            }
          }

          // b. Backup .htaccess milik klien jika ada
          const htaccessPath = path.join(baseDir, '.htaccess');
          if (fs.existsSync(htaccessPath)) {
            const backupHtaccessPath = path.join(baseDir, '.htaccess.bak');
            if (!fs.existsSync(backupHtaccessPath)) {
              fs.renameSync(htaccessPath, backupHtaccessPath);
              console.log(`[Cron Expired Subdomains] Backed up .htaccess for ${subdomain.name}`);
            } else {
              // Jika backup sudah ada, hapus htaccess asli
              fs.unlinkSync(htaccessPath);
            }
          }

          // c. Tulis index.html suspended/expired page baru
          fs.writeFileSync(indexHtmlPath, suspendedHtmlTemplate, 'utf8');
          console.log(`[Cron Expired Subdomains] Wrote suspension notice for ${subdomain.name}`);
        }

        // d. Bersihkan file ZIP lama terkait subdomain ini di folder uploads/deployments
        const deploymentsDir = path.join(process.cwd(), 'uploads/deployments');
        if (fs.existsSync(deploymentsDir)) {
          const files = fs.readdirSync(deploymentsDir);
          const prefix = `${subdomain.id.toString()}-`;
          for (const file of files) {
            if (file.startsWith(prefix) && file.endsWith('.zip')) {
              try {
                fs.unlinkSync(path.join(deploymentsDir, file));
                console.log(`[Cron Expired Subdomains] Deleted deployment zip: ${file}`);
              } catch (e: any) {
                console.error(`Gagal menghapus file zip ${file}:`, e.message);
              }
            }
          }
        }

        // e. Perbarui status di database menjadi suspended
        await prisma.subdomain.update({
          where: { id: subdomain.id },
          data: { status: 'suspended' }
        });

        suspendedCount++;
        console.log(`✔ Subdomain ${subdomain.fullDomain} berhasil ditangguhkan (suspended).`);

      } catch (err: any) {
        errors.push(`Gagal memproses subdomain ${subdomain.fullDomain}: ${err.message}`);
        console.error(`✖ Gagal menangguhkan subdomain ${subdomain.fullDomain}:`, err.message);
      }
    }

  } catch (err: any) {
    errors.push(`Kritikal error pada cron expired subdomains: ${err.message}`);
    console.error('✖ Terjadi kesalahan kritis pada proses cron penangguhan:', err.message);
  }

  return { suspendedCount, errors };
}
