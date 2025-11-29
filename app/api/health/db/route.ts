import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    };

    // Try to connect to database
    let dbStatus = 'disconnected';
    let dbError = null;
    let userCount = 0;

    try {
      await connectDB();
      dbStatus = 'connected';
      
      // Try to query users collection
      try {
        userCount = await User.countDocuments();
      } catch (queryError: any) {
        dbError = `Query failed: ${queryError.message}`;
      }
    } catch (connectionError: any) {
      dbStatus = 'error';
      dbError = connectionError.message;
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        ...envCheck,
        NODE_ENV: process.env.NODE_ENV,
      },
      database: {
        status: dbStatus,
        error: dbError,
        userCount,
      },
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

