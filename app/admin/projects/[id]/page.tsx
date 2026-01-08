'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from '../projects.module.scss';

interface EmployeeHours {
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHours: number;
  entryCount: number;
}

interface Project {
  id: string;
  name: string;
  jobNumber: string;
  address: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  totalHours: number;
  employeeHours: EmployeeHours[];
  totalEntries: number;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadProject();
  }, [router, projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getProjectById(projectId);
      if (response.success && response.data) {
        setProject((response.data as any).project);
      } else {
        setError(response.error || 'Failed to load project');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => router.push('/admin/projects')} className={styles.backButton}>
          ← Back to Projects
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Project not found</div>
        <button onClick={() => router.push('/admin/projects')} className={styles.backButton}>
          ← Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Project Details</h1>
        <button onClick={() => router.push('/admin/projects')} className={styles.backButton}>
          ← Back to Projects
        </button>
      </div>

      <div className={styles.projectDetails}>
        <div className={styles.detailSection}>
          <h2>Project Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Project Name</label>
              <div className={styles.infoValue}>{project.name}</div>
            </div>
            <div className={styles.infoItem}>
              <label>Job Number</label>
              <div className={styles.infoValue}>{project.jobNumber}</div>
            </div>
            <div className={styles.infoItem}>
              <label>Address</label>
              <div className={styles.infoValue}>{project.address}</div>
            </div>
            <div className={styles.infoItem}>
              <label>Client Name</label>
              <div className={styles.infoValue}>{project.clientName}</div>
            </div>
            <div className={styles.infoItem}>
              <label>Created At</label>
              <div className={styles.infoValue}>
                {new Date(project.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
            <div className={styles.infoItem}>
              <label>Last Updated</label>
              <div className={styles.infoValue}>
                {new Date(project.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.detailSection}>
          <h2>Time Entry Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Hours Billed</div>
              <div className={styles.statValue}>{project.totalHours.toFixed(2)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Time Entries</div>
              <div className={styles.statValue}>{project.totalEntries}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Employees Who Billed</div>
              <div className={styles.statValue}>{project.employeeHours.length}</div>
            </div>
          </div>
        </div>

        <div className={styles.detailSection}>
          <h2>Employees Who Billed This Project</h2>
          {project.employeeHours.length === 0 ? (
            <p className={styles.emptyMessage}>No time entries have been logged for this project yet.</p>
          ) : (
            <div className={styles.employeeTable}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Email</th>
                    <th>Total Hours</th>
                    <th>Time Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {project.employeeHours.map((employee) => (
                    <tr key={employee.employeeId}>
                      <td>{employee.firstName} {employee.lastName}</td>
                      <td>{employee.email}</td>
                      <td>{employee.totalHours.toFixed(2)}</td>
                      <td>{employee.entryCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

