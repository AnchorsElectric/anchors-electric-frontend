'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import { canAccessRoute, getDefaultRoute, UserRole } from '@/lib/config/routes';
import AppNavigation from '@/components/navigation/AppNavigation';
import styles from './employee-layout.module.scss';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
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
      // Allow nested routes
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

        if (!role) {
          router.push('/login');
          return;
        }

        // Check if user can access any employee routes
        const canAccessEmployeeRoutes = canAccessRoute('/employee/profile', role) ||
                                      canAccessRoute('/employee/time-entries', role) ||
                                      canAccessRoute('/employee/pay-periods', role);

        // Staff roles might access admin routes, so don't redirect them away
        if (!canAccessEmployeeRoutes && role === 'USER') {
          router.push(getDefaultRoute(role));
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
      <div className={styles.employeeContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <div className={styles.employeeContainer}>
      <div className={styles.employeeHeader}>
        <img src="/logo.png" alt="Anchors Electric" className={styles.headerLogo} />
        <h1 className={styles.employeeTitle}>Employee Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
      <AppNavigation userRole={userRole} />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
