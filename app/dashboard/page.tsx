'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import { getDefaultRoute, type UserRole } from '@/lib/config/routes';
import styles from './dashboard.module.scss';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    checkAdminStatus();
  }, [router]);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const data = response.data as any;
        const role = (data.user?.role || null) as UserRole | null;
        setIsAdmin(role === 'ADMIN');
        
        if (role) {
          router.push(getDefaultRoute(role));
        } else {
          router.push('/login');
        }
      }
    } catch (err) {
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
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

