import connectDB from '@/lib/db/connection';
import AuditLog from '@/lib/db/models/AuditLog';
import { AuthUser } from '@/lib/auth/middleware';

export interface AuditLogData {
  userId: string;
  action: string;
  resourceType: 'contract' | 'user' | 'company' | 'workspace' | 'approval' | 'signature' | 'variable' | 'compliance';
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      ...data,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

export async function getAuditLogs(
  filters: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  skip: number = 0
) {
  await connectDB();

  const query: any = {};

  if (filters.userId) query.userId = filters.userId;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.resourceId) query.resourceId = filters.resourceId;
  if (filters.action) query.action = filters.action;
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }

  const logs = await AuditLog.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await AuditLog.countDocuments(query);

  return { logs, total };
}

