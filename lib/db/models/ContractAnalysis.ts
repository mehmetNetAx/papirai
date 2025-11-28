import mongoose, { Schema, Document, Model } from 'mongoose';
import './Contract';

export interface ISubCriterion {
  name: string;
  score: number; // 0-100
  weight?: number; // Alt kriterin ağırlığı (0-1)
  findings?: string[]; // Bulgular
  recommendations?: string[]; // Öneriler
}

export interface ICriterion {
  name: string;
  category: 'operational' | 'financial' | 'risk' | 'legal' | 'quality' | 'missing_parts' | 'missing_specifications' | 'other';
  score: number; // 0-100
  weight?: number; // Kriterin ağırlığı (0-1)
  subCriteria?: ISubCriterion[];
  findings?: string[]; // Bulgular
  recommendations?: string[]; // Öneriler
  details?: string; // Detaylı açıklama
}

export interface IContractAnalysis extends Document {
  contractId: mongoose.Types.ObjectId;
  overallScore: number; // 0-100 genel skor
  criteria: ICriterion[];
  summary: {
    strengths?: string[]; // Güçlü yönler
    weaknesses?: string[]; // Zayıf yönler
    criticalIssues?: string[]; // Kritik sorunlar
    recommendations?: string[]; // Genel öneriler
  };
  analyzedBy: mongoose.Types.ObjectId; // Kim analiz etti
  analysisDate: Date;
  analysisVersion?: string; // Analiz versiyonu (AI model versiyonu)
  metadata?: {
    processingTime?: number; // İşlem süresi (ms)
    modelUsed?: string; // Kullanılan AI modeli
    language?: string; // Analiz dili
    [key: string]: any;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubCriterionSchema = new Schema<ISubCriterion>({
  name: { type: String, required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  weight: { type: Number, min: 0, max: 1 },
  findings: [{ type: String }],
  recommendations: [{ type: String }],
}, { _id: false });

const CriterionSchema = new Schema<ICriterion>({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['operational', 'financial', 'risk', 'legal', 'quality', 'missing_parts', 'missing_specifications', 'other'],
    required: true,
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  weight: { type: Number, min: 0, max: 1 },
  subCriteria: [SubCriterionSchema],
  findings: [{ type: String }],
  recommendations: [{ type: String }],
  details: { type: String },
}, { _id: false });

const ContractAnalysisSchema = new Schema<IContractAnalysis>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    criteria: {
      type: [CriterionSchema],
      required: true,
    },
    summary: {
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      criticalIssues: [{ type: String }],
      recommendations: [{ type: String }],
    },
    analyzedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    analysisDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    analysisVersion: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ContractAnalysisSchema.index({ contractId: 1, analysisDate: -1 });
ContractAnalysisSchema.index({ analyzedBy: 1, analysisDate: -1 });
ContractAnalysisSchema.index({ overallScore: 1 });
ContractAnalysisSchema.index({ status: 1 });

const ContractAnalysis: Model<IContractAnalysis> =
  mongoose.models.ContractAnalysis || mongoose.model<IContractAnalysis>('ContractAnalysis', ContractAnalysisSchema);

export default ContractAnalysis;

