const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = `tester_${Date.now()}@subly.my.id`;
const TEST_PASSWORD = 'password123';

async function runTests() {
  console.log('=== MEMULAI PENGUJIAN API AUTENTIKASI ===\n');

  // Test 1: Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('1. Health Check:', healthRes.status, healthData);
  } catch (err) {
    console.error('Koneksi ke server gagal. Apakah dev server sudah berjalan?', err.message);
    process.exit(1);
  }

  // Test 2: Register User Baru
  const registerPayload = {
    name: 'Tester Autentikasi',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    password_confirmation: TEST_PASSWORD
  };

  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload)
  });
  const registerData = await registerRes.json();
  console.log('\n2. Register User Baru:', registerRes.status, registerData);

  // Test 3: Register dengan Email Sama (Validasi Duplikasi)
  const duplicateRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload)
  });
  const duplicateData = await duplicateRes.json();
  console.log('3. Validasi Email Duplikat (Harus 422):', duplicateRes.status, duplicateData);

  // Test 4: Login User
  const loginPayload = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  };

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload)
  });
  const loginData = await loginRes.json();
  console.log('\n4. Login User:', loginRes.status, loginData);

  if (loginRes.status !== 200 || !loginData.token) {
    console.error('Gagal mendapatkan token JWT. Pengujian dihentikan.');
    process.exit(1);
  }

  const token = loginData.token;

  // Test 5: Akses Route Terproteksi (/api/auth/me) dengan Token
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const meData = await meRes.json();
  console.log('\n5. Akses /api/auth/me (Harus 200 & berisi detail user):', meRes.status, meData);

  // Test 6: Akses /api/auth/me tanpa Token (Harus 401)
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'GET'
  });
  const unauthData = await unauthRes.json();
  console.log('6. Akses /api/auth/me Tanpa Token (Harus 401):', unauthRes.status, unauthData);

  console.log('\n=== PENGUJIAN API AUTENTIKASI SELESAI ===');
}

runTests();
