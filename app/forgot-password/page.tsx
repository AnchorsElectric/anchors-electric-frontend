'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import styles from './forgot-password.module.scss';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.forgotPassword(email);
      if (response.success) {
        setSuccess(response.message || 'Password reset email sent. Please check your inbox.');
      } else {
        setError(response.error || 'Failed to send password reset email');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Anchors Electric" className={styles.logo} />
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</p>

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
              placeholder="Enter your email address"
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className={styles.footer}>
          Remember your password?{' '}
          <a href="/login" className={styles.link}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}

