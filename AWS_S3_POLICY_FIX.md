# AWS S3 IAM Policy Düzeltme Rehberi

S3 yükleme hatası alıyorsunuz. IAM policy'nizi güncellemeniz gerekiyor.

## Hata Mesajı

```
User: arn:aws:iam::339712881446:user/papirai-s3-user is not authorized to perform: s3:PutObject on resource: "arn:aws:s3:::papirai-bucket/contracts/..."
```

Bu hata, IAM policy'nizin `s3:PutObject` iznini içermediğini veya yanlış resource path'ine sahip olduğunu gösterir.

## Çözüm: IAM Policy'yi Güncelleme

### Adım 1: IAM Console'a Gidin

1. **AWS Console'a giriş yapın**
   - https://console.aws.amazon.com
   - IAM servisine gidin

2. **Policy'yi bulun**
   - Sol menüden "Policies" (Politikalar) seçeneğine tıklayın
   - `PapiraiS3Policy` (veya oluşturduğunuz policy adı) policy'sini bulun ve tıklayın

### Adım 2: Policy'yi Düzenleyin

1. **"Edit policy" (Politikayı düzenle) butonuna tıklayın**

2. **"JSON" sekmesine geçin**

3. **Aşağıdaki policy JSON'unu yapıştırın:**

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

**ÖNEMLİ:** 
- `papirai-bucket` yerine kendi bucket adınızı kullanın
- Her iki resource da gerekli:
  - `arn:aws:s3:::papirai-bucket` - ListBucket için
  - `arn:aws:s3:::papirai-bucket/*` - PutObject, GetObject, DeleteObject için

4. **"Next" butonuna tıklayın**

5. **"Save changes" (Değişiklikleri kaydet) butonuna tıklayın**

### Adım 3: Policy'nin Kullanıcıya Bağlı Olduğundan Emin Olun

1. **IAM → Users → `papirai-s3-user` kullanıcısına gidin**

2. **"Permissions" (İzinler) sekmesine tıklayın**

3. **Policy'nin listelendiğini kontrol edin**
   - `PapiraiS3Policy` görünmeli
   - Eğer yoksa, "Add permissions" → "Attach policies directly" ile ekleyin

### Adım 4: Test Edin

1. **Development server'ı yeniden başlatın** (gerekirse)
   ```bash
   npm run dev
   ```

2. **Sözleşme eklerini test edin**
   - Bir sözleşme detay sayfasına gidin
   - "Ekler ve Dokümanlar" bölümünden bir dosya yüklemeyi deneyin

## Alternatif: Daha Kısıtlayıcı Policy (Önerilir)

Eğer daha güvenli bir policy istiyorsanız, sadece gerekli path'lere izin verebilirsiniz:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::papirai-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "contracts/*"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::papirai-bucket/contracts/*"
    }
  ]
}
```

Bu policy sadece `contracts/` klasörü altındaki dosyalara erişim verir.

## Sorun Giderme

### Hala "Access Denied" Hatası Alıyorsanız

1. **Policy'nin kaydedildiğinden emin olun**
   - Policy sayfasında "Last modified" tarihini kontrol edin

2. **Kullanıcının policy'ye bağlı olduğundan emin olun**
   - Users → `papirai-s3-user` → Permissions
   - Policy listede görünmeli

3. **Bucket adını kontrol edin**
   - Policy'deki bucket adı gerçek bucket adınızla eşleşmeli
   - Büyük/küçük harf duyarlı

4. **IAM değişikliklerinin yayılması için birkaç dakika bekleyin**
   - IAM değişiklikleri bazen birkaç dakika sürebilir

5. **Access Key'leri kontrol edin**
   - Doğru Access Key ve Secret Key kullanıldığından emin olun
   - `.env.local` dosyasını kontrol edin

### Policy JSON Formatı Kontrolü

Policy JSON'unuzun geçerli olduğundan emin olun:
- Tüm tırnak işaretleri doğru olmalı
- Virgüller doğru yerde olmalı
- Köşeli parantezler eşleşmeli

## Test Komutu

AWS CLI ile test edebilirsiniz (opsiyonel):

```bash
aws s3 cp test.txt s3://papirai-bucket/contracts/test.txt --profile your-profile
```

Eğer bu komut çalışırsa, policy doğru çalışıyor demektir.

