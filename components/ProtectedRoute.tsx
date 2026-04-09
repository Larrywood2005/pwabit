'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireUser?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireUser = false,
}: ProtectedRouteProps) {
  const { isLoading, user, admin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    console.log('[v0] ProtectedRoute check:', { requireAdmin, requireUser, hasAdmin: !!admin, hasUser: !!user });

    if (requireAdmin && !admin) {
      console.log('[v0] Admin required but not authenticated, redirecting to admin login');
      router.push('/auth/admin-login');
    } else if (requireUser && !user) {
      console.log('[v0] User required but not authenticated, redirecting to user login');
      router.push('/auth/login');
    } else if (requireAdmin && admin) {
      console.log('[v0] Admin authenticated successfully, allowing access');
    } else if (requireUser && user) {
      console.log('[v0] User authenticated successfully, allowing access');
    }
  }, [isLoading, user, admin, requireAdmin, requireUser, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !admin) {
    return null;
  }

  if (requireUser && !user) {
    return null;
  }

  return <>{children}</>;
}
