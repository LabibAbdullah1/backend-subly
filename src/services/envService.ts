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

  // 3. Simpan berkas .env ke server cPanel / Mock
  await callCpanelApi('Fileman', 'save_file_content', {
    dir: docRoot,
    file: '.env',
    content: envContent
  });

  console.log(`✔ Env file (.env) written successfully for subdomain ID: ${subdomainId.toString()}`);
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

