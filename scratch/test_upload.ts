import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'client@subly.net',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Token acquired:', token.substring(0, 15) + '...');

    // 2. Prepare mock proof file
    const filePath = path.join(process.cwd(), 'scratch/test_receipt.png');
    // Create a tiny dummy png file if not exists
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'dummy png content');
    }

    // 3. Send upload request
    const form = new FormData();
    form.append('proof', fs.createReadStream(filePath), {
      filename: 'test_receipt.png',
      contentType: 'image/png',
    });

    console.log('Sending proof file upload request to /api/payments/14/proof ...');
    const response = await axios.post('http://localhost:5000/api/payments/14/proof', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Upload success response:', response.data);
  } catch (error: any) {
    if (error.response) {
      console.error('Error response from server:', error.response.status, error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

run();
