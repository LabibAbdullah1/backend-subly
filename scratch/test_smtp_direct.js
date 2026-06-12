import { sendResetPasswordEmail } from '../src/services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Sending direct reset password email...');
  const start = Date.now();
  try {
    await sendResetPasswordEmail('labibabdullahhasan@gmail.com', 'Labib Abdullah', 'test-token-123456');
    console.log(`Success! Completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

run();
