import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. AI contract generation will be disabled.');
}

// Trim API key to remove any whitespace
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

const genAI = geminiApiKey
  ? new GoogleGenerativeAI(geminiApiKey)
  : null;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!genAI) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { contractType, description, additionalDetails, language = 'tr' } = body;

    if (!contractType || !description) {
      return NextResponse.json(
        { error: 'contractType and description are required' },
        { status: 400 }
      );
    }

    // Create the model - using gemini-2.5-pro (confirmed working)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: 'Sen Türk hukuk sistemi için uzman bir sözleşme uzmanısın. Profesyonel, yasal olarak geçerli ve detaylı sözleşme metinleri oluşturursun.',
    });

    // Build the prompt with variable definitions
    const prompt = `Sen bir sözleşme uzmanısın. Aşağıdaki bilgilere göre profesyonel bir sözleşme metni oluştur.

Sözleşme Türü: ${contractType}
Açıklama: ${description}
${additionalDetails ? `Ek Detaylar: ${additionalDetails}` : ''}

ÖNEMLİ KURALLAR:
1. Sözleşme metnini HTML formatında oluştur (p, h1, h2, h3, ul, li, strong, em gibi etiketler kullan)
2. Kritik değişkenleri {{DeğişkenAdı}} formatında tanımla. Örneğin:
   - {{CompanyName}} - Şirket adı
   - {{ContractDate}} - Sözleşme tarihi
   - {{ContractValue}} - Sözleşme değeri
   - {{PaymentTerms}} - Ödeme koşulları
   - {{DeliveryDate}} - Teslimat tarihi
   - {{NoticePeriod}} - Bildirim süresi
   - {{TerminationDate}} - Fesih tarihi
   - {{PenaltyAmount}} - Ceza tutarı
   - {{Jurisdiction}} - Yargı yetkisi
   - {{DisputeResolution}} - Uyuşmazlık çözümü
3. Sözleşme metninde bu değişkenleri uygun yerlerde kullan
4. Sözleşme metni Türkçe olmalı (dil: ${language})
5. Sözleşme yasal olarak geçerli ve profesyonel bir dil kullanmalı
6. Sözleşme şu bölümleri içermeli:
   - Başlık
   - Taraflar
   - Tanımlar
   - Ana hükümler
   - Ödeme koşulları
   - Teslimat/İfa koşulları
   - Fesih koşulları
   - Uyuşmazlık çözümü
   - Yürürlük tarihi
   - İmza bölümü

Sözleşme metnini oluştur:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    // Extract HTML content (remove markdown code blocks if present)
    let htmlContent = generatedText.trim();
    if (htmlContent.startsWith('```html')) {
      htmlContent = htmlContent.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    } else if (htmlContent.startsWith('```')) {
      htmlContent = htmlContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Extract variables from the generated content
    const variablePattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
    const variables: Array<{ name: string; description: string }> = [];
    const variableMap = new Map<string, string>();

    let match;
    while ((match = variablePattern.exec(htmlContent)) !== null) {
      const varName = match[1];
      if (!variableMap.has(varName)) {
        variableMap.set(varName, varName);
        // Try to infer description from context
        const context = htmlContent.substring(
          Math.max(0, match.index - 50),
          Math.min(htmlContent.length, match.index + match[0].length + 50)
        );
        variables.push({
          name: varName,
          description: `${varName} değişkeni`,
        });
      }
    }

    return NextResponse.json({
      content: htmlContent,
      variables,
    });
  } catch (error: any) {
    // Provide more specific error messages
    const errorMessage = error?.message || '';
    
    console.error('Gemini API Error:', error);
    
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('API key') || errorMessage.includes('403')) {
      return NextResponse.json(
        { 
          error: 'Gemini API key geçersiz veya yetkisiz. Lütfen .env dosyanızdaki GEMINI_API_KEY değerini kontrol edin. API key\'iniz \'AI\' ile başlamalıdır. Google AI Studio\'dan yeni bir API key oluşturmayı deneyin: https://aistudio.google.com/app/apikey'
        },
        { status: 401 }
      );
    }
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'Gemini model bulunamadı. API key\'inizin doğru izinlere sahip olduğundan emin olun. Google AI Studio\'dan API key\'inizi kontrol edin: https://aistudio.google.com/app/apikey'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage || 'Sözleşme oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}

