import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Notification from '@/lib/db/models/Notification';
import { requireAuth } from '@/lib/auth/middleware';
import { getNotifications, markNotificationAsRead, getUnreadNotificationCount, markAllAsRead, deleteNotification } from '@/lib/services/notification';

// GET - List notifications
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const notifications = await getNotifications(user.id, unreadOnly);
      const unreadCount = await getUnreadNotificationCount(user.id);

      return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Mark as read
export async function PATCH(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { notificationId } = body;

      if (!notificationId) {
        return NextResponse.json(
          { error: 'Notification ID is required' },
          { status: 400 }
        );
      }

      const notification = await markNotificationAsRead(notificationId, user.id);

      return NextResponse.json({ notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Mark all as read
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { action } = body;

      if (action === 'markAllAsRead') {
        const result = await markAllAsRead(user.id);
        return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
      }

      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete notification
export async function DELETE(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const notificationId = searchParams.get('notificationId');

      if (!notificationId) {
        return NextResponse.json(
          { error: 'Notification ID is required' },
          { status: 400 }
        );
      }

      const notification = await deleteNotification(notificationId, user.id);

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }
  })(req);
}

