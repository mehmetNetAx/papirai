import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  companyId: mongoose.Types.ObjectId;
  description?: string;
  permissions: {
    defaultRole?: string;
    customPermissions?: Record<string, any>;
  };
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      defaultRole: { type: String, default: 'viewer' },
      customPermissions: { type: Schema.Types.Mixed, default: {} },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

WorkspaceSchema.index({ companyId: 1, isActive: 1 });

const Workspace: Model<IWorkspace> = mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

export default Workspace;

