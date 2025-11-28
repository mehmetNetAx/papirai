import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'system_admin' | 'group_admin' | 'company_admin' | 'contract_manager' | 'legal_reviewer' | 'viewer';
  companyId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  permissions?: {
    canEdit?: boolean;
    canApprove?: boolean;
    canDelete?: boolean;
    canManageUsers?: boolean;
    workspaces?: mongoose.Types.ObjectId[];
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['system_admin', 'group_admin', 'company_admin', 'contract_manager', 'legal_reviewer', 'viewer'],
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    permissions: {
      canEdit: { type: Boolean, default: false },
      canApprove: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      workspaces: [{ type: Schema.Types.ObjectId, ref: 'Workspace' }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

