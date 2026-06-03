import { execFile } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

dotenv.config();

const execFileAsync = promisify(execFile);

function getLocalMockPath(dir: string): string {
  // cPanel user folder pattern: /home/[username]/client/[subdomain]
  // We translate it to [workspace]/uploads/client/[subdomain]/...
  const match = dir.match(/\/home\/[^/]+\/client\/([^/]+)(.*)/);
  if (match) {
    const subdomain = match[1];
    const subPath = match[2]; // e.g. /src or empty
    const mockPath = path.join(process.cwd(), 'uploads/client', subdomain, subPath);
    if (!fs.existsSync(mockPath)) {
      fs.mkdirSync(mockPath, { recursive: true });
    }
    return mockPath;
  }
  // Fallback if it doesn't match the format
  const parts = dir.split('/');
  const lastPart = parts[parts.length - 1] || 'default';
  const fallbackPath = path.join(process.cwd(), 'uploads/client', lastPart);
  if (!fs.existsSync(fallbackPath)) {
    fs.mkdirSync(fallbackPath, { recursive: true });
  }
  return fallbackPath;
}

export async function callCpanelApi(
  module: string,
  func: string,
  params: Record<string, string>
): Promise<any> {
  const cpanelUser = process.env.CPANEL_USER || 'sublymyi';
  const apiKey = process.env.CPANEL_API_KEY;
  const apiUrl = process.env.CPANEL_API_URL;

  // Deteksi mode simulasi jika berjalan di Windows (Local Development)
  if (process.platform === 'win32') {
    console.log(`[cPanel Mock API] Calling ${module}::${func} with parameters:`, params);

    // Mock file system operations locally
    if (module === 'Fileman') {
      if (func === 'save_file_content') {
        const mockDir = getLocalMockPath(params.dir || '');
        const filePath = path.join(mockDir, params.file || '');
        fs.writeFileSync(filePath, params.content || '', 'utf8');
        console.log(`[cPanel Mock API] Saved file locally: ${filePath}`);
      } else if (func === 'extract') {
        const mockDir = getLocalMockPath(params.dir || '');
        const zipPath = path.join(mockDir, params.file || '');
        if (fs.existsSync(zipPath)) {
          try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(mockDir, true);
            console.log(`[cPanel Mock API] Extracted zip file ${zipPath} to ${mockDir}`);
          } catch (err: any) {
            console.error(`[cPanel Mock API] Failed to extract zip: ${err.message}`);
          }
        } else {
          console.warn(`[cPanel Mock API] Zip file not found for extraction: ${zipPath}`);
        }
      } else if (func === 'delfiles' || func === 'delfile') {
        const mockDir = getLocalMockPath(params.dir || '');
        const filesToDelete = params.files ? JSON.parse(params.files) : [params.file];
        for (const f of filesToDelete) {
          if (f) {
            const filePath = path.join(mockDir, f);
            if (fs.existsSync(filePath)) {
              fs.rmSync(filePath, { recursive: true, force: true });
              console.log(`[cPanel Mock API] Deleted local file: ${filePath}`);
            }
          }
        }
      }
    }

    return {
      status: 1,
      cpanelresult: {
        data: {
          result: 1
        },
        result: {
          status: 1
        }
      }
    };
  }

  const isApi2 = (module === 'SubDomain' && func === 'delsubdomain') || module === 'Lvemanager';

  // 1. Cobalah via HTTP API cPanel
  if (apiKey && apiUrl) {
    try {
      const response = await axios.get(`${apiUrl}/execute/${module}/${func}`, {
        params,
        headers: { Authorization: `cpanel ${cpanelUser}:${apiKey}` },
        timeout: 10000
      });
      if (response.data && (response.data.status === 1 || response.data.cpanelresult?.data?.result === 1)) {
        return response.data;
      }
    } catch (error: any) {
      console.warn(`cPanel HTTP API gagal (${error.message}), mencoba fallback ke CLI lokal server...`);
    }
  }

  // 2. Fallback ke Local CLI Server (Hanya berjalan di Server Linux dengan hak akses UAPI CLI)
  const binary = isApi2 ? '/usr/bin/cpapi2' : '/usr/bin/uapi';
  const args = isApi2 
    ? [`--user=${cpanelUser}`, module, func] 
    : ['--output=json', module, func];

  // Tambahkan parameter ke argumen (Mencegah Shell Injection)
  for (const [key, value] of Object.entries(params)) {
    args.push(`${key}=${value}`);
  }

  try {
    const { stdout } = await execFileAsync(binary, args);
    const parsed = JSON.parse(stdout);
    
    // Cek status keberhasilan uapi (json format)
    if (parsed.status === 1 || parsed.cpanelresult?.data?.result === 1 || parsed.cpanelresult?.result?.status === 1) {
      return parsed;
    }
    throw new Error(parsed.errors?.[0] || parsed.cpanelresult?.errors?.[0] || "CLI execution returned success: false");
  } catch (cliError: any) {
    throw new Error(`cPanel CLI API Execution Failed: ${cliError.message}`);
  }
}
