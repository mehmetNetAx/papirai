import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

export async function GET() {
  const startTime = Date.now();
  const results: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {},
    database: {},
    users: {},
    connectionDetails: {},
  };

  try {
    // Check environment variables
    results.environment = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      MONGODB_URI_PREFIX: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'NOT SET',
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    };

    // Try to connect to database
    let dbStatus = 'disconnected';
    let dbError = null;
    let connectionState = 'unknown';
    let userCount = 0;
    let activeUserCount = 0;
    let sampleUsers: any[] = [];

    try {
      await connectDB();
      dbStatus = 'connected';
      
      // Get connection state
      connectionState = mongoose.connection.readyState === 1 ? 'connected' : 
                        mongoose.connection.readyState === 2 ? 'connecting' :
                        mongoose.connection.readyState === 0 ? 'disconnected' : 'unknown';
      
      results.connectionDetails = {
        readyState: mongoose.connection.readyState,
        state: connectionState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      };
      
      // Try to query users collection
      try {
        userCount = await User.countDocuments();
        activeUserCount = await User.countDocuments({ isActive: true });
        
        // Get sample users (without password)
        sampleUsers = await User.find({})
          .select('-password')
          .limit(5)
          .lean()
          .exec();
      } catch (queryError: any) {
        dbError = `Query failed: ${queryError.message}`;
      }
    } catch (connectionError: any) {
      dbStatus = 'error';
      dbError = connectionError.message;
      results.connectionDetails = {
        error: connectionError.message,
        stack: connectionError.stack?.substring(0, 200),
      };
    }

    results.database = {
      status: dbStatus,
      error: dbError,
      userCount,
      activeUserCount,
      connectionDetails: results.connectionDetails,
    };

    results.users = {
      total: userCount,
      active: activeUserCount,
      sample: sampleUsers.map((u: any) => ({
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        companyId: u.companyId?.toString(),
      })),
    };

    results.duration = Date.now() - startTime;

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack?.substring(0, 200),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

