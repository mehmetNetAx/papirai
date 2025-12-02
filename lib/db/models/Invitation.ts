import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IInvitation extends Document {
  email: string;
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  contractId?: mongoose.Types.ObjectId; // If set, invitation is contract-specific
  role: 'viewer' | 'contract_manager' | 'legal_reviewer';
  expiresAt: Date;
  accepted: boolean;
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId; // User who accepted the invitation
  createdAt: Date;
  updatedAt: Date;
}

interface IInvitationModel extends Model<IInvitation> {
  generateToken(): string;
  findValidInvitation(token: string): Promise<IInvitation | null>;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      index: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'contract_manager', 'legal_reviewer'],
      default: 'viewer',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired invitations
    },
    accepted: {
      type: Boolean,
      default: false,
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Generate a secure random token
InvitationSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

// Find valid invitation
InvitationSchema.statics.findValidInvitation = async function (
  token: string
): Promise<IInvitation | null> {
  return this.findOne({
    token,
    accepted: false,
    expiresAt: { $gt: new Date() },
  });
};

const Invitation: IInvitationModel =
  (mongoose.models.Invitation as IInvitationModel) ||
  mongoose.model<IInvitation, IInvitationModel>('Invitation', InvitationSchema);

export default Invitation;

