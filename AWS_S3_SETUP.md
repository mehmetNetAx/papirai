# AWS S3 Yapılandırma Rehberi

Bu rehber, Papirai uygulaması için AWS S3 bucket yapılandırmasını adım adım açıklar.

## Ön Gereksinimler

- AWS hesabı
- `papirai-bucket` adında S3 bucket oluşturulmuş olmalı

## Adım 1: IAM Kullanıcısı Oluşturma

1. **AWS Console'a giriş yapın**
   - https://console.aws.amazon.com adresine gidin
   - AWS hesabınızla giriş yapın

2. **IAM servisine gidin**
   - Arama çubuğuna "IAM" yazın ve IAM servisini seçin
   - Sol menüden "Users" (Kullanıcılar) seçeneğine tıklayın

3. **Yeni kullanıcı oluşturun**
   - "Create user" (Kullanıcı oluştur) butonuna tıklayın
   - **User name:** `papirai-s3-user` (veya istediğiniz bir isim)
   - **Access type:** "Programmatic access" seçeneğini işaretleyin
   - "Next: Permissions" butonuna tıklayın

## Adım 2: IAM Policy Oluşturma

1. **Policy oluşturma sayfasına gidin**
   - "Attach policies directly" sekmesinde "Create policy" butonuna tıklayın
   - Yeni sekmede "JSON" sekmesine geçin

2. **Policy JSON'unu yapıştırın**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::papirai-bucket",
           "arn:aws:s3:::papirai-bucket/*"
         ]
       }
     ]
   }
   ```

3. **Policy'yi kaydedin**
   - "Next" butonuna tıklayın
   - **Policy name:** `PapiraiS3Policy` (veya istediğiniz bir isim)
   - **Description:** "Papirai S3 bucket access policy"
   - "Create policy" butonuna tıklayın

## Adım 3: Policy'yi Kullanıcıya Bağlama

1. **Kullanıcı oluşturma sayfasına geri dönün**
   - Tarayıcıda önceki sekmeye geri dönün
   - "Refresh" butonuna tıklayın (policy listesini yenilemek için)

2. **Policy'yi seçin**
   - Arama kutusuna "PapiraiS3Policy" yazın
   - Policy'yi seçin (checkbox'ı işaretleyin)
   - "Next" butonuna tıklayın

3. **Kullanıcıyı oluşturun**
   - "Create user" butonuna tıklayın

## Adım 4: Access Key ve Secret Key Alma

**ÖNEMLİ:** Bu adım sadece bir kez gösterilir! Keys'leri mutlaka kaydedin.

1. **Access Key ve Secret Key'i kopyalayın**
   - Sayfada gösterilen **Access key ID** ve **Secret access key** değerlerini kopyalayın
   - **Secret access key** sadece burada gösterilir, kaydetmezseniz tekrar oluşturmanız gerekir!

2. **Keys'leri güvenli bir yere kaydedin**
   - Not defteri veya password manager kullanın
   - Bu bilgileri kimseyle paylaşmayın!

## Adım 5: S3 Bucket Region'ını Kontrol Etme

1. **S3 Console'a gidin**
   - Arama çubuğuna "S3" yazın ve S3 servisini seçin
   - `papirai-bucket` bucket'ınızı bulun

2. **Region'ı not edin**
   - Bucket'ın yanında gösterilen region'ı not edin (örn: `us-east-1`, `eu-west-1`, `eu-central-1`)

## Adım 6: Environment Variables Ayarlama

### Yerel Geliştirme (.env dosyası)

1. **Proje kök dizininde `.env.local` dosyası oluşturun** (veya mevcut `.env` dosyasını düzenleyin)

2. **Aşağıdaki değişkenleri ekleyin:**
   ```env
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=papirai-bucket
   ```

3. **Değerleri değiştirin:**
   - `AWS_ACCESS_KEY_ID`: Adım 4'te aldığınız Access key ID
   - `AWS_SECRET_ACCESS_KEY`: Adım 4'te aldığınız Secret access key
   - `AWS_REGION`: Adım 5'te not ettiğiniz region (örn: `us-east-1`, `eu-west-1`)
   - `AWS_S3_BUCKET_NAME`: `papirai-bucket` (bucket adınız)

### Vercel Deployment

1. **Vercel Dashboard'a gidin**
   - https://vercel.com/dashboard
   - Projenizi seçin

2. **Settings > Environment Variables'a gidin**

3. **Aşağıdaki değişkenleri ekleyin:**
   - `AWS_ACCESS_KEY_ID` = (Adım 4'teki Access key ID)
   - `AWS_SECRET_ACCESS_KEY` = (Adım 4'teki Secret access key)
   - `AWS_REGION` = (Adım 5'teki region, örn: `us-east-1`)
   - `AWS_S3_BUCKET_NAME` = `papirai-bucket`

4. **Her değişken için scope seçin:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Deployment yapın**
   - Environment variables değişiklikleri sadece yeni deployment'larda aktif olur
   - "Deployments" sekmesinden yeni bir deployment tetikleyin

## Adım 7: Bucket Permissions Kontrolü (Opsiyonel)

Eğer bucket'ınız public erişime kapalıysa (önerilir), aşağıdaki ayarları yapın:

1. **S3 Console'da bucket'ınızı seçin**
2. **"Permissions" (İzinler) sekmesine gidin**
3. **"Block public access" ayarlarını kontrol edin**
   - Public erişim kapalı olmalı (güvenlik için)
   - Uygulama IAM credentials ile erişeceği için public erişim gerekmez

## Adım 8: Test Etme

1. **Development server'ı yeniden başlatın**
   ```bash
   npm run dev
   ```

2. **Sözleşme yükleme özelliğini test edin**
   - `/dashboard/contracts/new` sayfasına gidin
   - Bir Word veya PDF dosyası yükleyin
   - Console'da hata olmamalı
   - S3 bucket'ınızda dosyanın yüklendiğini kontrol edin

## Troubleshooting

### "Could not load credentials" Hatası

- ✅ `.env.local` dosyasının proje kök dizininde olduğundan emin olun
- ✅ Environment variable'ların doğru yazıldığından emin olun (typo yok mu?)
- ✅ Development server'ı yeniden başlattığınızdan emin olun
- ✅ Vercel'de environment variables'ların tüm environment'lar için işaretli olduğundan emin olun

### "Access Denied" Hatası

- ✅ IAM policy'nin doğru oluşturulduğundan emin olun
- ✅ Policy'nin kullanıcıya bağlı olduğundan emin olun
- ✅ Bucket adının doğru olduğundan emin olun (`AWS_S3_BUCKET_NAME`)

### "Bucket not found" Hatası

- ✅ Bucket adının doğru olduğundan emin olun
- ✅ Region'ın doğru olduğundan emin olun
- ✅ Bucket'ın mevcut olduğundan emin olun

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Access Key ve Secret Key'leri asla Git repository'ye commit etmeyin
- `.env.local` dosyasını `.gitignore`'a eklediğinizden emin olun
- Production'da IAM kullanıcısına sadece gerekli izinleri verin (principle of least privilege)
- Secret Key'leri düzenli olarak rotate edin (değiştirin)

## Ek Kaynaklar

- [AWS IAM Documentation](https://docs.aws.amazon.com/iam/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

