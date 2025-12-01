import mongoose, { Schema, Document, Model } from 'mongoose';
// Import Company to ensure it's registered before CompanyDocument schema references it
import './Company';

export type DocumentType = 
  | 'ek_protokol' 
  | 'ek' 
  | 'imza_sirkusu' 
  | 'vergi_levhasi' 
  | 'ticaret_sicil_gazetesi'
  | 'yetki_belgesi'
  | 'diger';

export interface ICompanyDocument extends Document {
  companyId: mongoose.Types.ObjectId; // Dokümanın ait olduğu şirket
  counterpartyCompanyId?: mongoose.Types.ObjectId; // Karşı taraf şirket (opsiyonel)
  documentType: DocumentType;
  fileName: string;
  originalFileName: string;
  fileType: string; // MIME type
  fileSize: number; // in bytes
  s3Key: string; // S3'teki dosya yolu
  validityStartDate: Date; // Geçerlilik başlangıç tarihi
  validityEndDate: Date; // Geçerlilik bitiş tarihi
  uploadedBy: mongoose.Types.ObjectId;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyDocumentSchema = new Schema<ICompanyDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    counterpartyCompanyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    documentType: {
      type: String,
      enum: ['ek_protokol', 'ek', 'imza_sirkusu', 'vergi_levhasi', 'ticaret_sicil_gazetesi', 'yetki_belgesi', 'diger'],
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
      index: true,
    },
    validityStartDate: {
      type: Date,
      required: true,
      index: true,
    },
    validityEndDate: {
      type: Date,
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompanyDocumentSchema.index({ companyId: 1, isActive: 1 });
CompanyDocumentSchema.index({ companyId: 1, counterpartyCompanyId: 1 });
CompanyDocumentSchema.index({ companyId: 1, documentType: 1 });
CompanyDocumentSchema.index({ validityEndDate: 1, isActive: 1 });
CompanyDocumentSchema.index({ counterpartyCompanyId: 1, isActive: 1 });

const CompanyDocument: Model<ICompanyDocument> = 
  mongoose.models.CompanyDocument || 
  mongoose.model<ICompanyDocument>('CompanyDocument', CompanyDocumentSchema);

export default CompanyDocument;

