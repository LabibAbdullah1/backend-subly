import { callCpanelApi } from './cpanelService.js';
import dotenv from 'dotenv';
import { writeDefaultSubdomainFiles } from './envService.js';

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
  console.log('✔ MySQL Privileges granted to client user.');

  // Hubungkan master database user (misal sublymyi_admin) ke database klien agar bisa membaca ukuran database
  let masterUser = 'sublymyi_admin';
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const parsed = new URL(dbUrl);
      if (parsed.username) {
        masterUser = parsed.username;
      }
    }
  } catch (e) {
    // Ignore error and fallback to sublymyi_admin
  }

  try {
    await callCpanelApi('Mysql', 'set_privileges_on_database', {
      user: masterUser,
      database: dbName,
      privileges: 'ALL PRIVILEGES'
    });
    console.log(`✔ MySQL Privileges granted to master user (${masterUser}).`);
  } catch (err: any) {
    console.warn(`[Warning] Gagal memberikan hak akses database ke master user (${masterUser}): ${err.message}`);
  }


  // 5. Pembuatan File Default Sistem via writeDefaultSubdomainFiles
  await writeDefaultSubdomainFiles(docRoot, 'active');
  console.log('✔ Default system files created.');
  console.log('[Provisioning] Selesai dengan sukses!');
}
