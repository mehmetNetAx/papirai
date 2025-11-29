import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({
        status: 'error',
        error: 'Email is required',
      }, { status: 400 });
    }

    const startTime = Date.now();
    const results: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      email: email.toLowerCase().trim(),
      checks: {},
    };

    // Check environment variables
    results.checks.environment = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      MONGODB_URI: !!process.env.MONGODB_URI,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    };

    // Try to connect to database
    try {
      await connectDB();
      results.checks.databaseConnection = 'success';
    } catch (dbError: any) {
      results.checks.databaseConnection = 'failed';
      results.checks.databaseError = dbError.message;
      return NextResponse.json({
        ...results,
        status: 'error',
        error: 'Database connection failed',
      }, { status: 500 });
    }

    // Find user
    try {
      const user = await User.findOne({ email: results.email }).select('+password');
      
      if (!user) {
        results.checks.userExists = false;
        results.checks.userFound = false;
        return NextResponse.json({
          ...results,
          status: 'error',
          error: 'User not found',
          message: `No user found with email: ${results.email}`,
        }, { status: 404 });
      }

      results.checks.userExists = true;
      results.checks.userFound = true;
      results.user = {
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        companyId: user.companyId?.toString(),
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
      };

      // Check if user is active
      if (!user.isActive) {
        results.checks.userActive = false;
        return NextResponse.json({
          ...results,
          status: 'error',
          error: 'User is not active',
          message: `User ${results.email} exists but is not active`,
        }, { status: 403 });
      }

      results.checks.userActive = true;
      results.status = 'success';
      results.message = `User ${results.email} found and is active. Ready for login.`;

    } catch (queryError: any) {
      results.checks.userQuery = 'failed';
      results.checks.userQueryError = queryError.message;
      return NextResponse.json({
        ...results,
        status: 'error',
        error: 'User query failed',
      }, { status: 500 });
    }

    results.duration = Date.now() - startTime;

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack?.substring(0, 200),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

