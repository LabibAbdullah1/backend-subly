import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000/api';
const UPLOADS_DIR = 'e:/backup/DATA LABIB/PROJECT BISNIS/subly-JS/backend/uploads';

async function runTest() {
    const email = 'test_reset@subly.my.id';
    const name = 'Test Reset User';
    const password = 'old_password_123';
    const newPassword = 'new_password_abc_999';

    console.log('--- Phase 1: Clean Up Test User ---');
    const deleteRes = await fetch(`${API_BASE}/auth/temp-delete-user?email=${encodeURIComponent(email)}`);
    const deleteData = await deleteRes.json();
    console.log('Delete result:', deleteData);

    console.log('\n--- Phase 2: Register User ---');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, password_confirmation: password })
    });
    const regData = await regRes.json();
    console.log('Register result:', regData);

    if (!regData.success) {
        throw new Error('Register failed: ' + JSON.stringify(regData));
    }

    // Wait a moment for file write
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n--- Phase 3: Check Verification Email Link ---');
    const emailFile = path.join(UPLOADS_DIR, 'last_sent_email.json');
    if (!fs.existsSync(emailFile)) {
        throw new Error('last_sent_email.json not found in ' + UPLOADS_DIR);
    }
    let emailData = JSON.parse(fs.readFileSync(emailFile, 'utf8'));
    console.log('Last sent email details:', {
        to: emailData.to,
        subject: emailData.subject,
        token: emailData.token ? emailData.token.substring(0, 15) + '...' : 'none'
    });

    // Verify email using the token
    console.log('\n--- Phase 4: Verify Email via Endpoint ---');
    const verifyRes = await fetch(`${API_BASE}/auth/verify-email?token=${emailData.token}`);
    const verifyData = await verifyRes.json();
    console.log('Verify email result:', verifyData);

    console.log('\n--- Phase 5: Request Forgot Password Link ---');
    const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const forgotData = await forgotRes.json();
    console.log('Forgot password result:', forgotData);

    // Wait a moment for file write
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n--- Phase 6: Check Forgot Password Email Link ---');
    emailData = JSON.parse(fs.readFileSync(emailFile, 'utf8'));
    console.log('Forgot email token:', emailData.token);

    console.log('\n--- Phase 7: Reset Password ---');
    const resetRes = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            token: emailData.token,
            password: newPassword,
            password_confirmation: newPassword
        })
    });
    const resetData = await resetRes.json();
    console.log('Reset password result:', resetData);

    console.log('\n--- Phase 8: Verify Login with New Password ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword })
    });
    const loginData = await loginRes.json();
    console.log('Login result with new password:', {
        success: !!loginData.token,
        role: loginData.role,
        tokenPreview: loginData.token ? loginData.token.substring(0, 15) + '...' : 'none'
    });
}

runTest().catch(console.error);

