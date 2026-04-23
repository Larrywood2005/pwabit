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

    console.log('[v0] ProtectedRoute check:', { 
      requireAdmin, 
      requireUser, 
      hasAdmin: !!admin, 
      hasUser: !!user,
      isPublicRoute: !requireAdmin && !requireUser
    });

    // Redirect if admin is required but not authenticated
    if (requireAdmin && !admin) {
      console.log('[v0] Admin required but not authenticated, redirecting to admin login');
      router.push('/auth/admin-login');
      return;
    }

    // Redirect if user is required but not authenticated
    if (requireUser && !user) {
      console.log('[v0] User required but not authenticated, redirecting to user login');
      router.push('/auth/login');
      return;
    }

    // If we reach here, access is allowed
    if (requireAdmin && admin) {
      console.log('[v0] Admin authenticated, access granted');
    } else if (requireUser && user) {
      console.log('[v0] User authenticated, access granted');
    } else if (!requireAdmin && !requireUser) {
      console.log('[v0] Public route, access granted');
    }
  }, [isLoading, user, admin, requireAdmin, requireUser, router]);

  // Show loading state while checking authentication
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

  // Deny access if admin is required but not authenticated
  if (requireAdmin && !admin) {
    return null;
  }

  // Deny access if user is required but not authenticated
  if (requireUser && !user) {
    return null;
  }

  // Allow access: either requirements are met, or route is public (no requirements)
  return <>{children}</>;
}
