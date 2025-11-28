import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  type: 'group' | 'subsidiary';
  parentCompanyId?: mongoose.Types.ObjectId;
  settings: {
    allowSelfRegistration?: boolean;
    defaultWorkspacePermissions?: Record<string, any>;
    notificationPreferences?: Record<string, any>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['group', 'subsidiary'],
      required: true,
      index: true,
    },
    parentCompanyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    settings: {
      allowSelfRegistration: { type: Boolean, default: false },
      defaultWorkspacePermissions: { type: Schema.Types.Mixed, default: {} },
      notificationPreferences: { type: Schema.Types.Mixed, default: {} },
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

// Index for hierarchical queries
CompanySchema.index({ parentCompanyId: 1, isActive: 1 });

const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company;

