import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
export const authOptions = {
    // adapter: PrismaAdapter(prisma), // Temporarily disabled due to type conflicts
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
export async function verifyJWT(token) {
    try {
        const decoded = await import('jsonwebtoken').then(jwt => jwt.verify(token, process.env.NEXTAUTH_SECRET));
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid token');
    }
}
