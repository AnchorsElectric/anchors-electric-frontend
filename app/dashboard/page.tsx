'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import styles from './dashboard.module.scss';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

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

