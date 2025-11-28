import { GoogleGenerativeAI } from '@google/generative-ai';
import ContractAnalysis from '@/lib/db/models/ContractAnalysis';
import type { ICriterion } from '@/lib/db/models/ContractAnalysis';
import Contract from '@/lib/db/models/Contract';

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. Contract analysis will be disabled.');
}

// Trim API key to remove any whitespace
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

const genAI = geminiApiKey
  ? new GoogleGenerativeAI(geminiApiKey)
  : null;

export interface AnalysisResult {
  overallScore: number;
  criteria: ICriterion[];
  summary: {
    strengths?: string[];
    weaknesses?: string[];
    criticalIssues?: string[];
    recommendations?: string[];
  };
}

/**
 * Analyze a contract using AI
 */
export async function analyzeContract(
  contractId: string,
  contractContent: string,
  contractTitle: string,
  userId: string
): Promise<AnalysisResult> {
  if (!genAI) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  try {
    // Create the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: 'Sen Türk hukuk sistemi için uzman bir sözleşme analiz uzmanısın. Sözleşmeleri çok boyutlu olarak analiz eder, her kriter için detaylı puanlama yapar ve öneriler sunarsın.',
    });

    // Build comprehensive analysis prompt
    const prompt = `Aşağıdaki sözleşmeyi çok boyutlu olarak analiz et ve detaylı bir analiz raporu oluştur.

Sözleşme Başlığı: ${contractTitle}

Sözleşme İçeriği:
${contractContent}

ANALİZ GEREKSİNİMLERİ:

1. Sözleşmeyi şu kriterlerde analiz et:
   a) OPERASYONEL (Operational):
      - İş süreçleri tanımları
      - Teslimat ve ifa koşulları
      - Performans kriterleri
      - Raporlama mekanizmaları
      - İletişim protokolleri
   
   b) FİNANSAL (Financial):
      - Ödeme koşulları ve şartları
      - Fiyatlandırma mekanizması
      - Para birimi ve döviz kuru riski
      - Vergi ve maliyet yükümlülükleri
      - Finansal garantiler
   
   c) RİSK (Risk):
      - Yasal riskler
      - Operasyonel riskler
      - Finansal riskler
      - Uyum riskleri
      - Fesih ve iptal riskleri
      - Garanti ve sorumluluk riskleri
   
   d) HUKUK (Legal):
      - Yasal uygunluk
      - Yargı yetkisi ve uyuşmazlık çözümü
      - Gizlilik ve veri koruma
      - Fikri mülkiyet hakları
      - Yürürlük ve fesih koşulları
      - Yasal yükümlülükler
   
   e) KALİTE (Quality):
      - Metin kalitesi ve netlik
      - Tutarlılık
      - Eksiksizlik
      - Profesyonellik
      - Standartlara uygunluk
   
   f) EKSİK TARAFLAR (Missing Parts):
      - Eksik maddeler
      - Eksik tanımlar
      - Eksik ekler
      - Eksik imza alanları
      - Eksik tarih alanları
   
   g) EKSİK ŞARTNAMELER (Missing Specifications):
      - Teknik şartname eksiklikleri
      - Performans kriterleri eksiklikleri
      - Kalite standartları eksiklikleri
      - Test ve kabul kriterleri eksiklikleri

2. Her kriter için:
   - 0-100 arası puan ver (100 = mükemmel, 0 = çok zayıf)
   - Alt kriterleri belirle ve her biri için puan ver
   - Bulguları listele (pozitif ve negatif)
   - Öneriler sun

3. Genel özet:
   - Güçlü yönler
   - Zayıf yönler
   - Kritik sorunlar
   - Genel öneriler

4. Genel skor hesapla (tüm kriterlerin ağırlıklı ortalaması)

ÇIKTI FORMATI (JSON):
{
  "overallScore": 75,
  "criteria": [
    {
      "name": "Operasyonel",
      "category": "operational",
      "score": 80,
      "weight": 0.15,
      "subCriteria": [
        {
          "name": "İş süreçleri tanımları",
          "score": 85,
          "findings": ["İyi tanımlanmış", "Eksik detaylar var"],
          "recommendations": ["Daha detaylı süreç tanımları ekle"]
        }
      ],
      "findings": ["Genel olarak iyi", "Bazı eksiklikler var"],
      "recommendations": ["Süreç tanımlarını genişlet"]
    }
  ],
  "summary": {
    "strengths": ["Güçlü yön 1", "Güçlü yön 2"],
    "weaknesses": ["Zayıf yön 1", "Zayıf yön 2"],
    "criticalIssues": ["Kritik sorun 1"],
    "recommendations": ["Genel öneri 1", "Genel öneri 2"]
  }
}

Sadece JSON formatında yanıt ver, başka açıklama ekleme.`;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    const processingTime = Date.now() - startTime;

    // Parse JSON response
    let analysisResult: AnalysisResult;
    try {
      // Remove markdown code blocks if present
      let jsonText = generatedText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error('AI analiz yanıtı parse edilemedi. Lütfen tekrar deneyin.');
    }

    // Validate and normalize the result
    if (!analysisResult.overallScore || !analysisResult.criteria) {
      throw new Error('AI analiz yanıtı eksik veya geçersiz.');
    }

    // Ensure all scores are within 0-100 range
    analysisResult.overallScore = Math.max(0, Math.min(100, analysisResult.overallScore));
    analysisResult.criteria = analysisResult.criteria.map((criterion) => ({
      ...criterion,
      score: Math.max(0, Math.min(100, criterion.score)),
      subCriteria: criterion.subCriteria?.map((sub) => ({
        ...sub,
        score: Math.max(0, Math.min(100, sub.score)),
      })),
    }));

    // Save analysis to database
    const analysis = await ContractAnalysis.create({
      contractId,
      overallScore: analysisResult.overallScore,
      criteria: analysisResult.criteria,
      summary: analysisResult.summary || {},
      analyzedBy: userId,
      analysisDate: new Date(),
      analysisVersion: 'gemini-2.5-pro',
      metadata: {
        processingTime,
        modelUsed: 'gemini-2.5-pro',
        language: 'tr',
      },
      status: 'completed',
    });

    return analysisResult;
  } catch (error: any) {
    // Save failed analysis to database
    try {
      await ContractAnalysis.create({
        contractId,
        overallScore: 0,
        criteria: [],
        summary: {},
        analyzedBy: userId,
        analysisDate: new Date(),
        status: 'failed',
        errorMessage: error.message || 'Analiz başarısız oldu',
      });
    } catch (dbError) {
      console.error('Error saving failed analysis:', dbError);
    }

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

/**
 * Get analysis for a contract
 */
export async function getContractAnalysis(contractId: string) {
  const analysis = await ContractAnalysis.findOne({ contractId })
    .sort({ analysisDate: -1 })
    .populate('analyzedBy', 'name email')
    .lean();

  return analysis;
}

/**
 * Get all analyses for a contract
 */
export async function getContractAnalyses(contractId: string) {
  const analyses = await ContractAnalysis.find({ contractId })
    .sort({ analysisDate: -1 })
    .populate('analyzedBy', 'name email')
    .lean();

  return analyses;
}

