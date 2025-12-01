import mongoose, { Schema, Document, Model } from 'mongoose';
import './User'; // Ensure User model is registered

export interface IHelpDocument extends Document {
  module: string; // e.g., 'dashboard', 'contracts', 'documents', 'master-variables', 'approvals', 'signatures', 'compliance', 'reports', 'companies', 'users', 'integrations'
  title: string;
  content: string; // Markdown content
  order: number; // Display order within module
  isActive: boolean;
  images?: string[]; // S3 keys for screenshots/GIFs
  metadata?: {
    videoUrl?: string; // Optional video URL
    tags?: string[]; // Tags for search
    relatedModules?: string[]; // Related module names
  };
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HelpDocumentSchema = new Schema<IHelpDocument>(
  {
    module: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    images: [{
      type: String,
      trim: true,
    }],
    metadata: {
      videoUrl: { type: String, trim: true },
      tags: [{ type: String, trim: true }],
      relatedModules: [{ type: String, trim: true }],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for module and order
HelpDocumentSchema.index({ module: 1, order: 1, isActive: 1 });

// Index for search
HelpDocumentSchema.index({ title: 'text', content: 'text' });

const HelpDocument: Model<IHelpDocument> = mongoose.models.HelpDocument || mongoose.model<IHelpDocument>('HelpDocument', HelpDocumentSchema);

export default HelpDocument;

