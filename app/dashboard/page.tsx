'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
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

    if (searchParams.get('profileUpdated') === 'true') {
      setShowSuccess(true);
      // Clear the query parameter
      router.replace('/dashboard', { scroll: false });
      // Hide message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
  }, [router, searchParams]);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const isUserAdmin = (response.data as any).isAdmin || false;
        setIsAdmin(isUserAdmin);
      }
    } catch (err) {
      console.error('Failed to check admin status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome to Anchors Electric</p>
        
        {showSuccess && (
          <div className={styles.success}>
            Profile has been updated successfully!
          </div>
        )}

        <div className={styles.actions}>
          <a href="/profile/edit" className={styles.editButton}>
            Edit Profile
          </a>
          {isAdmin && (
            <a href="/admin/users" className={styles.adminButton}>
              Manage Users
            </a>
          )}
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
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

