'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import styles from './admin-layout.module.scss';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'profile' | 'projects' | 'pay-periods'>('profile');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    checkAdminStatus();
  }, [router]);

  useEffect(() => {
    // Set active tab based on current path
    if (pathname?.startsWith('/admin/users')) {
      setActiveTab('users');
    } else if (pathname?.startsWith('/admin/projects')) {
      setActiveTab('projects');
    } else if (pathname?.startsWith('/admin/pay-periods')) {
      setActiveTab('pay-periods');
    } else if (pathname === '/admin/profile') {
      setActiveTab('profile');
    } else {
      // Default to profile if path doesn't match
      setActiveTab('profile');
    }
  }, [pathname]);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const isUserAdmin = (response.data as any).isAdmin || false;
        setIsAdmin(isUserAdmin);
        if (!isUserAdmin) {
          // Check if user has employee profile
          const user = (response.data as any).user;
          const hasEmployeeProfile = user?.employee && user.employee !== null && user.employee !== undefined;
          if (hasEmployeeProfile) {
            router.push('/employee/profile');
          } else {
            router.push('/employee/profile');
          }
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

  const handleTabClick = (tab: 'users' | 'profile' | 'projects' | 'pay-periods') => {
    setActiveTab(tab);
    if (tab === 'users') {
      router.push('/admin/users');
    } else if (tab === 'projects') {
      router.push('/admin/projects');
    } else if (tab === 'pay-periods') {
      router.push('/admin/pay-periods');
    } else {
      router.push('/admin/profile');
    }
  };

  if (loading) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>Admin Dashboard</h1>
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
          className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => handleTabClick('users')}
        >
          Manage Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'projects' ? styles.activeTab : ''}`}
          onClick={() => handleTabClick('projects')}
        >
          Projects
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'pay-periods' ? styles.activeTab : ''}`}
          onClick={() => handleTabClick('pay-periods')}
        >
          Pay Periods
        </button>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}

