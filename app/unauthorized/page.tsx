'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import { getDefaultRoute, UserRole } from '@/lib/config/routes';
import styles from './unauthorized.module.scss';

export default function UnauthorizedPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
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
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    if (userRole) {
      router.push(getDefaultRoute(userRole));
    } else {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <img src="/logo.png" alt="Anchors Electric" className={styles.logo} />
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Anchors Electric" className={styles.logo} />
        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.message}>
          You don't have permission to access this page.
        </p>
        <button onClick={handleGoToDashboard} className={styles.button}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
