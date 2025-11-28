import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  companyId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Company validation schemas
export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  type: z.enum(['group', 'subsidiary']),
  parentCompanyId: z.string().optional(),
});

// Workspace validation schemas
export const workspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  companyId: z.string().min(1, 'Company ID is required'),
  description: z.string().optional(),
});

// Contract validation schemas
export const contractSchema = z.object({
  title: z.string().min(1, 'Contract title is required'),
  content: z.string().min(1, 'Contract content is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  contractType: z.string().optional(),
  counterparty: z.string().optional(),
  startDate: z.coerce.date({ required_error: 'Başlangıç tarihi zorunludur' }),
  endDate: z.coerce.date({ required_error: 'Bitiş tarihi zorunludur' }),
  renewalDate: z.coerce.date().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Variable validation schemas
export const variableSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required').optional(),
  name: z.string().min(1, 'Variable name is required'),
  value: z.union([z.string(), z.number(), z.date()]),
  type: z.enum(['text', 'number', 'date', 'currency', 'percentage', 'boolean']),
  taggedText: z.string().min(1, 'Tagged text is required'),
  position: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
  isComplianceTracked: z.boolean().optional(),
});

// Approval validation schemas
export const approvalSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  comments: z.string().optional(),
});

// Signature validation schemas
export const signatureSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  signerId: z.string().min(1, 'Signer ID is required'),
  type: z.enum(['digital', 'physical']),
});

