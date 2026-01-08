'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './pay-periods.module.scss';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalHours: number | null;
  hasPerDiem: boolean; // For backward compatibility, derived from perDiem
  perDiem?: number; // Numeric value: 0, 0.75, or 1
  sickDay: boolean;
  rotationDay?: boolean;
  isTravelDay: boolean;
  isPTO: boolean;
  isHoliday: boolean;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface PayPeriod {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  totalHours: number | null; // Only regular hours
  totalOvertimeHours: number | null; // Overtime from regular hours only
  totalHolidayHours?: number | null;
  totalSickHours?: number | null;
  totalRotationHours?: number | null;
  totalTravelHours?: number | null;
  totalPtoHours?: number | null;
  totalSickDays: number;
  totalRotationDays?: number;
  totalPto: number;
  totalPerDiem: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  employee: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  timeEntries: TimeEntry[];
}

export default function AdminPayPeriodsPage() {
  const router = useRouter();
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadPayPeriods();
  }, [router, statusFilter]);

  const loadPayPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getSubmittedPayPeriods({ status: statusFilter });
      if (response.success && response.data) {
        const periodsData = (response.data as any).payPeriods || [];
        setPayPeriods(periodsData);
      } else {
        setError(response.error || 'Failed to load pay periods');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load pay periods');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (periodId: string) => {
    setExpandedPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(periodId)) {
        newSet.delete(periodId);
      } else {
        newSet.add(periodId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return styles.statusSubmitted;
      case 'APPROVED':
        return styles.statusApproved;
      case 'REJECTED':
        return styles.statusRejected;
      case 'PAID':
        return styles.statusPaid;
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = formatDate(dateString);
    return `${dayName}, ${formattedDate}`;
  };

  const getEntryType = (entry: TimeEntry): string => {
    if (entry.isPTO) return 'PTO';
    if (entry.isHoliday) return 'Holiday';
    if (entry.sickDay) return 'Sick Day';
    if (entry.rotationDay) return 'Rotation Day';
    if (entry.isTravelDay) return 'Travel Day';
    const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
    if (!entry.startTime && !entry.endTime && perDiemValue > 0) return 'Per Diem Only';
    return 'Regular';
  };

  const handleApprove = async (periodId: string) => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');
      const response = await apiClient.approvePayPeriod(periodId);
      if (response.success) {
        setSuccess('Pay period approved successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadPayPeriods();
      } else {
        setError(response.error || 'Failed to approve pay period');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve pay period');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setSuccess('');
      const response = await apiClient.rejectPayPeriod(selectedPeriodId, rejectionReason);
      if (response.success) {
        setSuccess('Pay period rejected successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedPeriodId('');
        await loadPayPeriods();
      } else {
        setError(response.error || 'Failed to reject pay period');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject pay period');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async (periodId: string) => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');
      const response = await apiClient.markPayPeriodAsPaid(periodId);
      if (response.success) {
        setSuccess('Pay period marked as paid successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadPayPeriods();
      } else {
        setError(response.error || 'Failed to mark pay period as paid');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark pay period as paid');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading pay periods...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pay Periods Review</h1>
        <div className={styles.filters}>
          <label htmlFor="statusFilter">Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
            <option value="ALL">All</option>
          </select>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {payPeriods.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No pay periods found with status: {statusFilter}</p>
        </div>
      ) : (
        <div className={styles.payPeriodsList}>
          {payPeriods.map((period) => {
            const isExpanded = expandedPeriods.has(period.id);
            return (
              <div key={period.id} className={styles.payPeriodCard}>
                <div
                  className={styles.payPeriodHeader}
                  onClick={() => router.push(`/admin/pay-periods/${period.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.payPeriodInfo}>
                    <div className={styles.employeeName}>
                      {period.employee.user.firstName} {period.employee.user.lastName}
                    </div>
                    <div className={styles.dateRange}>
                      {formatDate(period.startDate)} - {formatDate(period.endDate)}
                    </div>
                    <div className={styles.summary}>
                      {period.totalHours !== null ? `${period.totalHours.toFixed(2)} regular hrs` : '0 hrs'}
                      {period.totalOvertimeHours !== null && period.totalOvertimeHours > 0 && (
                        <span className={styles.overtime}>
                          {' '}({period.totalOvertimeHours.toFixed(2)} OT)
                        </span>
                      )}
                      {period.totalPerDiem > 0 && (
                        <span className={styles.perDiem}> • ${(Number(period.totalPerDiem) * 50).toFixed(2)} per diem</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.payPeriodActions}>
                    <span className={`${styles.status} ${getStatusColor(period.status)}`}>
                      {period.status}
                    </span>
                    {period.status === 'SUBMITTED' && (
                      <div className={styles.actionButtons}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(period.id);
                          }}
                          className={styles.approveButton}
                          disabled={processing}
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectClick(period.id);
                          }}
                          className={styles.rejectButton}
                          disabled={processing}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {period.status === 'APPROVED' && (
                      <div className={styles.actionButtons}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsPaid(period.id);
                          }}
                          className={styles.markPaidButton}
                          disabled={processing}
                        >
                          Mark as Paid
                        </button>
                      </div>
                    )}
                    <span className={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.payPeriodDetails}>
                    <div className={styles.detailsSection}>
                      <h3>Time Entries</h3>
                      {period.timeEntries.length === 0 ? (
                        <p className={styles.noEntries}>No time entries for this period</p>
                      ) : (
                        <div className={styles.timeEntriesList}>
                          {period.timeEntries.map((entry) => (
                            <div key={entry.id} className={styles.timeEntryCard}>
                              <div className={styles.entryHeader}>
                                <div className={styles.entryDate}>{formatDateWithDay(entry.date)}</div>
                                <div className={styles.entryType}>{getEntryType(entry)}</div>
                                {entry.project && (
                                  <div className={styles.entryProjectHeader}>
                                    Project: {entry.project.name}
                                  </div>
                                )}
                              </div>
                              <div className={styles.entryDetails}>
                                {entry.startTime && entry.endTime && (
                                  <div className={styles.entryTime}>
                                    {entry.startTime} - {entry.endTime}
                                  </div>
                                )}
                                {entry.totalHours !== null && (
                                  <div className={styles.entryHours}>
                                    Hours: {entry.totalHours.toFixed(2)}
                                  </div>
                                )}
                                {(entry.perDiem !== undefined && entry.perDiem > 0 || entry.hasPerDiem) && (
                                  <div className={styles.entryPerDiem}>
                                    Per Diem: ${entry.perDiem !== undefined ? (Number(entry.perDiem) * 50).toFixed(2) : '50.00'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.detailsSection}>
                      <h3>Period Information</h3>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <label>Total Regular Hours:</label>
                          <span>{period.totalHours !== null ? period.totalHours.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Overtime Hours:</label>
                          <span>{period.totalOvertimeHours !== null ? period.totalOvertimeHours.toFixed(2) : '0.00'}</span>
                        </div>
                        {(period.totalHolidayHours !== undefined && period.totalHolidayHours !== null && period.totalHolidayHours > 0) && (
                          <div className={styles.infoItem}>
                            <label>Holiday Hours:</label>
                            <span>{period.totalHolidayHours.toFixed(2)}</span>
                          </div>
                        )}
                        {(period.totalSickHours !== undefined && period.totalSickHours !== null && period.totalSickHours > 0) && (
                          <div className={styles.infoItem}>
                            <label>Sick Hours:</label>
                            <span>{period.totalSickHours.toFixed(2)}</span>
                          </div>
                        )}
                        {(period.totalRotationHours !== undefined && period.totalRotationHours !== null && period.totalRotationHours > 0) && (
                          <div className={styles.infoItem}>
                            <label>Rotation Hours:</label>
                            <span>{period.totalRotationHours.toFixed(2)}</span>
                          </div>
                        )}
                        {(period.totalTravelHours !== undefined && period.totalTravelHours !== null && period.totalTravelHours > 0) && (
                          <div className={styles.infoItem}>
                            <label>Travel Hours:</label>
                            <span>{period.totalTravelHours.toFixed(2)}</span>
                          </div>
                        )}
                        {(period.totalPtoHours !== undefined && period.totalPtoHours !== null && period.totalPtoHours > 0) && (
                          <div className={styles.infoItem}>
                            <label>PTO Hours:</label>
                            <span>{period.totalPtoHours.toFixed(2)}</span>
                          </div>
                        )}
                        <div className={styles.infoItem}>
                          <label>Total Per Diem:</label>
                          <span>${(Number(period.totalPerDiem) * 50).toFixed(2)}</span>
                        </div>
                        {period.submittedAt && (
                          <div className={styles.infoItem}>
                            <label>Submitted At:</label>
                            <span>{new Date(period.submittedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {period.reviewedAt && (
                          <div className={styles.infoItem}>
                            <label>Reviewed At:</label>
                            <span>{new Date(period.reviewedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {period.reviewer && (
                          <div className={styles.infoItem}>
                            <label>Reviewed By:</label>
                            <span>{period.reviewer.firstName} {period.reviewer.lastName}</span>
                          </div>
                        )}
                        {period.rejectionReason && (
                          <div className={styles.infoItem}>
                            <label>Rejection Reason:</label>
                            <span className={styles.rejectionReason}>{period.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay} onClick={() => !processing && setShowRejectModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Reject Pay Period</h2>
              <button
                className={styles.modalClose}
                onClick={() => !processing && setShowRejectModal(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label htmlFor="rejectionReason">Rejection Reason *</label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className={styles.modalTextarea}
                  placeholder="Please provide a reason for rejecting this pay period..."
                  rows={4}
                  disabled={processing}
                  required
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className={styles.modalRejectButton}
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Rejecting...' : 'Reject Pay Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

