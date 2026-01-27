'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const token = getAuthToken();
      
      if (!token) {
        router.push('/login');
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
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return null;
}
