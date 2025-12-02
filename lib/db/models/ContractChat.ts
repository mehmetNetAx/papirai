import mongoose, { Schema, Document, Model } from 'mongoose';
// Import Contract to ensure it's registered before ContractChat schema references it
import './Contract';
// Import User to ensure it's registered before ContractChat schema references it
import './User';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IContractChat extends Document {
  contractId?: mongoose.Types.ObjectId; // Optional - null for general chat
  userId: mongoose.Types.ObjectId;
  sessionId: string; // Unique session identifier
  messages: IChatMessage[];
  metadata?: {
    title?: string;
    contractTitle?: string; // If contractId is set
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

const ContractChatSchema = new Schema<IContractChat>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
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

// Indexes
ContractChatSchema.index({ userId: 1, createdAt: -1 });
ContractChatSchema.index({ contractId: 1, userId: 1, createdAt: -1 });
ContractChatSchema.index({ sessionId: 1 });

const ContractChat: Model<IContractChat> =
  mongoose.models.ContractChat ||
  mongoose.model<IContractChat>('ContractChat', ContractChatSchema);

export default ContractChat;

