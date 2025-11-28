import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISignature extends Document {
  contractId: mongoose.Types.ObjectId;
  signerId: mongoose.Types.ObjectId;
  type: 'digital' | 'physical';
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'voided';
  documentUrl?: string;
  signedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  docusignEnvelopeId?: string;
  docusignRecipientId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SignatureSchema = new Schema<ISignature>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    signerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['digital', 'physical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'viewed', 'signed', 'declined', 'voided'],
      default: 'pending',
      required: true,
      index: true,
    },
    documentUrl: {
      type: String,
    },
    signedAt: {
      type: Date,
      index: true,
    },
    declinedAt: {
      type: Date,
    },
    declineReason: {
      type: String,
      trim: true,
    },
    docusignEnvelopeId: {
      type: String,
      index: true,
    },
    docusignRecipientId: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

SignatureSchema.index({ contractId: 1, status: 1 });
SignatureSchema.index({ signerId: 1, status: 1 });

const Signature: Model<ISignature> = mongoose.models.Signature || mongoose.model<ISignature>('Signature', SignatureSchema);

export default Signature;

