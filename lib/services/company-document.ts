import connectDB from '@/lib/db/connection';
import CompanyDocument, { DocumentType } from '@/lib/db/models/CompanyDocument';
import { uploadToS3, deleteFromS3 } from '@/lib/aws/s3';
import mongoose from 'mongoose';

export interface UploadCompanyDocumentData {
  companyId: string;
  counterpartyCompanyId?: string;
  documentType: DocumentType;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  fileBuffer: Buffer;
  validityStartDate: Date;
  validityEndDate: Date;
  uploadedBy: string;
  description?: string;
  tags?: string[];
}

export interface GetCompanyDocumentsFilters {
  companyId: string;
  counterpartyCompanyId?: string;
  documentType?: DocumentType;
  validityStatus?: 'valid' | 'expiring_soon' | 'expired';
  search?: string;
  tags?: string[];
}

/**
 * Upload a document to company archive
 */
export async function uploadCompanyDocument(
  data: UploadCompanyDocumentData
): Promise<string> {
  await connectDB();

  // Validate dates
  if (data.validityEndDate < data.validityStartDate) {
    throw new Error('Geçerlilik bitiş tarihi başlangıç tarihinden önce olamaz');
  }

  // Generate S3 key
  const timestamp = Date.now();
  const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `companies/${data.companyId}/documents/${timestamp}_${sanitizedFileName}`;

  // Upload to S3
  let uploadedS3Key: string;
  try {
    uploadedS3Key = await uploadToS3(s3Key, data.fileBuffer, data.fileType);
  } catch (s3Error: any) {
    console.error('S3 upload error:', s3Error);
    throw new Error(`S3 upload failed: ${s3Error.message}`);
  }

  // Create document record
  const document = await CompanyDocument.create({
    companyId: new mongoose.Types.ObjectId(data.companyId),
    counterpartyCompanyId: data.counterpartyCompanyId 
      ? new mongoose.Types.ObjectId(data.counterpartyCompanyId) 
      : undefined,
    documentType: data.documentType,
    fileName: sanitizedFileName,
    originalFileName: data.originalFileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    s3Key: uploadedS3Key,
    validityStartDate: data.validityStartDate,
    validityEndDate: data.validityEndDate,
    uploadedBy: new mongoose.Types.ObjectId(data.uploadedBy),
    description: data.description,
    tags: data.tags || [],
    metadata: {
      uploadedAt: new Date(),
    },
  });

  return document._id.toString();
}

/**
 * Get company documents with filters
 */
export async function getCompanyDocuments(
  filters: GetCompanyDocumentsFilters
): Promise<any[]> {
  await connectDB();

  const query: any = {
    companyId: new mongoose.Types.ObjectId(filters.companyId),
    isActive: true,
  };

  if (filters.counterpartyCompanyId) {
    query.counterpartyCompanyId = new mongoose.Types.ObjectId(filters.counterpartyCompanyId);
  }

  if (filters.documentType) {
    query.documentType = filters.documentType;
  }

  if (filters.search) {
    query.$or = [
      { originalFileName: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  // Validity status filter
  const now = new Date();
  if (filters.validityStatus) {
    switch (filters.validityStatus) {
      case 'expired':
        query.validityEndDate = { $lt: now };
        break;
      case 'expiring_soon':
        const thirtyDaysLater = new Date(now);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        query.validityEndDate = { $gte: now, $lte: thirtyDaysLater };
        break;
      case 'valid':
        query.validityEndDate = { $gt: now };
        break;
    }
  }

  const documents = await CompanyDocument.find(query)
    .populate('uploadedBy', 'name email')
    .populate('counterpartyCompanyId', 'name')
    .sort({ validityEndDate: 1, createdAt: -1 })
    .lean();

  return documents.map((doc: any) => ({
    ...doc,
    _id: doc._id.toString(),
    companyId: doc.companyId.toString(),
    counterpartyCompanyId: doc.counterpartyCompanyId?._id?.toString() || doc.counterpartyCompanyId?.toString(),
    uploadedBy: doc.uploadedBy ? {
      _id: doc.uploadedBy._id.toString(),
      name: doc.uploadedBy.name,
      email: doc.uploadedBy.email,
    } : null,
    counterpartyCompany: doc.counterpartyCompanyId ? {
      _id: doc.counterpartyCompanyId._id?.toString() || doc.counterpartyCompanyId.toString(),
      name: doc.counterpartyCompanyId.name,
    } : null,
  }));
}

/**
 * Get a single company document
 */
export async function getCompanyDocument(documentId: string): Promise<any> {
  await connectDB();

  const document = await CompanyDocument.findById(documentId)
    .populate('uploadedBy', 'name email')
    .populate('counterpartyCompanyId', 'name')
    .lean();

  if (!document) {
    throw new Error('Document not found');
  }

  return {
    ...document,
    _id: document._id.toString(),
    companyId: document.companyId.toString(),
    counterpartyCompanyId: document.counterpartyCompanyId?._id?.toString() || document.counterpartyCompanyId?.toString(),
    uploadedBy: document.uploadedBy && typeof document.uploadedBy === 'object' && 'name' in document.uploadedBy ? {
      _id: (document.uploadedBy as any)._id.toString(),
      name: (document.uploadedBy as any).name,
      email: (document.uploadedBy as any).email,
    } : null,
    counterpartyCompany: document.counterpartyCompanyId && typeof document.counterpartyCompanyId === 'object' && 'name' in document.counterpartyCompanyId ? {
      _id: (document.counterpartyCompanyId as any)._id?.toString() || (document.counterpartyCompanyId as any).toString(),
      name: (document.counterpartyCompanyId as any).name,
    } : null,
  };
}

/**
 * Update company document
 */
export async function updateCompanyDocument(
  documentId: string,
  updates: {
    validityStartDate?: Date;
    validityEndDate?: Date;
    description?: string;
    tags?: string[];
  }
): Promise<void> {
  await connectDB();

  const document = await CompanyDocument.findById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  if (updates.validityStartDate) {
    document.validityStartDate = updates.validityStartDate;
  }

  if (updates.validityEndDate) {
    document.validityEndDate = updates.validityEndDate;
  }

  if (updates.description !== undefined) {
    document.description = updates.description;
  }

  if (updates.tags !== undefined) {
    document.tags = updates.tags;
  }

  // Validate dates
  if (document.validityEndDate < document.validityStartDate) {
    throw new Error('Geçerlilik bitiş tarihi başlangıç tarihinden önce olamaz');
  }

  await document.save();
}

/**
 * Delete company document (soft delete)
 */
export async function deleteCompanyDocument(documentId: string): Promise<void> {
  await connectDB();

  const document = await CompanyDocument.findById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Delete from S3 (optional - continue even if it fails)
  try {
    await deleteFromS3(document.s3Key);
  } catch (s3Error: any) {
    console.warn('Failed to delete from S3 (continuing with DB deletion):', s3Error.message);
  }

  // Soft delete
  document.isActive = false;
  await document.save();
}

/**
 * Get expired documents
 */
export async function getExpiredDocuments(companyId?: string): Promise<any[]> {
  await connectDB();

  const query: any = {
    isActive: true,
    validityEndDate: { $lt: new Date() },
  };

  if (companyId) {
    query.companyId = new mongoose.Types.ObjectId(companyId);
  }

  const documents = await CompanyDocument.find(query)
    .populate('companyId', 'name')
    .populate('counterpartyCompanyId', 'name')
    .sort({ validityEndDate: -1 })
    .lean();

  return documents.map((doc: any) => ({
    ...doc,
    _id: doc._id.toString(),
    companyId: doc.companyId._id.toString(),
    company: {
      _id: doc.companyId._id.toString(),
      name: doc.companyId.name,
    },
    counterpartyCompanyId: doc.counterpartyCompanyId?._id?.toString() || doc.counterpartyCompanyId?.toString(),
    counterpartyCompany: doc.counterpartyCompanyId ? {
      _id: doc.counterpartyCompanyId._id?.toString() || doc.counterpartyCompanyId.toString(),
      name: doc.counterpartyCompanyId.name,
    } : null,
  }));
}

/**
 * Get expiring documents (within 30 days)
 */
export async function getExpiringDocuments(companyId?: string, days: number = 30): Promise<any[]> {
  await connectDB();

  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);

  const query: any = {
    isActive: true,
    validityEndDate: {
      $gte: now,
      $lte: futureDate,
    },
  };

  if (companyId) {
    query.companyId = new mongoose.Types.ObjectId(companyId);
  }

  const documents = await CompanyDocument.find(query)
    .populate('companyId', 'name')
    .populate('counterpartyCompanyId', 'name')
    .sort({ validityEndDate: 1 })
    .lean();

  return documents.map((doc: any) => ({
    ...doc,
    _id: doc._id.toString(),
    companyId: doc.companyId._id.toString(),
    company: {
      _id: doc.companyId._id.toString(),
      name: doc.companyId.name,
    },
    counterpartyCompanyId: doc.counterpartyCompanyId?._id?.toString() || doc.counterpartyCompanyId?.toString(),
    counterpartyCompany: doc.counterpartyCompanyId ? {
      _id: doc.counterpartyCompanyId._id?.toString() || doc.counterpartyCompanyId.toString(),
      name: doc.counterpartyCompanyId.name,
    } : null,
  }));
}

/**
 * Get document validity status
 */
export function getDocumentValidityStatus(validityEndDate: Date): 'valid' | 'expiring_soon' | 'expired' {
  const now = new Date();
  const endDate = new Date(validityEndDate);
  
  if (endDate < now) {
    return 'expired';
  }

  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  if (endDate <= thirtyDaysLater) {
    return 'expiring_soon';
  }

  return 'valid';
}

