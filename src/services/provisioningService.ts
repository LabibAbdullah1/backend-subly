import { callCpanelApi } from './cpanelService.js';
import dotenv from 'dotenv';
import { writeDefaultSubdomainFiles } from './envService.js';

dotenv.config();

const ROOT_DOMAIN = process.env.CPANEL_ROOT_DOMAIN || 'subly.my.id';

export interface ProvisioningStatusReport {
  success: boolean;
  subdomainCreated: boolean;
  databaseCreated: boolean;
  userCreated: boolean;
  privilegesGranted: boolean;
  defaultFilesCreated: boolean;
  errors: string[];
}

export async function provisionSubdomain(params: {
  subdomainName: string;
  docRoot: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  rootDomain?: string;
}): Promise<ProvisioningStatusReport> {
  const { subdomainName, docRoot, dbName, dbUser, dbPass } = params;
  const root = params.rootDomain || ROOT_DOMAIN;

  const report: ProvisioningStatusReport = {
    success: false,
    subdomainCreated: false,
    databaseCreated: false,
    userCreated: false,
    privilegesGranted: false,
    defaultFilesCreated: false,
    errors: []
  };

  console.log(`[Provisioning] Memulai provisioning untuk subdomain: ${subdomainName}.${root}`);

  // 1. Pembuatan Subdomain di cPanel
  try {
    await callCpanelApi('SubDomain', 'addsubdomain', {
      domain: subdomainName,
      rootdomain: root,
      dir: docRoot
    });
    report.subdomainCreated = true;
    console.log('✔ cPanel Subdomain created.');
  } catch (err: any) {
    report.errors.push(`Subdomain error: ${err.message}`);
    console.error(`[Error] Pembuatan cPanel Subdomain gagal: ${err.message}`);
    throw new Error(`Gagal membuat subdomain di server cPanel: ${err.message}`);
  }

  const cpanelUser = process.env.CPANEL_USER || 'sublymyi';
  // cPanel UAPI otomatis menempelkan prefix username_ pada nama DB & User
  const dbNameParam = dbName.startsWith(`${cpanelUser}_`) 
    ? dbName.slice(cpanelUser.length + 1) 
    : dbName;
  const dbUserParam = dbUser.startsWith(`${cpanelUser}_`) 
    ? dbUser.slice(cpanelUser.length + 1) 
    : dbUser;

  // 2. Pembuatan Database MySQL di cPanel
  try {
    await callCpanelApi('Mysql', 'create_database', {
      name: dbNameParam
    });
    report.databaseCreated = true;
    console.log(`✔ MySQL Database '${dbName}' created.`);
  } catch (err: any) {
    report.errors.push(`Database: ${err.message}`);
    console.warn(`[Warning] Pembuatan MySQL Database '${dbName}' gagal: ${err.message}`);
  }

  // 3. Pembuatan Database User di cPanel (Mengabaikan jika sudah ada)
  if (report.databaseCreated) {
    try {
      await callCpanelApi('Mysql', 'create_user', {
        name: dbUserParam,
        password: dbPass
      });
      report.userCreated = true;
      console.log(`✔ MySQL User '${dbUser}' created.`);
    } catch (err: any) {
      console.warn(`[Warning] Pembuatan MySQL User '${dbUser}' gagal/user mungkin sudah ada: ${err.message}. Melanjutkan...`);
      report.userCreated = true;
    }

    // 4. Hubungkan User ke Database dengan Privileges ALL
    try {
      await callCpanelApi('Mysql', 'set_privileges_on_database', {
        user: dbUser,
        database: dbName,
        privileges: 'ALL PRIVILEGES'
      });
      report.privilegesGranted = true;
      console.log('✔ MySQL Privileges granted to client user.');
    } catch (err: any) {
      report.errors.push(`Privileges: ${err.message}`);
      console.warn(`[Warning] Pemberian hak akses MySQL gagal: ${err.message}`);
    }

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
  }

  // 5. Pembuatan File Default Sistem via writeDefaultSubdomainFiles
  try {
    await writeDefaultSubdomainFiles(docRoot, 'active');
    report.defaultFilesCreated = true;
    console.log('✔ Default system files created.');
  } catch (err: any) {
    report.errors.push(`Default files: ${err.message}`);
    console.warn(`[Warning] Gagal membuat file default sistem: ${err.message}`);
  }

  report.success = report.subdomainCreated;
  console.log('[Provisioning] Selesai dengan status:', report);
  return report;
}
