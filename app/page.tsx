'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthToken, setAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
import styles from './page.module.scss';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkIfLoggedIn = async () => {
      const token = getAuthToken();
      
      if (!token) {
        setCheckingAuth(false);
        if (searchParams.get('registered') === 'true') {
          setSuccess('Registration successful! Please check your email to verify your account before logging in.');
        }
        return;
      }

      try {
        const response = await apiClient.getProfile();
        if (response.success && response.data) {
          const user = (response.data as any).user;
          const isAdmin = user?.role === 'ADMIN';
          
          if (isAdmin) {
            router.push('/admin/profile');
          } else {
            router.push('/employee/profile');
          }
          return;
        }
      } catch (error) {
        // Token might be invalid, continue to show login
      }
      
      setCheckingAuth(false);
      if (searchParams.get('registered') === 'true') {
        setSuccess('Registration successful! Please check your email to verify your account before logging in.');
      }
    };

    checkIfLoggedIn();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.login(email, password);
      if (response.success && response.data) {
        const { token, user } = response.data as { token: string; user: any };
        setAuthToken(token);
        
        if (user?.role === 'ADMIN') {
          router.push('/admin/profile');
        } else {
          router.push('/employee/profile');
        }
      } else {
        setError(response.error || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        {success && <div className={styles.success}>{success}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className={styles.forgotPassword}>
          <a href="/forgot-password" className={styles.forgotLink}>
            Forgot Password?
          </a>
        </div>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <a href="/register" className={styles.link}>
            Register
          </a>
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
