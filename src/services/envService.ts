import prisma from '../config/db.js';
import { callCpanelApi } from './cpanelService.js';

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

  // 3. Buat format block Litespeed Env .htaccess
  let htaccessBlock = '# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS CONFIGURATION BEGIN\n';
  htaccessBlock += '<IfModule Litespeed>\n';
  for (const env of envs) {
    htaccessBlock += `  SetEnv ${env.key} "${env.value}"\n`;
  }
  htaccessBlock += '</IfModule>\n';
  htaccessBlock += '# CLOUDLINUX ENV VARS CONFIGURATION END\n';

  // 4. Simpan berkas .env ke server cPanel / Mock
  await callCpanelApi('Fileman', 'save_file_content', {
    dir: docRoot,
    file: '.env',
    content: envContent
  });

  // 5. Simpan berkas .htaccess ke server cPanel / Mock
  await callCpanelApi('Fileman', 'save_file_content', {
    dir: docRoot,
    file: '.htaccess',
    content: htaccessBlock
  });

  console.log(`✔ Env files (.env and .htaccess) written successfully for subdomain ID: ${subdomainId.toString()}`);
}
