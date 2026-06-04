import { callCpanelApi } from './cpanelService.js';
import dotenv from 'dotenv';

dotenv.config();

const ROOT_DOMAIN = process.env.CPANEL_ROOT_DOMAIN || 'subly.my.id';

export async function provisionSubdomain(params: {
  subdomainName: string;
  docRoot: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  rootDomain?: string;
}): Promise<void> {
  const { subdomainName, docRoot, dbName, dbUser, dbPass } = params;
  const root = params.rootDomain || ROOT_DOMAIN;

  console.log(`[Provisioning] Memulai provisioning untuk subdomain: ${subdomainName}.${root}`);

  // 1. Pembuatan Subdomain di cPanel
  await callCpanelApi('SubDomain', 'addsubdomain', {
    domain: subdomainName,
    rootdomain: root,
    dir: docRoot
  });
  console.log('✔ cPanel Subdomain created.');

  // 2. Pembuatan Database MySQL di cPanel
  await callCpanelApi('Mysql', 'create_database', {
    name: dbName
  });
  console.log(`✔ MySQL Database '${dbName}' created.`);

  // 3. Pembuatan Database User di cPanel (Mengabaikan jika sudah ada)
  try {
    await callCpanelApi('Mysql', 'create_user', {
      name: dbUser,
      password: dbPass
    });
    console.log(`✔ MySQL User '${dbUser}' created.`);
  } catch (err: any) {
    console.warn(`[Warning] Pembuatan MySQL User '${dbUser}' gagal/user mungkin sudah ada: ${err.message}. Melanjutkan...`);
  }

  // 4. Hubungkan User ke Database dengan Privileges ALL
  await callCpanelApi('Mysql', 'set_privileges_on_database', {
    user: dbUser,
    database: dbName,
    privileges: 'ALL PRIVILEGES'
  });
  console.log('✔ MySQL Privileges granted.');

  // 5. Pembuatan File Landing Page index.html Default
  const defaultHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain Aktif - Subly Managed Hosting</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', sans-serif;
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      color: #1f2937;
      margin: 0;
      height: 100vh;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    }
    h1 {
      color: #4f46e5;
      font-size: 32px;
      margin-bottom: 10px;
    }
    p {
      font-size: 18px;
      line-height: 1.6;
      color: #4b5563;
    }
    .domain {
      background-color: #e0e7ff;
      color: #3730a3;
      padding: 6px 16px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 18px;
      display: inline-block;
      margin: 15px 0;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Subdomain Anda Aktif!</h1>
    <p>Selamat! Subdomain baru Anda berhasil dibuat dan siap digunakan.</p>
    <div class="domain">${subdomainName}.${root}</div>
    <p>Silakan upload file proyek Anda atau hubungkan repositori GitHub dari Dashboard Subly untuk memulai deployment.</p>
    <div class="footer">Ditenagai oleh Subly Managed Hosting</div>
  </div>
</body>
</html>`;

  await callCpanelApi('Fileman', 'save_file_content', {
    dir: docRoot,
    file: 'index.html',
    content: defaultHtml
  });
  console.log('✔ Default index.html created.');
  console.log('[Provisioning] Selesai dengan sukses!');
}
