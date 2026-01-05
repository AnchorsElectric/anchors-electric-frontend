'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './time-entries.module.scss';

interface DayEntry {
  id: string;
  date: string;
  hours: number | null;
  status: string;
  rejectionReason?: string | null;
}

interface WeeklyTimeEntry {
  id: string; // Comma-separated entry IDs
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
  entries?: DayEntry[]; // Individual day entries
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

export default function AdminTimeEntriesPage() {
  const router = useRouter();
  const [timeEntries, setTimeEntries] = useState<WeeklyTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedRejectedEntries, setExpandedRejectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadTimeEntries();
  }, [router]);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      setError('');
      // Load both SUBMITTED and APPROVED entries
      const [submittedResponse, approvedResponse] = await Promise.all([
        apiClient.getSubmittedTimeEntries({ status: 'SUBMITTED' }),
        apiClient.getSubmittedTimeEntries({ status: 'APPROVED' }),
      ]);
      
      const submittedEntries = submittedResponse.success && submittedResponse.data 
        ? (submittedResponse.data as any).timeEntries || [] 
        : [];
      const approvedEntries = approvedResponse.success && approvedResponse.data 
        ? (approvedResponse.data as any).timeEntries || [] 
        : [];
      
      // Combine and sort by submittedAt (most recent first)
      const allEntries = [...submittedEntries, ...approvedEntries].sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setTimeEntries(allEntries);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    if (!confirm('Are you sure you want to approve this week\'s time entries?')) {
      return;
    }

    try {
      setProcessing(entryId);
      setError('');
      setSuccess('');
      const response = await apiClient.approveTimeEntry(entryId);
      if (response.success) {
        setSuccess(response.message || 'Time entries approved successfully');
        await loadTimeEntries();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to approve time entries');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve time entries');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (entryId: string) => {
    const reason = rejectionReason[entryId] || '';
    
    try {
      setProcessing(entryId);
      setError('');
      setSuccess('');
      const response = await apiClient.rejectTimeEntry(entryId, reason);
      if (response.success) {
        setSuccess(response.message || 'Time entries rejected successfully');
        setShowRejectModal(null);
        setRejectionReason({ ...rejectionReason, [entryId]: '' });
        await loadTimeEntries();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to reject time entries');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject time entries');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAsPaid = async (entryId: string) => {
    if (!confirm('Are you sure you want to mark this week\'s time entries as paid?')) {
      return;
    }

    try {
      setProcessing(entryId);
      setError('');
      setSuccess('');
      const response = await apiClient.markTimeEntryAsPaid(entryId);
      if (response.success) {
        setSuccess(response.message || 'Time entries marked as paid successfully');
        await loadTimeEntries();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to mark time entries as paid');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark time entries as paid');
    } finally {
      setProcessing(null);
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
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {timeEntries.length === 0 ? (
          <div className={styles.noData}>
            <p>No submitted time entries to review.</p>
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
                  <th>Submitted At</th>
                  <th>Actions</th>
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
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <td>
                          <div className={styles.expandableCell}>
                            <span className={styles.expandIcon}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <div>
                              {entry.employee.user.firstName} {entry.employee.user.lastName}
                            </div>
                          </div>
                        </td>
                        <td>{entry.weekRange || 'N/A'}</td>
                        <td>
                          {entry.paymentType === 'HOURLY' 
                            ? (entry.totalHours !== null && entry.totalHours !== undefined ? `${entry.totalHours}h` : '0h')
                            : 'N/A'}
                        </td>
                        <td>{entry.daysCount !== null && entry.daysCount !== undefined ? `${entry.daysCount} day${entry.daysCount !== 1 ? 's' : ''}` : '0 days'}</td>
                        <td>
                          {entry.submittedAt 
                            ? new Date(entry.submittedAt).toLocaleString()
                            : 'N/A'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className={styles.actions}>
                            {entry.status === 'SUBMITTED' && (
                              <>
                                <button
                                  onClick={() => handleApprove(entry.id)}
                                  disabled={processing === entry.id}
                                  className={styles.approveButton}
                                >
                                  {processing === entry.id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(entry.id)}
                                  disabled={processing === entry.id}
                                  className={styles.rejectButton}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {entry.status === 'APPROVED' && (
                              <button
                                onClick={() => handleMarkAsPaid(entry.id)}
                                disabled={processing === entry.id}
                                className={styles.paidButton}
                              >
                                {processing === entry.id ? 'Processing...' : 'Mark as Paid'}
                              </button>
                            )}
                            {entry.status === 'PAID' && (
                              <span className={styles.paidBadge}>Paid</span>
                            )}
                            {entry.status === 'REJECTED' && (
                              <span className={styles.rejectedBadge}>Rejected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <>
                          <tr className={styles.dayHeaderRow}>
                            <td colSpan={6} className={styles.dayHeader}>
                              <strong>Individual Days {dayEntries.length > 0 ? `(${dayEntries.length} days)` : '(No entries)'}</strong>
                            </td>
                          </tr>
                          {dayEntries.length > 0 ? dayEntries.map((dayEntry) => {
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
                          }) : (
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

        {/* Reject Modal */}
        {showRejectModal && (
          <div className={styles.modalOverlay} onClick={() => setShowRejectModal(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Reject Time Entries</h2>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowRejectModal(null)}
                  disabled={processing === showRejectModal}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Please provide a reason for rejecting this week's time entries (optional):</p>
                <textarea
                  value={rejectionReason[showRejectModal] || ''}
                  onChange={(e) => setRejectionReason({
                    ...rejectionReason,
                    [showRejectModal]: e.target.value,
                  })}
                  placeholder="Rejection reason..."
                  className={styles.reasonInput}
                  rows={4}
                  disabled={processing === showRejectModal}
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowRejectModal(null)}
                  disabled={processing === showRejectModal}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmRejectButton}
                  onClick={() => handleReject(showRejectModal)}
                  disabled={processing === showRejectModal}
                >
                  {processing === showRejectModal ? 'Processing...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

