import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

interface IPasswordResetTokenModel extends Model<IPasswordResetToken> {
  generateToken(): string;
  findValidToken(token: string): Promise<IPasswordResetToken | null>;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired tokens
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate a secure random token
PasswordResetTokenSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

// Find valid token
PasswordResetTokenSchema.statics.findValidToken = async function (
  token: string
): Promise<IPasswordResetToken | null> {
  return this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });
};

const PasswordResetToken: IPasswordResetTokenModel =
  (mongoose.models.PasswordResetToken as IPasswordResetTokenModel) ||
  mongoose.model<IPasswordResetToken, IPasswordResetTokenModel>('PasswordResetToken', PasswordResetTokenSchema);

export default PasswordResetToken;

