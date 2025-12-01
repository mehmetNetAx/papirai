import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'approval_request' | 'approval_decision' | 'signature_request' | 'signature_completed' | 'compliance_alert' | 'contract_expiring' | 'contract_expired' | 'deadline_approaching' | 'deadline_missed' | 'system' | 'contract_assigned' | 'contract_updated' | 'contract_alert' | 'document_expired' | 'document_expiring' | 'contract_document_expired' | 'contract_document_expiring';
  message: string;
  read: boolean;
  relatedResourceType?: 'contract' | 'approval' | 'signature' | 'compliance' | 'document';
  relatedResourceId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  emailSent?: boolean;
  emailSentAt?: Date;
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['approval_request', 'approval_decision', 'signature_request', 'signature_completed', 'compliance_alert', 'contract_expiring', 'contract_expired', 'deadline_approaching', 'deadline_missed', 'system', 'contract_assigned', 'contract_updated', 'contract_alert', 'document_expired', 'document_expiring', 'contract_document_expired', 'contract_document_expiring'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedResourceType: {
      type: String,
      enum: ['contract', 'approval', 'signature', 'compliance', 'document'],
    },
    relatedResourceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;

