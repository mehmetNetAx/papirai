import mongoose, { Schema, Document, Model } from 'mongoose';
// Import Contract to ensure it's registered before ContractAttachment schema references it
import './Contract';
// Import CompanyDocument to ensure it's registered before ContractAttachment schema references it
import './CompanyDocument';

export type AttachmentType = 
  | 'ek_protokol' 
  | 'ek' 
  | 'imza_sirkusu' 
  | 'vergi_levhasi' 
  | 'ticaret_sicil_gazetesi'
  | 'yetki_belgesi'
  | 'diger';

export interface IContractAttachment extends Document {
  contractId: mongoose.Types.ObjectId;
  companyDocumentId?: mongoose.Types.ObjectId; // Şirket arşivinden seçilmişse bu alan dolu olur
  fileName: string;
  originalFileName: string;
  fileType: string; // MIME type
  fileSize: number; // in bytes
  attachmentType: AttachmentType;
  description?: string;
  s3Key: string; // S3'teki dosya yolu
  uploadedBy: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContractAttachmentSchema = new Schema<IContractAttachment>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    companyDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyDocument',
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
    attachmentType: {
      type: String,
      enum: ['ek_protokol', 'ek', 'imza_sirkusu', 'vergi_levhasi', 'ticaret_sicil_gazetesi', 'yetki_belgesi', 'diger'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    s3Key: {
      type: String,
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
ContractAttachmentSchema.index({ contractId: 1, isActive: 1 });
ContractAttachmentSchema.index({ contractId: 1, attachmentType: 1 });
ContractAttachmentSchema.index({ uploadedBy: 1 });
ContractAttachmentSchema.index({ companyDocumentId: 1 });

const ContractAttachment: Model<IContractAttachment> = 
  mongoose.models.ContractAttachment || 
  mongoose.model<IContractAttachment>('ContractAttachment', ContractAttachmentSchema);

export default ContractAttachment;

