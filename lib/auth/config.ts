import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const startTime = Date.now();
        const email = credentials?.email?.toLowerCase().trim();
        
        try {
          // Step 1: Validate credentials
          if (!credentials?.email || !credentials?.password) {
            console.error('[Auth] Missing credentials - email or password not provided');
            return null;
          }

          console.log(`[Auth] Attempting login for: ${email}`);

          // Step 2: Check environment variables
          if (!process.env.NEXTAUTH_SECRET) {
            console.error('[Auth] NEXTAUTH_SECRET is not set');
            console.error('[Auth] This is a critical configuration error. Please set NEXTAUTH_SECRET in Vercel environment variables.');
            throw new Error('Authentication configuration error: NEXTAUTH_SECRET is missing');
          }

          if (!process.env.MONGODB_URI) {
            console.error('[Auth] MONGODB_URI is not set');
            console.error('[Auth] This is a critical configuration error. Please set MONGODB_URI in Vercel environment variables.');
            throw new Error('Database configuration error: MONGODB_URI is missing');
          }

          if (!process.env.NEXTAUTH_URL) {
            console.warn('[Auth] NEXTAUTH_URL is not set - this may cause issues in production');
          }

          // Step 3: Connect to database
          console.log('[Auth] Connecting to database...');
          try {
            await connectDB();
            console.log('[Auth] Database connection successful');
          } catch (dbError: any) {
            console.error('[Auth] Database connection failed:', dbError.message);
            console.error('[Auth] Database error stack:', dbError.stack);
            console.error('[Auth] MONGODB_URI format check:', process.env.MONGODB_URI?.substring(0, 20) + '...');
            throw new Error(`Database connection failed: ${dbError.message}`);
          }

          // Step 4: Find user
          console.log(`[Auth] Searching for user: ${email}`);
          const user = await User.findOne({ email }).select('+password');

          if (!user) {
            console.error(`[Auth] User not found: ${email}`);
            console.error('[Auth] Make sure the user exists in the database. Check if seed script was run.');
            return null;
          }

          console.log(`[Auth] User found: ${user.email}, isActive: ${user.isActive}, role: ${user.role}`);

          // Step 5: Check if user is active
          if (!user.isActive) {
            console.error(`[Auth] User is not active: ${user.email}`);
            return null;
          }

          // Step 6: Verify password
          if (!user.password) {
            console.error('[Auth] User password field is missing - this should not happen');
            return null;
          }

          console.log('[Auth] Verifying password...');
          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.error(`[Auth] Invalid password for user: ${user.email}`);
            return null;
          }

          console.log('[Auth] Password verified successfully');

          // Step 7: Update last login
          try {
            user.lastLogin = new Date();
            await user.save({ validateBeforeSave: false });
            console.log('[Auth] Last login updated');
          } catch (saveError: any) {
            // Don't fail auth if save fails, just log it
            console.warn('[Auth] Failed to update last login:', saveError.message);
          }

          const duration = Date.now() - startTime;
          console.log(`[Auth] Login successful for ${email} (took ${duration}ms)`);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId.toString(),
            groupId: user.groupId?.toString(),
          };
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error(`[Auth] Authorization error (took ${duration}ms):`, error.message || error);
          console.error('[Auth] Error stack:', error.stack);
          console.error('[Auth] Error type:', error.constructor.name);
          
          // Log environment info for debugging (without sensitive data)
          console.error('[Auth] Environment check:', {
            hasNEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            hasMONGODB_URI: !!process.env.MONGODB_URI,
            hasNEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
            NODE_ENV: process.env.NODE_ENV,
          });
          
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.groupId = user.groupId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string;
        session.user.groupId = token.groupId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

