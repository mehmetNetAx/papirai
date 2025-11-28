import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn('AWS Textract configuration is missing. OCR features will be limited.');
}

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

export interface OCRResult {
  text: string;
  confidence: number;
  blocks?: Array<{
    type: string;
    text: string;
    confidence: number;
    geometry?: any;
  }>;
}

export async function extractTextFromImage(imageBytes: Buffer): Promise<OCRResult> {
  const command = new DetectDocumentTextCommand({
    Document: {
      Bytes: imageBytes,
    },
  });

  const response = await textractClient.send(command);
  
  const blocks = response.Blocks || [];
  const textBlocks = blocks
    .filter(block => block.BlockType === 'LINE')
    .map(block => block.Text || '')
    .filter(text => text.length > 0);

  const text = textBlocks.join('\n');
  const avgConfidence = blocks
    .filter(block => block.Confidence !== undefined)
    .reduce((sum, block) => sum + (block.Confidence || 0), 0) / blocks.length || 0;

  return {
    text,
    confidence: avgConfidence,
    blocks: blocks.map(block => ({
      type: block.BlockType || 'UNKNOWN',
      text: block.Text || '',
      confidence: block.Confidence || 0,
      geometry: block.Geometry,
    })),
  };
}

export async function analyzeDocument(imageBytes: Buffer): Promise<OCRResult> {
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: imageBytes,
    },
    FeatureTypes: ['TABLES', 'FORMS'],
  });

  const response = await textractClient.send(command);
  
  const blocks = response.Blocks || [];
  const textBlocks = blocks
    .filter(block => block.BlockType === 'LINE')
    .map(block => block.Text || '')
    .filter(text => text.length > 0);

  const text = textBlocks.join('\n');
  const avgConfidence = blocks
    .filter(block => block.Confidence !== undefined)
    .reduce((sum, block) => sum + (block.Confidence || 0), 0) / blocks.length || 0;

  return {
    text,
    confidence: avgConfidence,
    blocks: blocks.map(block => ({
      type: block.BlockType || 'UNKNOWN',
      text: block.Text || '',
      confidence: block.Confidence || 0,
      geometry: block.Geometry,
    })),
  };
}

