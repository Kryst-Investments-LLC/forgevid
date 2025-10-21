'use client';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  if (status === 'loading') return <div>Loading...</div>;
  if (!user) {
    router.push('/auth/signin');
    return null;
  }
  return <>{children}</>;
}
