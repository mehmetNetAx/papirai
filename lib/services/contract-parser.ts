import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. Contract parsing will be disabled.');
}

// Trim API key to remove any whitespace
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

const genAI = geminiApiKey
  ? new GoogleGenerativeAI(geminiApiKey)
  : null;

export interface ParsedContractData {
  // Master variables
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  renewalDate?: string; // ISO date string
  contractValue?: number;
  currency?: string;
  counterparty?: string;
  contractType?: string;
  terminationPeriod?: number; // in days
  
  // Variables found in text (for ContractVariable creation)
  variables: Array<{
    name: string;
    description: string;
    type?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  }>;
  
  // Extracted text content (cleaned)
  content: string;
}

/**
 * Parse contract text using AI to extract master variables and variables
 */
export async function parseContractWithAI(
  contractText: string,
  contractTitle?: string
): Promise<ParsedContractData> {
  if (!genAI) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  try {
    // Create the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: 'Sen Türk hukuk sistemi için uzman bir sözleşme analiz uzmanısın. Sözleşme metinlerinden tarihler, tutarlar, taraflar ve değişkenleri çıkarırsın.',
    });

    // Build comprehensive parsing prompt
    const prompt = `Aşağıdaki sözleşme metnini analiz et ve tüm önemli bilgileri çıkar.

${contractTitle ? `Sözleşme Başlığı: ${contractTitle}\n\n` : ''}Sözleşme Metni:
${contractText}

GÖREVİN:
1. Sözleşmeden şu master bilgileri çıkar:
   - startDate: Başlangıç tarihi (ISO format: YYYY-MM-DD)
   - endDate: Bitiş tarihi (ISO format: YYYY-MM-DD)
   - renewalDate: Yenileme tarihi varsa (ISO format: YYYY-MM-DD)
   - contractValue: Sözleşme tutarı (sadece sayı, para birimi olmadan)
   - currency: Para birimi (TRY, USD, EUR, GBP, JPY, CHF gibi)
   - counterparty: Karşı taraf (şirket adı veya kişi adı)
   - contractType: Sözleşme tipi (Hizmet Sözleşmesi, Satış Sözleşmesi, Kira Sözleşmesi vb.)
   - terminationPeriod: Fesih süresi (gün cinsinden, eğer belirtilmişse)

2. Sözleşme metnindeki değişkenleri bul:
   - Değişkenler, metinde {{DeğişkenAdı}} formatında olabilir
   - Veya metinde tekrar eden, değiştirilebilir değerler olabilir (tarihler, tutarlar, isimler vb.)
   - Her değişken için:
     * name: Değişken adı (Türkçe karakterler olabilir, ancak kod için uygun format)
     * description: Değişkenin ne olduğunu açıklayan kısa açıklama
     * type: Değişken tipi (text, number, date, currency, percentage, boolean)

3. Metni temizle ve düzenle:
   - Gereksiz boşlukları temizle
   - Paragrafları koru
   - HTML formatına uygun hale getir

ÇIKTI FORMATI (JSON):
{
  "startDate": "2024-01-01" veya null,
  "endDate": "2024-12-31" veya null,
  "renewalDate": "2024-12-31" veya null,
  "contractValue": 100000 veya null,
  "currency": "TRY" veya null,
  "counterparty": "ABC Şirketi" veya null,
  "contractType": "Hizmet Sözleşmesi" veya null,
  "terminationPeriod": 30 veya null,
  "variables": [
    {
      "name": "Tutar",
      "description": "Sözleşme tutarı",
      "type": "currency"
    },
    {
      "name": "BaslangicTarihi",
      "description": "Sözleşme başlangıç tarihi",
      "type": "date"
    }
  ],
  "content": "Temizlenmiş ve düzenlenmiş sözleşme metni (HTML formatında)"
}

ÖNEMLİ NOTLAR:
- Tarihleri ISO formatında (YYYY-MM-DD) döndür
- Tutarları sadece sayı olarak döndür (para birimi ayrı)
- Para birimini standart kod olarak döndür (TRY, USD, EUR vb.)
- Değişken isimlerini kod için uygun formatta kullan (Türkçe karakterler olabilir ama boşluk yerine alt çizgi kullan)
- Eğer bir bilgi bulunamazsa null döndür
- content alanında metni HTML formatında döndür (paragraflar için <p> etiketleri kullan)

Sadece JSON formatında yanıt ver, başka açıklama ekleme.`;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    const processingTime = Date.now() - startTime;

    console.log(`Contract parsing completed in ${processingTime}ms`);

    // Parse JSON response
    let parsedData: ParsedContractData;
    try {
      // Remove markdown code blocks if present
      let jsonText = generatedText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error('AI parse yanıtı parse edilemedi. Lütfen tekrar deneyin.');
    }

    // Validate and normalize the result
    if (!parsedData) {
      throw new Error('AI parse yanıtı eksik veya geçersiz.');
    }

    // Ensure variables array exists
    if (!parsedData.variables) {
      parsedData.variables = [];
    }

    // Ensure content exists
    if (!parsedData.content) {
      parsedData.content = contractText;
    }

    // Validate dates
    const validateDate = (dateStr: string | null | undefined): string | undefined => {
      if (!dateStr) return undefined;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateStr}`);
        return undefined;
      }
      return dateStr;
    };

    parsedData.startDate = validateDate(parsedData.startDate);
    parsedData.endDate = validateDate(parsedData.endDate);
    parsedData.renewalDate = validateDate(parsedData.renewalDate);

    // Validate contract value
    if (parsedData.contractValue !== null && parsedData.contractValue !== undefined) {
      const value = typeof parsedData.contractValue === 'number' 
        ? parsedData.contractValue 
        : parseFloat(String(parsedData.contractValue));
      if (isNaN(value) || value < 0) {
        parsedData.contractValue = undefined;
      } else {
        parsedData.contractValue = value;
      }
    }

    // Validate termination period
    if (parsedData.terminationPeriod !== null && parsedData.terminationPeriod !== undefined) {
      const period = typeof parsedData.terminationPeriod === 'number'
        ? parsedData.terminationPeriod
        : parseInt(String(parsedData.terminationPeriod), 10);
      if (isNaN(period) || period < 0) {
        parsedData.terminationPeriod = undefined;
      } else {
        parsedData.terminationPeriod = period;
      }
    }

    return parsedData;
  } catch (error: any) {
    const errorMessage = error?.message || '';
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('API key') || errorMessage.includes('403')) {
      throw new Error('Gemini API key geçersiz veya yetkisiz. Lütfen .env dosyanızdaki GEMINI_API_KEY değerini kontrol edin.');
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      throw new Error('Gemini model bulunamadı. API key\'inizin doğru izinlere sahip olduğundan emin olun.');
    }

    throw error;
  }
}

