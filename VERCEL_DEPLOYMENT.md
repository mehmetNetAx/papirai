# Vercel Deployment Guide

## Required Environment Variables

Vercel'de deployment yaparken aşağıdaki environment variables'ları ayarlamanız gerekmektedir:

### 1. Authentication
```
NEXTAUTH_SECRET=<your-secret-key>
NEXTAUTH_URL=https://your-domain.vercel.app
```

**NEXTAUTH_SECRET oluşturma:**
```bash
openssl rand -base64 32
```

### 2. Database
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### 3. Optional (Redis for background jobs)
```
REDIS_URL=redis://your-redis-url:6379
```

### 4. Optional (AWS Services)
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_S3_BUCKET=your-bucket-name
```

## Vercel'de Environment Variables Ayarlama

1. Vercel Dashboard'a gidin
2. Projenizi seçin
3. Settings > Environment Variables bölümüne gidin
4. Yukarıdaki tüm değişkenleri ekleyin
5. **KRİTİK:** Her birini Production, Preview ve Development için işaretleyin
6. **ÖNEMLİ:** Environment variables ekledikten veya değiştirdikten sonra mutlaka yeni bir deployment yapın

### Environment Variables Scope Kontrolü

Her environment variable'ın yanında scope gösterilir:
- ✅ **Production** - Production deployment'lar için
- ✅ **Preview** - Preview deployment'lar için  
- ✅ **Development** - Development deployment'lar için

**"All Environments" görünüyor olsa bile, her bir environment variable'ı tek tek kontrol edin:**
1. Environment variable'ın yanındaki üç nokta (⋯) menüsüne tıklayın
2. "Edit" seçeneğini seçin
3. Production, Preview ve Development checkbox'larının işaretli olduğundan emin olun
4. "Save" butonuna tıklayın

**ÖNEMLİ:** Environment variables değişiklikleri sadece yeni deployment'larda aktif olur. Değişiklik yaptıktan sonra mutlaka redeploy yapın!

## Troubleshooting 401 Errors

Eğer login sırasında 401 hatası alıyorsanız:

1. **NEXTAUTH_SECRET kontrolü:**
   - Vercel'de `NEXTAUTH_SECRET` environment variable'ının ayarlandığından emin olun
   - Secret key'in en az 32 karakter olduğundan emin olun

2. **MONGODB_URI kontrolü:**
   - MongoDB Atlas connection string'in doğru olduğundan emin olun
   - IP whitelist'te Vercel'in IP'lerinin olduğundan emin olun (veya 0.0.0.0/0 ekleyin)
   - Database kullanıcısının doğru izinlere sahip olduğundan emin olun

3. **NEXTAUTH_URL kontrolü:**
   - Production URL'inizin doğru olduğundan emin olun
   - HTTPS kullanıldığından emin olun

4. **User kontrolü:**
   - Kullanıcının veritabanında mevcut olduğundan emin olun
   - Kullanıcının `isActive: true` olduğundan emin olun
   - Şifrenin doğru olduğundan emin olun

## Log Kontrolü

Vercel'de log'ları kontrol etmek için:
1. Vercel Dashboard > Projeniz > Deployments
2. Son deployment'ı seçin
3. "Functions" sekmesine gidin
4. `/api/auth/[...nextauth]` endpoint'ini seçin
5. Log'ları kontrol edin

Log'larda şu mesajları arayın:
- `[Auth] Missing credentials` - Email veya şifre eksik
- `[Auth] NEXTAUTH_SECRET is not set` - Secret key eksik
- `[Auth] MONGODB_URI is not set` - Database URI eksik
- `[Auth] Database connection failed` - Database bağlantı hatası
- `[Auth] User not found` - Kullanıcı bulunamadı
- `[Auth] User is not active` - Kullanıcı aktif değil
- `[Auth] Invalid password` - Şifre yanlış

## Hızlı Kontrol Listesi

401 hatası alıyorsanız şunları kontrol edin:

1. ✅ **NEXTAUTH_SECRET** ayarlı mı? (en az 32 karakter)
2. ✅ **NEXTAUTH_URL** doğru mu? (production URL'iniz, örn: `https://your-app.vercel.app`)
3. ✅ **MONGODB_URI** doğru mu? (MongoDB Atlas connection string)
4. ✅ MongoDB Atlas Network Access'te `0.0.0.0/0` var mı?
5. ✅ Kullanıcı veritabanında mevcut mu?
6. ✅ Kullanıcının `isActive: true` olduğundan emin olun
7. ✅ Şifre doğru mu?

## Veritabanı Bağlantı Testi

### 1. Genel Veritabanı Durumu

Production'da veritabanı bağlantısını test etmek için:

1. Tarayıcınızda şu URL'yi açın:
   ```
   https://papirai.vercel.app/api/health/db
   ```

2. Response'da şunları kontrol edin:
   - `status: "ok"` - Endpoint çalışıyor
   - `environment.MONGODB_URI: true` - MongoDB URI ayarlı
   - `environment.NEXTAUTH_SECRET: true` - NextAuth secret ayarlı
   - `database.status: "connected"` - Veritabanı bağlantısı başarılı
   - `database.userCount` - Veritabanında kaç kullanıcı var
   - `users.sample` - Örnek kullanıcı listesi (email, name, role, isActive)

**Örnek başarılı response:**
```json
{
  "status": "ok",
  "environment": {
    "MONGODB_URI": true,
    "NEXTAUTH_SECRET": true,
    "NEXTAUTH_URL": "https://papirai.vercel.app",
    "NODE_ENV": "production"
  },
  "database": {
    "status": "connected",
    "userCount": 6,
    "activeUserCount": 6
  },
  "users": {
    "total": 6,
    "active": 6,
    "sample": [
      {
        "email": "admin@acme.com",
        "name": "System Admin",
        "role": "system_admin",
        "isActive": true
      }
    ]
  }
}
```

Eğer `database.status: "error"` görüyorsanız:
- MongoDB Atlas Network Access'te `0.0.0.0/0` ekleyin
- MongoDB connection string'in doğru olduğundan emin olun
- MongoDB kullanıcısının doğru izinlere sahip olduğundan emin olun

### 2. Belirli Bir Kullanıcıyı Test Etme

Belirli bir email ile kullanıcının var olup olmadığını test etmek için:

**cURL ile:**
```bash
curl -X POST https://papirai.vercel.app/api/health/test-login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme.com"}'
```

**Tarayıcıda (JavaScript Console):**
```javascript
fetch('https://papirai.vercel.app/api/health/test-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@acme.com' })
})
.then(r => r.json())
.then(console.log);
```

**Response örneği:**
```json
{
  "status": "success",
  "email": "admin@acme.com",
  "checks": {
    "environment": {
      "NEXTAUTH_SECRET": true,
      "MONGODB_URI": true,
      "NEXTAUTH_URL": true
    },
    "databaseConnection": "success",
    "userExists": true,
    "userFound": true,
    "userActive": true
  },
  "user": {
    "email": "admin@acme.com",
    "name": "System Admin",
    "role": "system_admin",
    "isActive": true,
    "hasPassword": true
  },
  "message": "User admin@acme.com found and is active. Ready for login."
}
```

**Hata durumları:**
- `"status": "error", "error": "User not found"` → Kullanıcı veritabanında yok
- `"status": "error", "error": "User is not active"` → Kullanıcı var ama aktif değil
- `"status": "error", "error": "Database connection failed"` → Veritabanı bağlantı hatası

## Adım Adım Sorun Giderme

### 1. Veritabanı Bağlantısını Kontrol Et

```bash
# Tarayıcıda veya curl ile
curl https://your-domain.vercel.app/api/health/db
```

Response örneği:
```json
{
  "status": "ok",
  "environment": {
    "MONGODB_URI": true,
    "NEXTAUTH_SECRET": true,
    "NEXTAUTH_URL": true,
    "NODE_ENV": "production"
  },
  "database": {
    "status": "connected",
    "error": null,
    "userCount": 6
  }
}
```

### 2. Vercel Log'larını Kontrol Et

1. Vercel Dashboard > Projeniz > Deployments
2. Son deployment'ı seçin
3. "Functions" sekmesine gidin
4. `/api/auth/[...nextauth]` endpoint'ini seçin
5. Login denemesi yapın ve log'ları izleyin

**Başarılı login log'ları:**
```
[Auth] Attempting login for: user@example.com
[Auth] Connecting to database...
[Auth] Database connection successful
[Auth] Searching for user: user@example.com
[Auth] User found: user@example.com, isActive: true, role: system_admin
[Auth] Verifying password...
[Auth] Password verified successfully
[Auth] Last login updated
[Auth] Login successful for user@example.com (took 234ms)
```

**Hata log'ları:**
- `[Auth] NEXTAUTH_SECRET is not set` → Vercel'de NEXTAUTH_SECRET ekleyin
- `[Auth] MONGODB_URI is not set` → Vercel'de MONGODB_URI ekleyin
- `[Auth] Database connection failed` → MongoDB Atlas ayarlarını kontrol edin
- `[Auth] User not found` → Kullanıcı veritabanında yok, seed script çalıştırın
- `[Auth] Invalid password` → Şifre yanlış

### 3. MongoDB Atlas Ayarları

1. **Network Access (KRİTİK - Bu adımı mutlaka yapın!):**
   
   **Adım 1:** MongoDB Atlas Dashboard'a gidin
   - https://cloud.mongodb.com/
   - Projenizi seçin
   
   **Adım 2:** Network Access sayfasına gidin
   - Sol menüden "Network Access" seçeneğine tıklayın
   - Veya: Security > Network Access
   
   **Adım 3:** IP Whitelist'e erişim ekleyin
   - "Add IP Address" butonuna tıklayın
   - Açılan pencerede iki seçenek var:
     
     **Seçenek A (Önerilen - En Kolay):**
     - "Allow Access from Anywhere" butonuna tıklayın
     - Bu otomatik olarak `0.0.0.0/0` ekler (tüm IP'lere izin verir)
     - "Confirm" butonuna tıklayın
     - ⚠️ **Not:** Bu güvenlik açısından riskli olabilir, ama Vercel gibi dinamik IP'li servisler için gereklidir
     
     **Seçenek B (Daha Güvenli - Manuel):**
     - "Add Current IP Address" butonuna tıklayın (sadece sizin IP'nizi ekler)
     - Veya manuel olarak `0.0.0.0/0` yazın
     - "Confirm" butonuna tıklayın
   
   **Adım 4:** Değişikliklerin aktif olmasını bekleyin
   - IP ekleme işlemi genellikle 1-2 dakika sürer
   - Status "Active" olana kadar bekleyin
   
   **Adım 5:** Test edin
   - Vercel'de `/api/health/db` endpoint'ini tekrar test edin
   - `database.status: "connected"` görmelisiniz

2. **Database User:**
   - MongoDB Atlas Dashboard > Database Access
   - Kullanıcının "Read and write to any database" iznine sahip olduğundan emin olun

3. **Connection String:**
   - MongoDB Atlas Dashboard > Database > Connect
   - "Connect your application" seçeneğini seçin
   - Connection string'i kopyalayın
   - Şifreyi ve database adını güncelleyin
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

### 4. Kullanıcı Oluşturma

Eğer veritabanında kullanıcı yoksa:

1. Local'de seed script'i çalıştırın:
   ```bash
   npm run seed
   ```

2. Veya MongoDB Atlas'ta manuel olarak kullanıcı oluşturun

3. Seed script'teki örnek kullanıcılar:
   - System Admin: `admin@acme.com` / `Admin123!`
   - Group Admin: `groupadmin@acme.com` / `Admin123!`
   - Company Admin: `admin@manufacturing.acme.com` / `Admin123!`

### 5. Environment Variables Yeniden Deploy

Environment variables ekledikten sonra:

1. Vercel Dashboard > Projeniz > Settings > Environment Variables
2. Tüm değişkenlerin doğru olduğundan emin olun
3. **ÖNEMLİ:** Yeni bir deployment tetikleyin (Redeploy)
4. Environment variables değişiklikleri sadece yeni deployment'larda aktif olur

## Test Endpoint (Development Only)

Development modunda environment variables'ı test etmek için:

```bash
# Terminal'de
node -e "console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET')"
node -e "console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET')"
```

**NOT:** Production'da bu komutları çalıştırmayın, sadece Vercel log'larını ve `/api/health/db` endpoint'ini kullanın.

