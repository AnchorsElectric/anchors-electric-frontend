'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import { canAccessRoute, getDefaultRoute, UserRole } from '@/lib/config/routes';
import AppNavigation from '@/components/navigation/AppNavigation';
import styles from './admin-layout.module.scss';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    // Check route access when pathname changes
    if (userRole && pathname && !loading) {
      // Allow nested routes (e.g., /admin/users/[id])
      const basePath = pathname.split('/').slice(0, 3).join('/') || pathname;
      const hasAccess = canAccessRoute(basePath, userRole) || 
                       canAccessRoute(pathname, userRole);
      
      if (!hasAccess) {
        router.push('/unauthorized');
      }
    }
  }, [pathname, userRole, loading, router]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const data = response.data as any;
        const role = (data.user?.role || null) as UserRole | null;
        setUserRole(role);
        setHasEmployeeProfile(!!data.user?.employee);

        if (!role) {
          router.push('/login');
          return;
        }
        
        // Check if user can access any admin routes
        const canAccessAdminRoutes = canAccessRoute('/admin/profile', role) ||
                                   canAccessRoute('/admin/users', role) ||
                                   canAccessRoute('/admin/projects', role) ||
                                   canAccessRoute('/admin/pay-periods', role);

        if (!canAccessAdminRoutes) {
          // User doesn't have access to admin routes, redirect to their default
          const defaultRoute = getDefaultRoute(role);
          router.push(defaultRoute);
          return;
        }

        // Check current route access
        if (pathname) {
          const basePath = pathname.split('/').slice(0, 3).join('/') || pathname;
          const hasAccess = canAccessRoute(basePath, role) || 
                           canAccessRoute(pathname, role);
          
          if (!hasAccess) {
            router.push('/unauthorized');
          }
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

  const handleLogout = () => {
    removeAuthToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <img src="/logo.png" alt="Anchors Electric" className={styles.headerLogo} />
        <h1 className={styles.adminTitle}>Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
      <AppNavigation userRole={userRole} hasEmployeeProfile={hasEmployeeProfile} />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
