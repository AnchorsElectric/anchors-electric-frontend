'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import { canAccessRoute, getDefaultRoute, UserRole } from '@/lib/config/routes';
import { formatPhoneNumber } from '@/lib/utils/phone-format';
import styles from './users.module.scss';

interface User {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    paymentType: string;
    ptoCredit?: number;
    weeklyPtoRate?: number;
    sickDaysLeft?: number;
  } | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    checkAccess();
  }, [router]);

  const checkAccess = async () => {
    try {
      setCheckingAccess(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const data = response.data as any;
        const role = (data.user?.role || null) as UserRole | null;
        setUserRole(role);

        if (!role) {
          router.push('/login');
          return;
        }

        // Check if user can access the users route
        if (!canAccessRoute('/admin/users', role)) {
          router.push('/unauthorized');
          return;
        }

        // Load users if access is granted
        loadUsers();
      } else {
        router.push('/login');
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setCheckingAccess(false);
    }
  };

  const loadUsers = async (search?: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getUsers(search);
      if (response.success && response.data) {
        const usersData = (response.data as any).users || [];
        setUsers(usersData);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchTerm);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Debounce search - search after user stops typing for 500ms
    if (value === '') {
      loadUsers();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        loadUsers(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);


  if (checkingAccess) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Checking access...</div>
      </div>
    );
  }

  if (!userRole || !canAccessRoute('/admin/users', userRole)) {
    return null; // Will redirect
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                loadUsers();
              }}
              className={styles.clearButton}
            >
              Clear
            </button>
          )}
        </form>
        <div className={styles.userCount}>
          {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''} found`}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Employee Profile</th>
                <th>PTO Days</th>
                <th>Sick Days</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.noData}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr 
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className={styles.clickableRow}
                  >
                    <td>
                      {user.firstName}
                      {user.middleName ? ` ${user.middleName}` : ''} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{formatPhoneNumber(user.phone || '') || 'N/A'}</td>
                    <td>
                      <span className={`${styles.role} ${styles[user.role.toLowerCase()]}`}>
                        {user.role === 'PROJECT_MANAGER' ? 'PM' : user.role}
                      </span>
                    </td>
                    <td>
                      {user.isActive ? (
                        <span className={styles.activeStatus}>Active</span>
                      ) : (
                        <span className={styles.inactiveStatus}>Deactivated</span>
                      )}
                    </td>
                    <td>
                      {user.employee && user.employee !== null ? (
                        <span className={styles.hasEmployeeProfile}>
                          ✓ Active
                        </span>
                      ) : (
                        <span className={styles.noEmployeeProfile}>✗ Not Created</span>
                      )}
                    </td>
                    <td>
                      {user.employee?.ptoCredit !== undefined && user.employee.ptoCredit !== null
                        ? `${user.employee.ptoCredit.toFixed(2)}h`
                        : 'N/A'}
                    </td>
                    <td>
                      {user.employee?.sickDaysLeft !== undefined && user.employee.sickDaysLeft !== null
                        ? user.employee.sickDaysLeft
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

