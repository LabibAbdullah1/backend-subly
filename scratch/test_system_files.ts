import { writeDefaultSubdomainFiles } from '../src/services/envService.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("=== START TEST SYSTEM FILES ===");
  const testDocRoot = "/home/sublymyi/client/test_subdomain_files";
  
  // Resolve physical path (mocked on Windows)
  const physicalPath = process.platform === 'win32'
    ? path.join(process.cwd(), 'uploads/client/test_subdomain_files')
    : testDocRoot;

  // Clean physicalPath if exists
  if (fs.existsSync(physicalPath)) {
    fs.rmSync(physicalPath, { recursive: true, force: true });
  }

  // 1. Test writeDefaultSubdomainFiles active
  console.log("\n1. Testing writeDefaultSubdomainFiles active...");
  await writeDefaultSubdomainFiles(testDocRoot, 'active');
  
  // Verify files created
  const statusExists = fs.existsSync(path.join(physicalPath, '.subly_status'));
  const phpExists = fs.existsSync(path.join(physicalPath, 'index.php'));
  console.log(`- .subly_status exists: ${statusExists}`);
  console.log(`- index.php exists: ${phpExists}`);
  
  if (!statusExists || !phpExists) {
    throw new Error("Failed to create active default files");
  }
  
  const statusContent = fs.readFileSync(path.join(physicalPath, '.subly_status'), 'utf8');
  const phpContent = fs.readFileSync(path.join(physicalPath, 'index.php'), 'utf8');
  console.log(`- .subly_status content: ${statusContent}`);
  console.log(`- index.php contains 'System Default Router': ${phpContent.includes('System Default Router')}`);
  
  // 2. Test writeDefaultSubdomainFiles suspended
  console.log("\n2. Testing writeDefaultSubdomainFiles suspended...");
  await writeDefaultSubdomainFiles(testDocRoot, 'suspended');
  
  const htaccessExists = fs.existsSync(path.join(physicalPath, '.htaccess'));
  console.log(`- .htaccess exists: ${htaccessExists}`);
  if (!htaccessExists) {
    throw new Error("Failed to create suspended htaccess redirect");
  }
  
  const htaccessContent = fs.readFileSync(path.join(physicalPath, '.htaccess'), 'utf8');
  console.log(`- .htaccess contains 'Subly Suspended Redirect': ${htaccessContent.includes('Subly Suspended Redirect')}`);
  
  // 3. Test active restore behavior
  console.log("\n3. Testing active restore behavior...");
  // Simulate client having their own index.php and htaccess (backed up when suspended)
  fs.writeFileSync(path.join(physicalPath, 'index.php.bak'), '<?php echo "client php"; ?>', 'utf8');
  fs.writeFileSync(path.join(physicalPath, '.htaccess.bak'), '# client htaccess', 'utf8');
  
  await writeDefaultSubdomainFiles(testDocRoot, 'active');
  const restoredPhp = fs.readFileSync(path.join(physicalPath, 'index.php'), 'utf8');
  const restoredHtaccess = fs.readFileSync(path.join(physicalPath, '.htaccess'), 'utf8');
  console.log(`- index.php restored: ${restoredPhp.includes('client php')}`);
  console.log(`- .htaccess restored: ${restoredHtaccess.includes('client htaccess')}`);
  
  if (!restoredPhp.includes('client php') || !restoredHtaccess.includes('client htaccess')) {
    throw new Error("Failed to restore client files");
  }
  
  // Clean up
  fs.rmSync(physicalPath, { recursive: true, force: true });
  console.log("\n=== ALL TESTS PASSED ===");
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
