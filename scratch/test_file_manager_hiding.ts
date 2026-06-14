import { listFiles, deleteFile } from '../src/controllers/fileManagerController.js';
import prisma from '../src/config/db.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("=== START FILE MANAGER HIDING TEST ===");

  // Find first active subdomain in the database to use as test target
  const sub = await prisma.subdomain.findFirst({
    where: { deletedAt: null }
  });

  if (!sub) {
    console.log("No subdomain found in database to run tests against. Skipping test.");
    return;
  }

  console.log(`Using subdomain: ${sub.fullDomain} (ID: ${sub.id.toString()})`);

  // Resolve physical path
  const targetDir = process.platform === 'win32'
    ? path.join(process.cwd(), 'uploads/client', sub.name)
    : sub.docRoot;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Create system files
  const statusPath = path.join(targetDir, '.subly_status');
  const phpPath = path.join(targetDir, 'index.php');
  const htaccessPath = path.join(targetDir, '.htaccess');
  const clientFilePath = path.join(targetDir, 'client_project.txt');

  fs.writeFileSync(statusPath, 'active', 'utf8');
  fs.writeFileSync(phpPath, '<?php // Subly Managed Hosting - System Default Router', 'utf8');
  fs.writeFileSync(htaccessPath, '# Subly Suspended Redirect\nRewriteEngine On', 'utf8');
  fs.writeFileSync(clientFilePath, 'client content', 'utf8');

  // 1. Test listing
  console.log("\n1. Testing listFiles filtering...");
  
  let foldersRes: any[] = [];
  let filesRes: any[] = [];
  
  const mockReq: any = {
    params: { id: sub.id.toString() },
    user: { id: sub.userId, role: 'Client' },
    query: { path: '' }
  };

  const mockRes: any = {
    status(code: number) {
      return {
        json(data: any) {
          if (code === 200) {
            foldersRes = data.folders || [];
            filesRes = data.files || [];
          }
          return this;
        }
      };
    }
  };

  await listFiles(mockReq, mockRes);

  console.log("Files returned to client:", filesRes.map((f: any) => f.name));
  
  const hasStatus = filesRes.some((f: any) => f.name === '.subly_status');
  const hasPhp = filesRes.some((f: any) => f.name === 'index.php');
  const hasHtaccess = filesRes.some((f: any) => f.name === '.htaccess');
  const hasClient = filesRes.some((f: any) => f.name === 'client_project.txt');

  console.log(`- Has .subly_status (should be false): ${hasStatus}`);
  console.log(`- Has index.php system default (should be false): ${hasPhp}`);
  console.log(`- Has .htaccess system redirect (should be false): ${hasHtaccess}`);
  console.log(`- Has client_project.txt (should be true): ${hasClient}`);

  if (hasStatus || hasPhp || hasHtaccess || !hasClient) {
    throw new Error("System files were not correctly hidden or client files were hidden!");
  }

  // 2. Test deletion protection
  console.log("\n2. Testing deleteFile protection...");
  
  let lastStatus = 0;
  let lastMessage = '';
  
  const mockDeleteRes: any = {
    status(code: number) {
      lastStatus = code;
      return {
        json(data: any) {
          lastMessage = data.message;
          return this;
        }
      };
    }
  };

  // Try to delete system index.php
  const mockDeleteReq1: any = {
    params: { id: sub.id.toString() },
    user: { id: sub.userId, role: 'Client' },
    body: { path: 'index.php' }
  };
  await deleteFile(mockDeleteReq1, mockDeleteRes);
  console.log(`- Delete index.php response status: ${lastStatus}, message: ${lastMessage}`);
  if (lastStatus !== 403) {
    throw new Error("Allowed deletion of system index.php!");
  }

  // Try to delete system .htaccess
  const mockDeleteReq2: any = {
    params: { id: sub.id.toString() },
    user: { id: sub.userId, role: 'Client' },
    body: { path: '.htaccess' }
  };
  await deleteFile(mockDeleteReq2, mockDeleteRes);
  console.log(`- Delete .htaccess response status: ${lastStatus}, message: ${lastMessage}`);
  if (lastStatus !== 403) {
    throw new Error("Allowed deletion of system .htaccess!");
  }

  // Try to delete client_project.txt (should succeed)
  const mockDeleteReq3: any = {
    params: { id: sub.id.toString() },
    user: { id: sub.userId, role: 'Client' },
    body: { path: 'client_project.txt' }
  };
  await deleteFile(mockDeleteReq3, mockDeleteRes);
  console.log(`- Delete client_project.txt response status: ${lastStatus}, message: ${lastMessage}`);
  if (lastStatus !== 200) {
    throw new Error("Failed to delete client file!");
  }

  // Clean up remaining files
  if (fs.existsSync(statusPath)) fs.unlinkSync(statusPath);
  if (fs.existsSync(phpPath)) fs.unlinkSync(phpPath);
  if (fs.existsSync(htaccessPath)) fs.unlinkSync(htaccessPath);

  console.log("\n=== ALL FILE MANAGER HIDING TESTS PASSED ===");
}

main()
  .catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
