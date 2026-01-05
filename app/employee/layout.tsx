'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import styles from './employee-layout.module.scss';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'time-entries' | 'time-entries-history' | 'profile'>('profile');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    checkEmployeeProfile();
  }, [router]);

  useEffect(() => {
    // Set active tab based on current path
    if (pathname === '/employee/time-entries') {
      setActiveTab('time-entries');
    } else if (pathname === '/employee/time-entries/history') {
      setActiveTab('time-entries-history');
    } else if (pathname === '/employee/profile') {
      setActiveTab('profile');
    } else {
      // Default to profile if path doesn't match
      setActiveTab('profile');
    }
  }, [pathname]);

  const checkEmployeeProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const user = (response.data as any).user;
        const isUserAdmin = (response.data as any).isAdmin || false;
        
        // Redirect admins away from employee section
        if (isUserAdmin) {
          router.push('/admin/profile');
          return;
        }

        // Check if user has employee profile
        if (user.employee && user.employee !== null && user.employee !== undefined) {
          setHasEmployeeProfile(true);
        } else {
          // User doesn't have employee profile, redirect to dashboard
          router.push('/dashboard');
        }
      }
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    router.push('/login');
  };

  const handleTabClick = (tab: 'time-entries' | 'time-entries-history' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'time-entries') {
      router.push('/employee/time-entries');
    } else if (tab === 'time-entries-history') {
      router.push('/employee/time-entries/history');
    } else {
      router.push('/employee/profile');
    }
  };

  if (loading) {
    return (
      <div className={styles.employeeContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!hasEmployeeProfile) {
    return null;
  }

  return (
    <div className={styles.employeeContainer}>
      <div className={styles.employeeHeader}>
        <h1 className={styles.employeeTitle}>Employee Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
          onClick={() => handleTabClick('profile')}
        >
          Profile
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'time-entries' ? styles.activeTab : ''}`}
          onClick={() => handleTabClick('time-entries')}
        >
          Time Entries
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'time-entries-history' ? styles.activeTab : ''}`}
          onClick={() => handleTabClick('time-entries-history')}
        >
          Time Entries History
        </button>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}

