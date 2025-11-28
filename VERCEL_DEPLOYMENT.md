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
5. Her birini Production, Preview ve Development için işaretleyin
6. Deploy'u yeniden yapın

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

