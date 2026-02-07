'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import { canAccessRoute, getDefaultRoute, UserRole } from '@/lib/config/routes';
import styles from './protected-route.module.scss';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

/**
 * ProtectedRoute component for Next.js
 * Checks if the current user's role is in the allowedRoles array
 * Redirects to unauthorized page or fallback if access is denied
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  fallbackPath,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [pathname]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const data = response.data as any;
        const role = (data.user?.role || null) as UserRole | null;
        setUserRole(role);

        if (!role) {
          router.push('/login');
          return;
        }

        // Check if user's role is in allowedRoles
        const access = allowedRoles.includes(role);
        setHasAccess(access);

        if (!access) {
          // Redirect to unauthorized page or fallback
          if (fallbackPath) {
            router.push(fallbackPath);
          } else {
            router.push('/unauthorized');
          }
          return;
        }
      } else {
        router.push('/login');
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Checking access...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
