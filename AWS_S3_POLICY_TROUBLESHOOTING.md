# AWS S3 Policy Sorun Giderme - Detaylı Kontrol Listesi

Hala "Access Denied" hatası alıyorsanız, aşağıdaki adımları sırayla kontrol edin.

## Adım 1: Policy İçeriğini Kontrol Edin

### IAM Console'da Policy'yi Kontrol Edin

1. **IAM → Policies → `PapiraiS3Policy`**
2. **"JSON" sekmesine gidin**
3. **Policy'nin tam olarak şu şekilde olduğundan emin olun:**

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

**Kritik Kontroller:**
- ✅ `s3:PutObject` action'ı listede olmalı
- ✅ `arn:aws:s3:::papirai-bucket/*` resource'u olmalı (wildcard ile)
- ✅ Bucket adı doğru olmalı (`papirai-bucket`)
- ✅ Her iki resource da olmalı (bucket ve bucket/*)

## Adım 2: Policy'nin Kullanıcıya Bağlı Olduğunu Doğrulayın

1. **IAM → Users → `papirai-s3-user`**
2. **"Permissions" (İzinler) sekmesine gidin**
3. **Policy listesinde `PapiraiS3Policy` görünmeli**

**Eğer yoksa:**
- "Add permissions" → "Attach policies directly"
- `PapiraiS3Policy`'yi arayın ve seçin
- "Add permissions" butonuna tıklayın

## Adım 3: Inline Policy Olarak Ekleme (Alternatif Çözüm)

Eğer managed policy çalışmıyorsa, inline policy olarak ekleyebilirsiniz:

1. **IAM → Users → `papirai-s3-user`**
2. **"Permissions" sekmesine gidin**
3. **"Add permissions" → "Create inline policy"**
4. **"JSON" sekmesine geçin**
5. **Aşağıdaki policy'yi yapıştırın:**

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

6. **"Next" → Policy name: `PapiraiS3InlinePolicy` → "Create policy"**

## Adım 4: Policy Versiyonunu Kontrol Edin

1. **IAM → Policies → `PapiraiS3Policy`**
2. **"Policy versions" sekmesine gidin**
3. **En son versiyonun "Default" olarak işaretli olduğundan emin olun**
4. **Eğer değilse, en son versiyonu "Set as default" yapın**

## Adım 5: Bucket Adını Doğrulayın

1. **S3 Console → Buckets**
2. **Bucket adınızı not edin** (tam olarak)
3. **Policy'deki bucket adının aynı olduğundan emin olun**
   - Büyük/küçük harf duyarlı
   - Tire, alt çizgi gibi karakterler doğru olmalı

## Adım 6: IAM Değişikliklerinin Yayılmasını Bekleyin

IAM değişiklikleri bazen 1-5 dakika sürebilir. Bekleyin ve tekrar deneyin.

## Adım 7: Access Key'leri Yeniden Kontrol Edin

1. **`.env.local` dosyanızı kontrol edin:**
   ```env
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=papirai-bucket
   ```

2. **Access Key'in doğru kullanıcıya ait olduğundan emin olun:**
   - IAM → Users → `papirai-s3-user` → Security credentials
   - Access keys listesinde kullandığınız key görünmeli

## Adım 8: Test - AWS CLI ile (Opsiyonel)

AWS CLI yüklüyse, doğrudan test edebilirsiniz:

```bash
# Environment variables'ları set edin
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1

# Test dosyası oluşturun
echo "test" > test.txt

# S3'e yükleyin
aws s3 cp test.txt s3://papirai-bucket/contracts/test.txt

# Başarılı olursa, policy çalışıyor demektir
```

## Adım 9: Policy'yi Sıfırdan Oluşturma

Eğer hiçbir şey işe yaramazsa, policy'yi sıfırdan oluşturun:

1. **Mevcut policy'yi silin** (eğer sorun yoksa atlayın)
2. **Yeni policy oluşturun:**
   - IAM → Policies → "Create policy"
   - JSON sekmesine geçin
   - Yukarıdaki policy JSON'unu yapıştırın
   - Policy name: `PapiraiS3PolicyV2`
   - "Create policy"
3. **Kullanıcıya bağlayın:**
   - Users → `papirai-s3-user` → Permissions
   - "Add permissions" → "Attach policies directly"
   - `PapiraiS3PolicyV2`'yi seçin

## Adım 10: Development Server'ı Yeniden Başlatın

Policy değişikliklerinden sonra:

```bash
# Server'ı durdurun (Ctrl+C)
# Yeniden başlatın
npm run dev
```

## Yaygın Hatalar

### Hata 1: Policy'de sadece bucket ARN var, `/*` yok
```json
// ❌ YANLIŞ
"Resource": ["arn:aws:s3:::papirai-bucket"]

// ✅ DOĞRU
"Resource": [
  "arn:aws:s3:::papirai-bucket",
  "arn:aws:s3:::papirai-bucket/*"
]
```

### Hata 2: Action listesinde `s3:PutObject` yok
```json
// ❌ YANLIŞ
"Action": ["s3:GetObject", "s3:DeleteObject"]

// ✅ DOĞRU
"Action": [
  "s3:PutObject",
  "s3:GetObject",
  "s3:DeleteObject",
  "s3:ListBucket"
]
```

### Hata 3: Bucket adı yanlış
```json
// ❌ YANLIŞ (bucket adı farklı)
"Resource": ["arn:aws:s3:::papirai-bucket-2/*"]

// ✅ DOĞRU (gerçek bucket adı)
"Resource": ["arn:aws:s3:::papirai-bucket/*"]
```

## Hızlı Test

Policy'yi güncelledikten sonra:

1. **5 dakika bekleyin** (IAM propagation)
2. **Development server'ı yeniden başlatın**
3. **Dosya yüklemeyi tekrar deneyin**

## Hala Çalışmıyorsa

1. **AWS Support'a başvurun** (eğer AWS hesabınızda destek varsa)
2. **Yeni bir IAM kullanıcısı oluşturun** ve yeni Access Key alın
3. **Bucket permissions'ı kontrol edin** (bucket level permissions)

## Policy Doğrulama

Policy'nizin doğru olduğundan emin olmak için AWS Policy Simulator kullanabilirsiniz:

1. **IAM → Policies → `PapiraiS3Policy`**
2. **"Policy simulator" butonuna tıklayın**
3. **Test edin:**
   - User: `papirai-s3-user`
   - Action: `s3:PutObject`
   - Resource: `arn:aws:s3:::papirai-bucket/contracts/test.txt`
4. **"Run simulation"** - "Allowed" görünmeli

