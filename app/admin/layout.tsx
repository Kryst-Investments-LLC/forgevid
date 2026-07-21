import { redirect } from 'next/navigation';
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac';

/**
 * Server-side gate for EVERY /admin/* page.
 *
 * The admin API routes already 403 non-admins, but the pages themselves
 * rendered for anyone. Role is read fresh from the DB (getFreshSessionUser),
 * not from the JWT, so a demoted admin loses access on their next request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getFreshSessionUser();
  if (!user || !isAdminRole(user.role)) {
    redirect('/unauthorized');
  }
  return <>{children}</>;
}
