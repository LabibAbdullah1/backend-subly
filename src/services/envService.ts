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

  // 3. Simpan berkas .env ke server cPanel / Mock
  await callCpanelApi('Fileman', 'save_file_content', {
    dir: docRoot,
    file: '.env',
    content: envContent
  });

  console.log(`✔ Env file (.env) written successfully for subdomain ID: ${subdomainId.toString()}`);
}
