import NextAuth, { AuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import GoogleProvider from 'next-auth/providers/google';
import { UserRole } from '@prisma/client';

export const authOptions: AuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled due to type conflicts
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
        async session({ session, user }) {
          if (session.user && user) {
            session.user.id = user.id;
            session.user.role = user.role;
          }
          return session;
        },
        async jwt({ token, user }) {
          if (user) {
            token.id = user.id;
            token.role = user.role;
          }
          return token;
        },
  },
};

export default NextAuth(authOptions);

// JWT verification utility
export async function verifyJWT(token: string): Promise<any> {
  try {
    const decoded = await import('jsonwebtoken').then(jwt => 
      jwt.verify(token, process.env.NEXTAUTH_SECRET!)
    );
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
