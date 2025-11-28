import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const query = searchParams.get('q') || '';

      if (query.length < 2) {
        return NextResponse.json({ users: [] });
      }

      // Search users by name or email
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
        isActive: true,
      })
        .select('_id name email companyId')
        .populate('companyId', 'name')
        .limit(20)
        .lean();

      return NextResponse.json({
        users: users.map((u: any) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          companyId: u.companyId?._id?.toString() || u.companyId?.toString(),
          companyName: (u.companyId as any)?.name || '',
        })),
      });
    } catch (error) {
      console.error('Error searching users:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }
  })(req);
}

