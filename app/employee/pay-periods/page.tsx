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
  totalHours: number | null;
  totalOvertimeHours: number | null;
  totalSickDays: number;
  totalPto: number;
  totalPerDiem: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  timeEntries: TimeEntry[];
}

export default function EmployeePayPeriodsPage() {
  const router = useRouter();
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadPayPeriods();
  }, [router]);

  const loadPayPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getPayPeriods({ status: 'ALL' });
      if (response.success && response.data) {
        const periodsData = (response.data as any).payPeriods || [];
        // Filter out DRAFT periods - only show past submitted/approved/rejected/paid periods
        const pastPeriods = periodsData.filter((period: PayPeriod) => period.status !== 'DRAFT');
        setPayPeriods(pastPeriods);
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

  const handleEditRejected = (periodId: string) => {
    // Navigate to time entries page and allow editing
    router.push(`/employee/time-entries?editPeriod=${periodId}`);
  };

  const handleResubmit = async (periodId: string) => {
    try {
      setError('');
      const response = await apiClient.submitPayPeriod(periodId);
      if (response.success) {
        await loadPayPeriods();
      } else {
        setError(response.error || 'Failed to resubmit pay period');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resubmit pay period');
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
        <h1 className={styles.title}>Pay Period History</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {payPeriods.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No pay period history found.</p>
        </div>
      ) : (
        <div className={styles.payPeriodsList}>
          {payPeriods.map((period) => {
            const isExpanded = expandedPeriods.has(period.id);
            return (
              <div key={period.id} className={styles.payPeriodCard}>
                <div
                  className={styles.payPeriodHeader}
                  onClick={() => toggleExpand(period.id)}
                >
                  <div className={styles.payPeriodInfo}>
                    <div className={styles.dateRange}>
                      {formatDate(period.startDate)} - {formatDate(period.endDate)}
                    </div>
                    <div className={styles.summary}>
                      {period.totalHours !== null ? `${period.totalHours.toFixed(2)} hrs` : '0 hrs'}
                      {period.totalOvertimeHours !== null && period.totalOvertimeHours > 0 && (
                        <span className={styles.overtime}>
                          {' '}({period.totalOvertimeHours.toFixed(2)} OT)
                        </span>
                      )}
                      {period.totalSickDays > 0 && (
                        <span className={styles.sickDays}> • {period.totalSickDays} sick day(s)</span>
                      )}
                      {period.totalPto > 0 && (
                        <span className={styles.pto}> • {period.totalPto} PTO day(s)</span>
                      )}
                      {period.totalPerDiem > 0 && (
                        <span className={styles.perDiem}> • {Number(period.totalPerDiem).toFixed(2)} per diem day(s)</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.payPeriodActions}>
                    <span className={`${styles.status} ${getStatusColor(period.status)}`}>
                      {period.status}
                    </span>
                    {period.status === 'REJECTED' && (
                      <div className={styles.actionButtons}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRejected(period.id);
                          }}
                          className={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResubmit(period.id);
                          }}
                          className={styles.resubmitButton}
                        >
                          Resubmit
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
                                <div className={styles.entryDate}>{formatDate(entry.date)}</div>
                                <div className={styles.entryType}>{getEntryType(entry)}</div>
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
                                    Per Diem: {entry.perDiem !== undefined ? Number(entry.perDiem).toFixed(2) : 'Yes'}
                                  </div>
                                )}
                                {entry.project && (
                                  <div className={styles.entryProject}>
                                    Project: {entry.project.name}
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
                          <label>Total Hours:</label>
                          <span>{period.totalHours !== null ? period.totalHours.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Overtime Hours:</label>
                          <span>{period.totalOvertimeHours !== null ? period.totalOvertimeHours.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Sick Days:</label>
                          <span>{period.totalSickDays}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <label>PTO Days:</label>
                          <span>{period.totalPto}</span>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Per Diem Days:</label>
                          <span>{Number(period.totalPerDiem).toFixed(2)}</span>
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
    </div>
  );
}

