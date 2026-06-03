# Subly Managed Hosting Backend (Node.js + TypeScript + Prisma ORM)

Subly Managed Hosting adalah platform otomatisasi Web Hosting modern yang dirancang untuk mengintegrasikan manajemen siklus hidup aplikasi klien dengan hosting server panel (cPanel API). Backend ini merupakan hasil migrasi total dari arsitektur monolith PHP (Laravel) ke Modern Decoupled Stack berbasis **Node.js (TypeScript)**, **Express.js**, dan **Prisma ORM (MySQL)**.

---

## 🚀 Fitur Utama & Logika Bisnis

Sistem backend ini terbagi menjadi 7 modul utama (Sprint) yang saling terintegrasi:

1. **Autentikasi & Pelacakan Sesi (Sprint 2 & 7)**
   * Autentikasi aman berbasis JWT (JSON Web Token).
   * **Verifikasi Email**: Aktivasi akun setelah pendaftaran menggunakan link token JWT (berlaku 24 jam) yang dikirim via SMTP.
   * **Lupa Password**: Token reset acak 64 karakter dikirim ke email via SMTP, disimpan di tabel `password_reset_tokens` (berlaku 1 jam), dan otomatis dihapus setelah password diubah.
   * Pembatasan login (`403 Forbidden`) untuk akun tipe `Client` yang belum terverifikasi email.
   * Pelacakan keaktifan pengguna (`last_seen_at`) secara asinkron di database pada setiap permintaan API terautentikasi.

2. **Manajemen Billing & Kupon Promo (Sprint 3)**
   * Checkout sewa subdomain baru maupun perpanjangan durasi sewa (`renew`).
   * Penerapan voucher promo dengan tipe nominal tetap (`fixed`) maupun persentase (`percent` diskon hingga 100% gratis).
   * Sistem nominal transfer dengan kode unik 3 digit terakhir (`unique_code`) otomatis untuk membedakan transaksi.
   * Konfirmasi pembayaran manual oleh administrator, yang secara otomatis:
     * Mengaktifkan subdomain.
     * Mengatur tanggal kedaluwarsa (`expired_at`) sesuai durasi paket.
     * Mengirim notifikasi pesan selamat/konfirmasi otomatis ke obrolan live chat klien.

3. **Klaim & Provisioning Subdomain cPanel (Sprint 4)**
   * Alur claim slot pembayaran sukses untuk dihubungkan ke subdomain unik klien.
   * Pembuatan otomatis subdomain di server cPanel.
   * Pembuatan otomatis database MySQL baru & user MySQL baru dengan hak akses penuh (`ALL PRIVILEGES`).
   * Enkripsi kredensial database (`db_password`) menggunakan standar enkripsi `AES-256-CBC` yang kompatibel penuh dengan Laravel `Crypt::encrypt`.
   * Penulisan otomatis template landing page `index.html` default di Document Root cPanel.

4. **Sistem Deployment Terintegrasi (Sprint 5)**
   * **Manual ZIP Upload (Chunked)**: Mendukung pengunggahan file proyek berukuran besar secara bertahap (chunk) untuk menghindari limitasi payload HTTP, digabungkan otomatis setelah chunk terakhir diterima.
   * **Integrasi Git (GitHub)**: Menghubungkan repositori publik maupun privat (dengan token PAT) dan memicu auto-deploy instan.
   * **Validasi & Proteksi Keamanan**: Pemindaian file berbahaya (blacklist ekstensi `.exe`, `.bat`, `.sh`, dll. di luar `node_modules`/`vendor`).
   * **Pengecekan Kuota Disk**: Validasi sisa ruang penyimpanan proyek klien sebelum diekstrak di server.
   * **Sinkronisasi Lingkungan**: Penulisan otomatis berkas `.env` aplikasi klien.

5. **File Manager & Keamanan Transversal (Sprint 6)**
   * Menelusuri, membaca, dan menghapus file/folder klien di Document Root secara visual.
   * Proteksi Directory Traversal (`../`) menggunakan pemetaan path absolut aman (`safeResolvePath`).
   * Pencegahan penghapusan file konfigurasi kritis sistem (`.env` dan `.htaccess`).

6. **Support Ticket & Live Chat (Sprint 6)**
   * Pembuatan dan penanganan tiket keluhan klien (Support Ticket) dengan status `open`, `in_progress`, dan `resolved`.
   * Live chat interaktif klien-admin untuk bantuan teknis dengan dukungan lampiran unggahan gambar / screenshot menggunakan Multer.

---

## 🛠️ Tech Stack & Dependencies

* **Runtime**: Node.js (v18+)
* **Language**: TypeScript (tsconfig teroptimasi)
* **Framework**: Express.js
* **Database & ORM**: MySQL + Prisma Client (v5.x)
* **Email Client**: Nodemailer (SMTP/Mock Transport)
* **Validation**: Zod (Validasi payload & request body)
* **File Upload**: Multer (Unggah ZIP, chunk, dan chat image)
* **Security**: Bcrypt.js (kompatibel hash Laravel), jsonwebtoken, crypto (AES-256-CBC)

---

## ⚙️ Variabel Lingkungan (`.env`)

Salin berkas `.env.example` menjadi `.env` lalu sesuaikan kredensialnya:

```env
PORT=5000
DATABASE_URL="mysql://root:password@localhost:3306/sublymyi_main"
JWT_SECRET="ganti_dengan_jwt_secret_aman_dan_panjang"
JWT_EXPIRES_IN="30d"

# cPanel configuration
CPANEL_USER="username_cpanel_anda"
CPANEL_API_KEY="api_key_token_cpanel_anda"
CPANEL_API_URL="https://ip_atau_domain_cpanel:2083"
CPANEL_ROOT_DOMAIN="subly.my.id"

# SMTP Configuration (Ganti dengan kredensial email Anda)
SMTP_HOST="mail.subly.my.id"
SMTP_PORT=465
SMTP_USER="no-reply@subly.my.id"
SMTP_PASS="password_email_anda"
SMTP_FROM="Subly Managed Hosting <no-reply@subly.my.id>"
FRONTEND_URL="http://localhost:3000"
```

> 💡 **Mode Mock Email**: Jika `SMTP_USER` atau `SMTP_PASS` diisi dengan nilai default (`username`/`your_password_here`), sistem secara otomatis beralih ke **Mock Mode**. Email tidak akan dikirim secara fisik, melainkan dicatat ke console server dan tokennya disimpan di `uploads/last_sent_email.json` agar pengujian offline/lokal berjalan lancar.

---

## 🛠️ Instalasi & Pengembangan Lokal

Ikuti langkah-langkah di bawah ini untuk menjalankan backend di komputer lokal Anda:

1. **Instal Dependensi**:
   ```bash
   npm install
   ```

2. **Sinkronisasi Database**:
   Pastikan MySQL server lokal Anda aktif, buat database bernama `sublymyi_main`, sesuaikan `DATABASE_URL` di `.env`, lalu jalankan sinkronisasi skema:
   ```bash
   npx prisma db push
   ```

3. **Jalankan Developer Server**:
   ```bash
   npm run dev
   ```
   Server akan berjalan dan memantau perubahan berkas secara real-time di `http://localhost:5000`.

---

## 🧪 Skrip Pengujian Otomatis (Test Suite)

Kami menyediakan skrip pengujian otomatis komprehensif untuk menguji seluruh API secara mandiri tanpa menggunakan klien frontend:

* **Uji Autentikasi JWT**:
  ```bash
  npm run test:auth
  ```
* **Uji Siklus Transaksi Billing & Voucher**:
  ```bash
  npm run test:billing
  ```
* **Uji Klaim Subdomain & cPanel Provisioning**:
  ```bash
  npm run test:subdomain
  ```
* **Uji Upload ZIP Bertahap & Integrasi Git**:
  ```bash
  npm run test:deployment
  ```
* **Uji File Manager, Chat Gambar, & Tiket Bantuan**:
  ```bash
  npm run test:sprint6
  ```
* **Uji Verifikasi Email & Reset Password (SMTP)**:
  ```bash
  npm run test:email
  ```

---

## 🛡️ Panduan Menghubungkan Database Live cPanel

Jika Anda ingin menghubungkan aplikasi backend ini ke database MySQL live yang berada di cPanel Anda tanpa kehilangan data yang sudah ada:

1. **Amankan Data (Backup)**: Buka cPanel > masuk ke **phpMyAdmin** > pilih database Anda > klik tab **Export** > klik **Go** untuk mengunduh cadangan berkas `.sql`.
2. **Izinkan IP Anda (Remote MySQL)**: Masuk ke cPanel > cari menu **Remote MySQL** > masukkan IP publik komputer Anda > klik **Add Host**.
3. **Ubah Koneksi**: Update variabel `DATABASE_URL` di berkas `.env` dengan kredensial cPanel Anda:
   ```env
   DATABASE_URL="mysql://USER_DB:PASS_DB@IP_SERVER_CPANEL:3306/NAMA_DATABASE"
   ```
4. **Regenerasi Client**: Jalankan perintah di bawah ini untuk menyelaraskan tipe TypeScript dengan database live:
   ```bash
   npx prisma generate
   ```
   *(Jangan jalankan `db push` jika Anda tidak ingin melakukan modifikasi struktur database secara sengaja).*
5. Jalankan server Anda menggunakan `npm run dev` atau build untuk mode produksi!

---

## 📦 Build untuk Mode Produksi

Untuk melakukan kompilasi file TypeScript menjadi Javascript murni sebelum dideploy ke server cPanel/VPS:

1. **Kompilasi TypeScript**:
   ```bash
   npm run build
   ```
2. **Jalankan Aplikasi Hasil Build**:
   ```bash
   npm start
   ```
