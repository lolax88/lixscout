# Lixscout Hostinger API Setup Guide

## 📋 Yang Dibutuhkan
- Hostinger hosting (yang ada MySQL)
- Akses ke Hostinger hPanel
- FTP atau File Manager

---

## 🗄️ Step 1: Buat Database di Hostinger

1. Login **Hostinger hPanel**
2. Klik **"MySQL Databases"** (di sidebar)
3. Klik **"Create Database"**
4. Isi:
   - **Database Name**: `lixscout`
   - **Username**: `lixscout_api` (atau sesuai keinginan)
   - **Password**: bikin password kuat!
5. Klik **"Create"**
6. **CATAT** info ini:
   ```
   Host: localhost
   Database: u123456789_lixscout
   Username: u123456789_lixscout_api
   Password: [password yang lo bikin]
   ```
   *(Angka `u123456789` itu prefix Hostinger, beda-beda)*

---

## 📝 Step 2: Import Schema SQL

1. Klik **"phpMyAdmin"** di hPanel
2. Pilih database `lixscout` yang baru dibuat
3. Klik tab **"SQL"**
4. Copy-paste isi file `schema.sql`
5. Klik **"Go"** (Execute)
6. Pastikan 3 tabel terbuat: `claims`, `reviews`, `settings`

---

## 📁 Step 3: Upload PHP Files

### Opsi A: File Manager (Gampang)
1. Buka **File Manager** di hPanel
2. Masuk ke folder `public_html/api/` (buat folder `api` kalau belum)
3. Upload semua file PHP + .htaccess:
   - `db.php`
   - `claim.php`
   - `review.php`
   - `reviews.php`
   - `.htaccess`

### Opsi B: FTP
```bash
# Pakai FileZilla atau WinSCP
Host: ftp.lixscout.com
Username: [Hostinger FTP username]
Password: [Hostinger FTP password]
Port: 21

# Upload ke: /public_html/api/
```

---

## ⚙️ Step 4: Edit Konfigurasi Database

1. Buka `db.php` di File Manager (atau download edit lalu upload)
2. Ganti 4 nilai di bagian atas:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'u123456789_lixscout');    // ← Ganti!
   define('DB_USER', 'u123456789_lixscout_api'); // ← Ganti!
   define('DB_PASS', 'PASSWORD_LO');             // ← Ganti!
   ```
3. Save

---

## 🧪 Step 5: Test API

Buka browser, akses:
```
https://lixscout.com/api/reviews.php
```

Kalau muncul JSON seperti ini = **BERHASIL!** ✅
```json
{
  "success": true,
  "reviews": [],
  "total": 0,
  "avg_rating": 0
}
```

Kalau error = cek:
- Database credentials bener gak?
- File PHP ke-upload ke folder yang bener?
- .htaccess ke-upload?

---

## 🌐 Step 6: Subdomain Setup (Opsional)

Kalau lo mau API di subdomain `api.lixscout.com`:

1. Di Hostinger → **Subdomains**
2. Buat: `api.lixscout.com`
3. Point ke folder `/public_html/api/`
4. Upload file PHP ke situ

Atau... langsung aja di `lixscout.com/api/` (lebih gampang).

---

## 📊 Monitoring: Lihat Data

### Lihat semua email yang claim:
```sql
SELECT email, discount_percent, has_reviewed, claimed_at 
FROM claims 
ORDER BY claimed_at DESC;
```

### Lihat semua review:
```sql
SELECT reviewer_name, rating, review_text, created_at 
FROM reviews 
WHERE is_approved = 1 
ORDER BY created_at DESC;
```

### Lihat siapa yang BELUM review (buat kirim kupon event):
```sql
SELECT email, claimed_at 
FROM claims 
WHERE has_reviewed = 0 
ORDER BY claimed_at DESC;
```

### Statistik:
```sql
SELECT 
  (SELECT COUNT(*) FROM claims) as total_claims,
  (SELECT COUNT(*) FROM reviews) as total_reviews,
  (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE is_approved = 1) as avg_rating,
  (SELECT COUNT(*) FROM claims WHERE has_reviewed = 0) as pending_reviews;
```

---

## 🔒 Security Notes

- ✅ Password di-db.php JANGAN di-share
- ✅ File .sql di-block sama .htaccess
- ✅ CORS hanya allow lixscout.com
- ✅ Prepared statements (anti SQL injection)
- ✅ Input validation di semua endpoint

---

## 🎁 Bonus: Kirim Kupon ke Reviewers

Waktunya event, jalankan query ini di phpMyAdmin:
```sql
SELECT email 
FROM claims 
WHERE has_reviewed = 1 
ORDER BY claimed_at;
```

Export ke CSV → upload ke email marketing → blast kupon diskon!
