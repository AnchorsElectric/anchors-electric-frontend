'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
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
  } | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    checkAdminStatus();
    loadUsers();
  }, [router]);

  const checkAdminStatus = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const isUserAdmin = (response.data as any).isAdmin || false;
        setIsAdmin(isUserAdmin);
        if (!isUserAdmin) {
          router.push('/employee/profile');
        }
      }
    } catch (err) {
      router.push('/dashboard');
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


  if (!isAdmin) {
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
                <th>Email Verified</th>
                <th>Created At</th>
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
                    <td>{user.phone}</td>
                    <td>
                      <span className={`${styles.role} ${styles[user.role.toLowerCase()]}`}>
                        {user.role}
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
                      {user.emailVerified ? (
                        <span className={styles.verified}>✓ Verified</span>
                      ) : (
                        <span className={styles.unverified}>✗ Not Verified</span>
                      )}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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

