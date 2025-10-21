'use client';
import { SessionProvider, useSession } from 'next-auth/react';
export function AuthProvider({ children }) {
    return <SessionProvider>{children}</SessionProvider>;
}
export function useAuth() {
    const { data: session, status } = useSession();
    return { user: session?.user, status };
}
