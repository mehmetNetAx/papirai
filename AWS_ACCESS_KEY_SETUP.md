# AWS Access Key Oluşturma Rehberi

CSV dosyanızda sadece konsol erişim bilgileri var. Uygulama için **Access Key** ve **Secret Key** oluşturmanız gerekiyor.

## Adım 1: IAM Console'a Giriş

1. **AWS Console'a gidin**
   - https://console.aws.amazon.com
   - CSV dosyanızdaki bilgilerle giriş yapabilirsiniz:
     - **Kullanıcı adı:** `papirai-s3-user`
     - **Parola:** CSV dosyasındaki parola
     - **Konsol URL:** CSV dosyasındaki URL

2. **IAM servisine gidin**
   - Arama çubuğuna "IAM" yazın
   - IAM servisini seçin

## Adım 2: Kullanıcıyı Bulma

1. **Sol menüden "Users" (Kullanıcılar) seçeneğine tıklayın**

2. **`papirai-s3-user` kullanıcısını bulun ve tıklayın**

## Adım 3: Access Key Oluşturma

1. **"Security credentials" (Güvenlik kimlik bilgileri) sekmesine tıklayın**

2. **"Access keys" bölümüne gidin**
   - Sayfayı aşağı kaydırın
   - "Access keys" bölümünü bulun

3. **"Create access key" butonuna tıklayın**

4. **Use case seçin**
   - "Application running outside AWS" seçeneğini seçin
   - "Next" butonuna tıklayın

5. **Description (opsiyonel)**
   - Açıklama ekleyebilirsiniz: "Papirai S3 Access"
   - "Create access key" butonuna tıklayın

## Adım 4: Access Key ve Secret Key'i Kaydetme

**⚠️ KRİTİK: Bu bilgiler sadece bir kez gösterilir!**

1. **Access Key ID ve Secret Access Key'i kopyalayın**
   - **Access key ID:** `AKIA...` ile başlayan değer
   - **Secret access key:** Uzun bir string (gizli tutulmalı)

2. **Keys'leri güvenli bir yere kaydedin**
   - Not defteri veya password manager
   - **Secret access key'i asla paylaşmayın!**

3. **"Download .csv file" butonuna tıklayın** (opsiyonel ama önerilir)
   - Bu dosyayı güvenli bir yerde saklayın

4. **"Done" butonuna tıklayın**

## Adım 5: Policy Kontrolü

Access Key oluşturduktan sonra, kullanıcının S3 bucket'a erişim izni olduğundan emin olun:

1. **Kullanıcı sayfasında "Permissions" (İzinler) sekmesine gidin**

2. **Policy'lerin listelendiğini kontrol edin**
   - `PapiraiS3Policy` (veya oluşturduğunuz policy adı) görünmeli
   - Eğer yoksa, "Add permissions" → "Attach policies directly" ile ekleyin

## Adım 6: Environment Variables Ayarlama

Artık Access Key ve Secret Key'iniz hazır! Bunları environment variables olarak ekleyin:

### Yerel Geliştirme (.env.local)

Proje kök dizininde `.env.local` dosyası oluşturun veya düzenleyin:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=papirai-bucket
```

**Değerleri değiştirin:**
- `AWS_ACCESS_KEY_ID`: Adım 4'te aldığınız Access key ID
- `AWS_SECRET_ACCESS_KEY`: Adım 4'te aldığınız Secret access key
- `AWS_REGION`: Bucket'ınızın region'ı (S3 Console'da kontrol edin)
- `AWS_S3_BUCKET_NAME`: `papirai-bucket`

### Vercel Deployment

1. Vercel Dashboard → Projeniz → Settings → Environment Variables
2. Aşağıdaki değişkenleri ekleyin:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET_NAME`
3. Her birini Production, Preview ve Development için işaretleyin
4. Yeni bir deployment yapın

## Test Etme

1. **Development server'ı yeniden başlatın**
   ```bash
   npm run dev
   ```

2. **Sözleşme yükleme özelliğini test edin**
   - `/dashboard/contracts/new` sayfasına gidin
   - Bir Word veya PDF dosyası yükleyin
   - Console'da hata olmamalı

3. **S3 bucket'ınızı kontrol edin**
   - S3 Console'da `papirai-bucket` bucket'ınıza gidin
   - `contracts/` klasörü altında yüklenen dosyayı görmelisiniz

## Sorun Giderme

### "Access Denied" Hatası

- ✅ Policy'nin kullanıcıya bağlı olduğundan emin olun
- ✅ Policy JSON'unda bucket adının doğru olduğundan emin olun
- ✅ Policy'de `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket` izinlerinin olduğundan emin olun

### "Invalid credentials" Hatası

- ✅ Access Key ID ve Secret Key'in doğru kopyalandığından emin olun
- ✅ Environment variable'ların doğru yazıldığından emin olun (typo yok mu?)
- ✅ Development server'ı yeniden başlattığınızdan emin olun

### Keys Gösterilmiyor

- ✅ IAM Console'da kullanıcı sayfasına gidin
- ✅ "Security credentials" sekmesine gidin
- ✅ "Access keys" bölümünde keys'lerinizi görebilirsiniz
- ⚠️ Secret key sadece oluşturulduğunda gösterilir, sonradan görülemez

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Access Key ve Secret Key'leri asla Git repository'ye commit etmeyin
- `.env.local` dosyasını `.gitignore`'a eklediğinizden emin olun
- Secret Key'leri düzenli olarak rotate edin (değiştirin)
- Keys'leri sadece gerekli yerlerde kullanın

