'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './history.module.scss';

interface DayEntry {
  id: string;
  date: string;
  hours: number | null;
  status: string;
  rejectionReason?: string | null;
}

interface WeeklyTimeEntry {
  id: string;
  entryIds: string[];
  employeeId: string;
  weekStart: string;
  weekEnd: string;
  weekRange: string;
  totalHours: number | null;
  daysCount: number;
  paymentType: 'HOURLY' | 'SALARY';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedAt: string | null;
  entries?: DayEntry[];
  employee: {
    id: string;
    paymentType: 'HOURLY' | 'SALARY';
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export default function TimeEntriesHistoryPage() {
  const router = useRouter();
  const [timeEntries, setTimeEntries] = useState<WeeklyTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedRejectedEntries, setExpandedRejectedEntries] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadTimeEntries();
  }, [router, statusFilter]);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getSubmittedTimeEntries({ 
        status: statusFilter === 'ALL' ? 'ALL' : statusFilter 
      });
      if (response.success && response.data) {
        const entries = (response.data as any).timeEntries || [];
        console.log('Loaded time entries:', entries.length, entries);
        setTimeEntries(entries);
      } else {
        setError(response.error || 'Failed to load time entries');
      }
    } catch (err: any) {
      console.error('Error loading time entries:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (entryId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedWeeks(newExpanded);
  };

  const toggleRejectedEntry = (entryId: string) => {
    const newExpanded = new Set(expandedRejectedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedRejectedEntries(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('default', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return styles.paidBadge;
      case 'APPROVED':
        return styles.approvedBadge;
      case 'SUBMITTED':
        return styles.submittedBadge;
      case 'REJECTED':
        return styles.rejectedBadge;
      case 'DRAFT':
        return styles.draftBadge;
      default:
        return styles.draftBadge;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Time Entries History</h1>
          <div className={styles.filters}>
            <label htmlFor="statusFilter">Filter by Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.statusSelect}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {timeEntries.length === 0 ? (
          <div className={styles.noData}>
            <p>No time entries found{statusFilter !== 'ALL' ? ` with status "${statusFilter}"` : ' (excluding draft entries)'}.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Week</th>
                  <th>Total Hours</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => {
                  const isExpanded = expandedWeeks.has(entry.id);
                  const dayEntries = entry.entries || [];
                  
                  return (
                    <React.Fragment key={entry.id}>
                      <tr 
                        className={`${styles.weekRow} ${isExpanded ? styles.expanded : ''}`}
                      >
                        <td onClick={() => toggleExpand(entry.id)}>
                          <div className={styles.expandableCell}>
                            <span className={styles.expandIcon}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <div>
                              {entry.employee.user.firstName} {entry.employee.user.lastName}
                            </div>
                          </div>
                        </td>
                        <td onClick={() => toggleExpand(entry.id)}>{entry.weekRange || 'N/A'}</td>
                        <td onClick={() => toggleExpand(entry.id)}>
                          {entry.paymentType === 'HOURLY' 
                            ? (entry.totalHours !== null && entry.totalHours !== undefined ? `${entry.totalHours}h` : '0h')
                            : 'N/A'}
                        </td>
                        <td onClick={() => toggleExpand(entry.id)}>{entry.daysCount !== null && entry.daysCount !== undefined ? `${entry.daysCount} day${entry.daysCount !== 1 ? 's' : ''}` : '0 days'}</td>
                        <td onClick={() => toggleExpand(entry.id)}>
                          <span className={getStatusBadgeClass(entry.status)}>
                            {entry.status}
                          </span>
                        </td>
                        <td onClick={() => toggleExpand(entry.id)}>
                          {entry.submittedAt 
                            ? new Date(entry.submittedAt).toLocaleString()
                            : 'N/A'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <>
                          <tr className={styles.dayHeaderRow}>
                            <td colSpan={6} className={styles.dayHeader}>
                              <strong>Individual Days {dayEntries.length > 0 ? `(${dayEntries.length} days)` : '(No entries)'}</strong>
                            </td>
                          </tr>
                          {dayEntries.length > 0 ? (
                            dayEntries.map((dayEntry) => {
                              const isRejectedExpanded = expandedRejectedEntries.has(dayEntry.id);
                              const isRejected = dayEntry.status === 'REJECTED';
                              
                              return (
                                <React.Fragment key={dayEntry.id}>
                                  <tr className={styles.dayRow}>
                                    <td>
                                      <div className={styles.expandableCell}>
                                        <span className={styles.expandIcon}></span>
                                        <div></div>
                                      </div>
                                    </td>
                                    <td>{formatDate(dayEntry.date)}</td>
                                    <td>
                                      {entry.paymentType === 'HOURLY' 
                                        ? (dayEntry.hours !== null && dayEntry.hours !== undefined ? `${dayEntry.hours}h` : '0h')
                                        : 'Working day'}
                                    </td>
                                    <td>1 day</td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className={getStatusBadgeClass(dayEntry.status)}>
                                          {dayEntry.status}
                                        </span>
                                        {isRejected && dayEntry.rejectionReason && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleRejectedEntry(dayEntry.id);
                                            }}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              cursor: 'pointer',
                                              color: '#0070f3',
                                              fontSize: '0.75rem',
                                              padding: '0.25rem 0.5rem',
                                            }}
                                          >
                                            {isRejectedExpanded ? '▼ Hide Reason' : '▶ Show Reason'}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      {entry.submittedAt 
                                        ? new Date(entry.submittedAt).toLocaleString()
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                  {isRejected && isRejectedExpanded && dayEntry.rejectionReason && (
                                    <tr className={styles.rejectionReasonRow}>
                                      <td colSpan={6} className={styles.rejectionReasonCell}>
                                        <strong>Rejection Reason:</strong> {dayEntry.rejectionReason}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <tr className={styles.dayRow}>
                              <td colSpan={6} style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                No individual day entries available
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

