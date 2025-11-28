# Master Değişkenler Kullanım Kılavuzu

## Genel Bakış

Master değişkenler, sözleşmelerin kritik bilgilerini yönetmek ve otomatik uyarılar oluşturmak için kullanılan özel değişkenlerdir. Bu değişkenler raporlama, dashboard ve otomatik uyarı sistemleri tarafından kullanılır.

## Master Değişken Tipleri

### 1. **endDate** - Bitiş Tarihi
Sözleşmenin bitiş tarihi. Bu tarih yaklaştığında otomatik uyarılar oluşturulur.

### 2. **startDate** - Başlangıç Tarihi
Sözleşmenin başlangıç tarihi.

### 3. **terminationPeriod** - Fesih Süresi
Fesih için gerekli süre (gün cinsinden). Örneğin: 30 gün.

### 4. **terminationDeadline** - Fesih İçin Son Tarih
Fesih için son tarih. Bu tarih `endDate - terminationPeriod` formülü ile otomatik hesaplanabilir.

### 5. **contractValue** - Sözleşme Tutarı
Sözleşmenin toplam değeri. Dashboard'da toplam değer hesaplamalarında kullanılır.

### 6. **currency** - Para Birimi
Sözleşme para birimi (TRY, USD, EUR, vb.).

### 7. **renewalDate** - Yenileme Tarihi
Sözleşme yenileme tarihi.

### 8. **counterparty** - Karşı Taraf
Sözleşme karşı tarafı.

### 9. **contractType** - Sözleşme Tipi
Sözleşme tipi/kategorisi.

### 10. **other** - Diğer
Diğer master değişkenler için.

## Kullanım Senaryoları

### Senaryo 1: Master Değişken Atama (UI)

1. Sözleşme detay sayfasına gidin (`/dashboard/contracts/[id]`)
2. "Ana Değişkenler (Master Variables)" kartını bulun
3. "Master Değişken Ekle" butonuna tıklayın
4. Master değişken tipini seçin (örn: "Bitiş Tarihi")
5. Değeri girin (tarih için: YYYY-MM-DD formatında)
6. "Kaydet" butonuna tıklayın

### Senaryo 2: Mevcut Değişkeni Master Yapma

1. Sözleşme editöründe değişkenler panelini açın
2. Bir değişkeni düzenleyin
3. "Master Değişken" seçeneğini işaretleyin
4. Master tipini seçin
5. Kaydedin

### Senaryo 3: API ile Master Değişken Atama

```typescript
// Master değişken ayarlama
const response = await fetch(`/api/contracts/${contractId}/master-variables`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    masterType: 'endDate',
    value: '2024-12-31', // Tarih formatı
  }),
});
```

### Senaryo 4: Master Değişkenleri Okuma

```typescript
// Master değişkenleri getirme
const response = await fetch(`/api/contracts/${contractId}/master-variables`);
const data = await response.json();

console.log(data.masterVariables); // Master değişkenler
console.log(data.computed); // Hesaplanan değerler (örn: terminationDeadline)
```

### Senaryo 5: Deadline Kontrolü

#### Manuel Kontrol (UI)
1. Dashboard'a gidin
2. "Deadline Kontrolü ve Uyarılar" kartını bulun
3. "Kontrol Et" butonuna tıklayın
4. Sistem tüm sözleşmeleri kontrol eder ve uyarılar oluşturur

#### API ile Kontrol
```typescript
const response = await fetch('/api/contracts/master-variables/check-deadlines', {
  method: 'POST',
});
```

#### Otomatik Kontrol (Cron Job)
```typescript
// lib/jobs/master-variables.ts dosyasını kullanarak
import { runMasterVariablesDeadlineCheck } from '@/lib/jobs/master-variables';

// Günlük çalışacak şekilde ayarlayın (örn: node-cron ile)
cron.schedule('0 9 * * *', async () => {
  await runMasterVariablesDeadlineCheck();
});
```

### Senaryo 6: Dikkat Gerektiren Sözleşmeleri Listeleme

```typescript
// Dikkat gerektiren sözleşmeleri getirme
const response = await fetch('/api/contracts/master-variables/attention');
const data = await response.json();

console.log(data.contracts); // Uyarı gerektiren sözleşmeler
```

## Otomatik Uyarı Sistemi

Sistem aşağıdaki durumlarda otomatik uyarılar oluşturur:

### 1. Bitiş Tarihi Uyarıları
- **30 gün kala**: Uyarı seviyesi bildirimi
- **7 gün kala**: Kritik seviye bildirimi
- **Süresi doldu**: Süresi doldu bildirimi

### 2. Fesih Son Tarihi Uyarıları
- **30 gün kala**: Uyarı seviyesi bildirimi
- **7 gün kala**: Kritik seviye bildirimi
- **Geçti**: Fesih son tarihi geçti bildirimi

### Bildirim Türleri
- **In-app bildirimler**: Dashboard'da görüntülenir
- **Email bildirimleri**: Kullanıcıya email gönderilir

## Dashboard Entegrasyonu

Master değişkenler dashboard'da şu şekilde kullanılır:

1. **Toplam Sözleşme Değeri**: `contractValue` master değişkenlerinden hesaplanır
2. **Yakında Sona Erecek**: `endDate` master değişkenlerine göre filtrelenir
3. **Dikkat Gerektiren Sözleşmeler**: Master değişkenlere göre uyarılar gösterilir

## Best Practices

1. **Her sözleşme için en az bir master değişken tanımlayın**
   - Özellikle `endDate` ve `contractValue` önemlidir

2. **Fesih süresi için `terminationPeriod` kullanın**
   - Sistem otomatik olarak `terminationDeadline` hesaplar

3. **Düzenli deadline kontrolü yapın**
   - Günlük otomatik kontrol kurun
   - Manuel kontrol de yapabilirsiniz

4. **Master değişkenleri güncel tutun**
   - Sözleşme değişikliklerinde master değişkenleri de güncelleyin

## Sorun Giderme

### Master değişken görünmüyor
- Sözleşme detay sayfasını yenileyin
- API yanıtını kontrol edin: `/api/contracts/[id]/master-variables`

### Deadline kontrolü çalışmıyor
- API endpoint'ini kontrol edin: `/api/contracts/master-variables/check-deadlines`
- Cron job'un çalıştığından emin olun
- Log dosyalarını kontrol edin

### Uyarılar gelmiyor
- Email ayarlarını kontrol edin (SMTP)
- Notification modelini kontrol edin
- Master değişkenlerin doğru tanımlandığından emin olun

## API Referansı

### GET `/api/contracts/[id]/master-variables`
Master değişkenleri getirir.

**Response:**
```json
{
  "masterVariables": [...],
  "computed": {
    "terminationDeadline": "2024-11-30"
  }
}
```

### POST `/api/contracts/[id]/master-variables`
Master değişken ayarlar.

**Body:**
```json
{
  "masterType": "endDate",
  "value": "2024-12-31",
  "name": "Özel İsim" // Opsiyonel, sadece "other" tipi için
}
```

### DELETE `/api/contracts/[id]/master-variables?masterType=endDate`
Master değişken durumunu kaldırır.

### GET `/api/contracts/master-variables/attention`
Dikkat gerektiren sözleşmeleri getirir.

### POST `/api/contracts/master-variables/check-deadlines`
Deadline kontrolünü manuel tetikler.

