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
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('[Auth] Missing credentials');
            return null;
          }

          // Check if NEXTAUTH_SECRET is set
          if (!process.env.NEXTAUTH_SECRET) {
            console.error('[Auth] NEXTAUTH_SECRET is not set');
            return null;
          }

          // Check if MONGODB_URI is set
          if (!process.env.MONGODB_URI) {
            console.error('[Auth] MONGODB_URI is not set');
            return null;
          }

          // Connect to database
          try {
            await connectDB();
          } catch (dbError: any) {
            console.error('[Auth] Database connection failed:', dbError.message);
            return null;
          }

          // Find user
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');

          if (!user) {
            console.error('[Auth] User not found:', credentials.email.toLowerCase());
            return null;
          }

          if (!user.isActive) {
            console.error('[Auth] User is not active:', user.email);
            return null;
          }

          // Verify password
          if (!user.password) {
            console.error('[Auth] User password field is missing');
            return null;
          }

          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.error('[Auth] Invalid password for user:', user.email);
            return null;
          }

          // Update last login
          try {
            user.lastLogin = new Date();
            await user.save({ validateBeforeSave: false });
          } catch (saveError: any) {
            // Don't fail auth if save fails, just log it
            console.warn('[Auth] Failed to update last login:', saveError.message);
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId.toString(),
            groupId: user.groupId?.toString(),
          };
        } catch (error: any) {
          console.error('[Auth] Authorization error:', error.message || error);
          console.error('[Auth] Error stack:', error.stack);
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

