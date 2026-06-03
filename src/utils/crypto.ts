import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Laravel APP_KEY biasanya berupa string "base64:..." atau key langsung
const APP_KEY = process.env.APP_KEY || 'base64:d3VseV9qd3Rfc2VjcmV0X3N1cGVyX3NlY3VyZV9rZXlfMTIz';

function getEncryptionKey(): Buffer {
  let keyStr = APP_KEY;
  if (keyStr.startsWith('base64:')) {
    keyStr = keyStr.substring(7);
  }
  const keyBuffer = Buffer.from(keyStr, 'base64');
  if (keyBuffer.length === 32) {
    return keyBuffer;
  }
  // Fallback jika key tidak 32 bytes (misal dev key biasa)
  return crypto.createHash('sha256').update(APP_KEY).digest();
}

/**
 * Enkripsi string ke format JSON Base64 (kompatibel dengan Laravel Crypt)
 */
export function encryptString(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16 bytes untuk AES-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const ivBase64 = iv.toString('base64');

    // Buat MAC (HMAC-SHA256) untuk verifikasi integritas data (Laravel Style)
    // Laravel menghitung HMAC dari ivBase64 + encryptedBase64
    const mac = crypto
      .createHmac('sha256', key)
      .update(ivBase64 + encrypted)
      .digest('hex');

    const payloadObj = {
      iv: ivBase64,
      value: encrypted,
      mac: mac,
      tag: ''
    };

    return Buffer.from(JSON.stringify(payloadObj)).toString('base64');
  } catch (error: any) {
    throw new Error(`Gagal mengenkripsi data: ${error.message}`);
  }
}

/**
 * Dekripsi string dari format JSON Base64 Laravel
 */
export function decryptString(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const payloadJson = Buffer.from(encryptedData, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (!payload.iv || !payload.value || !payload.mac) {
      throw new Error('Format payload enkripsi tidak valid.');
    }

    const iv = Buffer.from(payload.iv, 'base64');
    
    // Validasi MAC untuk mencegah padding oracle attacks
    const calculatedMac = crypto
      .createHmac('sha256', key)
      .update(payload.iv + payload.value)
      .digest('hex');

    // Perbandingan waktu konstan untuk keamanan
    const macBuffer = Buffer.from(payload.mac, 'hex');
    const calculatedMacBuffer = Buffer.from(calculatedMac, 'hex');
    if (!crypto.timingSafeEqual(macBuffer, calculatedMacBuffer)) {
      throw new Error('MAC verification failed. Data telah dimanipulasi.');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(payload.value, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    throw new Error(`Gagal mendekripsi data: ${error.message}`);
  }
}
