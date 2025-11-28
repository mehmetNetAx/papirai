import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { extractTextFromImage } from '@/lib/aws/textract';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { uploadToS3 } from '@/lib/aws/s3';

export async function importDocument(
  file: File | Buffer,
  fileName: string,
  contractData: {
    title: string;
    workspaceId: string;
    companyId: string;
    createdBy: string;
  }
): Promise<string> {
  await connectDB();

  const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  let text = '';

  // Extract text based on file type
  if (fileExtension === 'pdf') {
    const pdfData = await pdfParse(fileBuffer);
    text = pdfData.text;
  } else if (fileExtension === 'docx' || fileExtension === 'doc') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    text = result.value;
  } else if (fileExtension === 'txt') {
    text = fileBuffer.toString('utf-8');
  } else {
    // Try OCR for images
    const ocrResult = await extractTextFromImage(fileBuffer);
    text = ocrResult.text;
  }

  // Upload original file to S3
  const s3Key = `contracts/${contractData.companyId}/${Date.now()}_${fileName}`;
  await uploadToS3(s3Key, fileBuffer);

  // Create contract with extracted text
  const contract = await Contract.create({
    ...contractData,
    content: text,
    status: 'draft',
    metadata: {
      originalFileName: fileName,
      s3Key,
      importedAt: new Date(),
    },
  });

  return contract._id.toString();
}

export async function processOCR(file: File | Buffer): Promise<{ text: string; confidence: number }> {
  const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  return await extractTextFromImage(fileBuffer);
}

