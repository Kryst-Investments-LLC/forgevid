'use client';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
export function ProtectedRoute({ children }) {
    const { user, status } = useAuth();
    const router = useRouter();
    if (status === 'loading')
        return <div>Loading...</div>;
    if (!user) {
        router.push('/auth/signin');
        return null;
    }
    return <>{children}</>;
}
