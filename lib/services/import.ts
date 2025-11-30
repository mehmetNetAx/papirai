import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { extractTextFromImage } from '@/lib/aws/textract';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { uploadToS3 } from '@/lib/aws/s3';
import { parseContractWithAI } from './contract-parser';
import { setMasterVariable } from './master-variables';
import ContractVariable from '@/lib/db/models/ContractVariable';
import { createVersion } from './version';
import mongoose from 'mongoose';

export interface ImportDocumentOptions {
  useAI?: boolean; // Use AI to parse contract and extract variables
}

export async function importDocument(
  file: File | Buffer,
  fileName: string,
  contractData: {
    title: string;
    workspaceId: string;
    companyId: string;
    createdBy: string;
  },
  options: ImportDocumentOptions = { useAI: true }
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

  // Upload original file to S3 (optional - continue even if it fails)
  let s3Key: string | undefined;
  try {
    s3Key = `contracts/${contractData.companyId}/${Date.now()}_${fileName}`;
    await uploadToS3(s3Key, fileBuffer);
    console.log('File uploaded to S3:', s3Key);
  } catch (s3Error: any) {
    console.warn('Failed to upload file to S3 (continuing without S3 storage):', s3Error.message);
    // Continue without S3 storage - this is optional
    s3Key = undefined;
  }

  let parsedData: any = null;
  let finalContent = text;

  // Use AI to parse contract if enabled
  if (options.useAI && text.trim().length > 0) {
    try {
      console.log('Parsing contract with AI...');
      parsedData = await parseContractWithAI(text, contractData.title);
      
      // Use AI-parsed content if available
      if (parsedData.content) {
        finalContent = parsedData.content;
      }
    } catch (error) {
      console.error('Error parsing contract with AI:', error);
      // Continue with raw text if AI parsing fails
    }
  }

  // Create contract with extracted/parsed text
  const contract = await Contract.create({
    ...contractData,
    content: finalContent,
    status: 'draft',
    // Set master fields if parsed
    startDate: parsedData?.startDate ? new Date(parsedData.startDate) : undefined,
    endDate: parsedData?.endDate ? new Date(parsedData.endDate) : undefined,
    renewalDate: parsedData?.renewalDate ? new Date(parsedData.renewalDate) : undefined,
    value: parsedData?.contractValue,
    currency: parsedData?.currency || 'TRY',
    counterparty: parsedData?.counterparty,
    contractType: parsedData?.contractType,
    metadata: {
      originalFileName: fileName,
      ...(s3Key && { s3Key }),
      importedAt: new Date(),
      aiParsed: !!parsedData,
    },
  });

  const contractId = contract._id.toString();

  // Set master variables if parsed
  if (parsedData) {
    try {
      if (parsedData.startDate) {
        await setMasterVariable(contractId, 'startDate', new Date(parsedData.startDate), 'Başlangıç Tarihi');
      }
      
      if (parsedData.endDate) {
        await setMasterVariable(contractId, 'endDate', new Date(parsedData.endDate), 'Bitiş Tarihi');
      }
      
      if (parsedData.renewalDate) {
        await setMasterVariable(contractId, 'renewalDate', new Date(parsedData.renewalDate), 'Yenileme Tarihi');
      }
      
      if (parsedData.contractValue !== null && parsedData.contractValue !== undefined) {
        await setMasterVariable(contractId, 'contractValue', parsedData.contractValue, 'Sözleşme Tutarı');
      }
      
      if (parsedData.currency) {
        await setMasterVariable(contractId, 'currency', parsedData.currency, 'Para Birimi');
      }
      
      if (parsedData.counterparty) {
        await setMasterVariable(contractId, 'counterparty', parsedData.counterparty, 'Karşı Taraf');
      }
      
      if (parsedData.contractType) {
        await setMasterVariable(contractId, 'contractType', parsedData.contractType, 'Sözleşme Tipi');
      }
      
      if (parsedData.terminationPeriod) {
        await setMasterVariable(contractId, 'terminationPeriod', parsedData.terminationPeriod, 'Fesih Süresi');
      }
    } catch (masterVarError) {
      console.error('Error setting master variables:', masterVarError);
      // Continue even if master variables fail - contract is already created
    }
  }

  // Create variables from AI parsing or extract from content
  if (parsedData && parsedData.variables && parsedData.variables.length > 0) {
    // Use AI-detected variables
    const contractObjectId = new mongoose.Types.ObjectId(contractId);
    
    for (const variable of parsedData.variables) {
      try {
        // Check if variable already exists
        const existing = await ContractVariable.findOne({
          contractId: contractObjectId,
          name: variable.name,
        });
        
        if (!existing) {
          await ContractVariable.create({
            contractId: contractObjectId,
            name: variable.name,
            type: variable.type || 'text',
            value: '',
            taggedText: `{{${variable.name}}}`,
            isComplianceTracked: false,
            metadata: {
              description: variable.description,
            },
          });
        }
      } catch (error) {
        console.error(`Error creating variable ${variable.name}:`, error);
        // Continue with other variables even if one fails
      }
    }
  } else {
    // Extract variables from content using regex pattern
    const variablePattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
    const extractedVariables = new Set<string>();
    let match;
    
    while ((match = variablePattern.exec(finalContent)) !== null) {
      extractedVariables.add(match[1]);
    }
    
    if (extractedVariables.size > 0) {
      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      
      for (const varName of extractedVariables) {
        try {
          const existing = await ContractVariable.findOne({
            contractId: contractObjectId,
            name: varName,
          });
          
          if (!existing) {
            await ContractVariable.create({
              contractId: contractObjectId,
              name: varName,
              type: 'text',
              value: '',
              taggedText: `{{${varName}}}`,
              isComplianceTracked: false,
            });
          }
        } catch (error) {
          console.error(`Error creating variable ${varName}:`, error);
        }
      }
    }
  }

  // Create initial version
  try {
    await createVersion(
      contractId,
      finalContent,
      contractData.createdBy,
      'İlk versiyon (Dosyadan içe aktarıldı)'
    );
  } catch (versionError) {
    console.error('Error creating initial version:', versionError);
    // Continue even if version creation fails - contract is already created
  }

  return contractId;
}

export async function processOCR(file: File | Buffer): Promise<{ text: string; confidence: number }> {
  const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  return await extractTextFromImage(fileBuffer);
}

