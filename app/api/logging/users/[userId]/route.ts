import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { getUserActivityLogs, deleteUserActivityLogs, getUserLoggingStats } from '@/lib/services/user-logging';
import mongoose from 'mongoose';

// GET - Get user activity logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { userId } = await params;
      await connectDB();
      
      // Only system admin or the user themselves can view logs
      if (user.role !== 'system_admin' && user.id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      const searchParams = req.nextUrl.searchParams;
      const activityType = searchParams.get('activityType');
      const level = searchParams.get('level');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const resourceType = searchParams.get('resourceType');
      const resourceId = searchParams.get('resourceId');
      const action = searchParams.get('action');
      const limit = parseInt(searchParams.get('limit') || '100');
      const skip = parseInt(searchParams.get('skip') || '0');
      
      const filters: any = {};
      if (activityType) filters.activityType = activityType;
      if (level) filters.level = level;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (resourceType) filters.resourceType = resourceType;
      if (resourceId) filters.resourceId = resourceId;
      if (action) filters.action = action;
      
      const result = await getUserActivityLogs(userId, filters, { limit, skip });
      
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error getting user activity logs:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get user activity logs' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete user activity logs
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return requireRole(['system_admin'])(async (req: NextRequest, user) => {
    try {
      const { userId } = await params;
      await connectDB();
      
      const body = await req.json().catch(() => ({}));
      const { beforeDate, activityType, level } = body;
      
      const deletedCount = await deleteUserActivityLogs(userId, {
        beforeDate: beforeDate ? new Date(beforeDate) : undefined,
        activityType,
        level,
      });
      
      return NextResponse.json({ deletedCount }, { status: 200 });
    } catch (error: any) {
      console.error('Error deleting user activity logs:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete user activity logs' },
        { status: 500 }
      );
    }
  })(req);
}


