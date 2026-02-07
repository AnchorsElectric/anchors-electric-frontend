'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from '../pay-periods.module.scss';
import timeEntryStyles from '../../../employee/time-entries/time-entries.module.scss';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalHours: number | null;
  hasPerDiem: boolean;
  perDiem?: number;
  sickDay: boolean;
  rotationDay?: boolean;
  isTravelDay: boolean;
  isPTO: boolean;
  isHoliday: boolean;
  isUnpaidLeave?: boolean;
  project?: {
    id: string;
    name: string;
    jobNumber: string;
  } | null;
}

interface PayPeriod {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  totalHours: number | null;
  totalOvertimeHours: number | null;
  totalHolidayHours?: number | null;
  totalSickHours?: number | null;
  totalRotationHours?: number | null;
  totalTravelHours?: number | null;
  totalPtoHours?: number | null;
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

export default function AdminPayPeriodDetailPage() {
  const router = useRouter();
  const params = useParams();
  const payPeriodId = params.id as string;
  
  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadPayPeriod();
  }, [router, payPeriodId]);

  const loadPayPeriod = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getPayPeriodById(payPeriodId);
      if (response.success && response.data) {
        setPayPeriod((response.data as any).payPeriod);
      } else {
        setError(response.error || 'Failed to load pay period');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load pay period');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');
      const response = await apiClient.approvePayPeriod(payPeriodId);
      if (response.success) {
        setSuccess('Pay period approved successfully!');
        setTimeout(() => {
          router.push('/admin/pay-periods');
        }, 1500);
      } else {
        setError(response.error || 'Failed to approve pay period');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve pay period');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = () => {
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
      const response = await apiClient.rejectPayPeriod(payPeriodId, rejectionReason);
      if (response.success) {
        setSuccess('Pay period rejected successfully!');
        setTimeout(() => {
          router.push('/admin/pay-periods');
        }, 1500);
      } else {
        setError(response.error || 'Failed to reject pay period');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject pay period');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const getEntryForDate = (date: string): TimeEntry | undefined => {
    if (!payPeriod) return undefined;
    return payPeriod.timeEntries.find(entry => entry.date === date);
  };

  const getDayClass = (date: string): string => {
    const entry = getEntryForDate(date);
    if (!entry) return timeEntryStyles.day;
    
    if (payPeriod?.status === 'PAID') {
      return timeEntryStyles.dayPaid;
    } else if (payPeriod?.status === 'APPROVED') {
      return timeEntryStyles.dayApproved;
    } else if (payPeriod?.status === 'REJECTED') {
      return timeEntryStyles.dayRejected;
    } else if (payPeriod?.status === 'SUBMITTED') {
      return timeEntryStyles.daySubmitted;
    }
    
    return timeEntryStyles.dayRegular;
  };

  const getDayInfo = (date: string): { type: string; details: string[] } => {
    const entry = getEntryForDate(date);
    if (!entry) return { type: '', details: [] };
    
    const details: string[] = [];
    
    if (entry.isPTO === true) {
      if (entry.startTime && entry.endTime) {
        details.push(`${entry.startTime} - ${entry.endTime}`);
      }
      if (entry.totalHours) {
        details.push(`${entry.totalHours}h`);
      }
      return { type: 'PTO', details };
    }
    
    if (entry.isHoliday === true) {
      if (entry.startTime && entry.endTime) {
        details.push(`${entry.startTime} - ${entry.endTime}`);
      }
      if (entry.totalHours) {
        details.push(`${entry.totalHours}h`);
      }
      const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
      if (perDiemValue > 0) {
        details.push(`Per Diem: $${(perDiemValue * 50).toFixed(2)}`);
      }
      return { type: 'HOLIDAY', details };
    }
    
    if (entry.sickDay === true) {
      if (entry.startTime && entry.endTime) {
        details.push(`${entry.startTime} - ${entry.endTime}`);
      }
      if (entry.totalHours) {
        details.push(`${entry.totalHours}h`);
      }
      const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
      if (perDiemValue > 0) {
        details.push(`Per Diem: $${(perDiemValue * 50).toFixed(2)}`);
      }
      return { type: 'SICK', details };
    }
    
    if (entry.rotationDay === true) {
      if (entry.startTime && entry.endTime) {
        details.push(`${entry.startTime} - ${entry.endTime}`);
      }
      if (entry.totalHours) {
        details.push(`${entry.totalHours}h`);
      }
      const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
      if (perDiemValue > 0) {
        details.push(`Per Diem: $${(perDiemValue * 50).toFixed(2)}`);
      }
      return { type: 'ROTATION', details };
    }
    
    if (entry.isUnpaidLeave === true) {
      return { type: 'UNPAID_LEAVE', details: ['No hours', 'No per diem'] };
    }
    
    if (entry.isTravelDay === true) {
      if (entry.startTime && entry.endTime) {
        details.push(`${entry.startTime} - ${entry.endTime}`);
      }
      if (entry.totalHours) {
        details.push(`${entry.totalHours}h`);
      }
      const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
      if (perDiemValue > 0) {
        details.push(`Per Diem: $${(perDiemValue * 50).toFixed(2)}`);
      }
      return { type: 'TRAVEL', details };
    }
    
    const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
    if (!entry.startTime && !entry.endTime && !entry.totalHours && perDiemValue > 0) {
      return { type: 'PER DIEM ONLY', details: [`$${(perDiemValue * 50).toFixed(2)}`] };
    }
    
    if (entry.startTime && entry.endTime) {
      details.push(`${entry.startTime} - ${entry.endTime}`);
    }
    
    if (entry.totalHours) {
      details.push(`${entry.totalHours}h`);
    }
    
    if (entry.hasPerDiem === true) {
      details.push(`Per Diem: $${(perDiemValue * 50).toFixed(2)}`);
    }
    
    return { type: 'REGULAR', details };
  };

  const renderCalendar = () => {
    if (!payPeriod) return [];
    
    const days = [];
    // Parse date string manually to avoid timezone issues
    // payPeriod.startDate is in format "YYYY-MM-DD"
    const [startYear, startMonth, startDay] = payPeriod.startDate.split('-').map(Number);
    const weekStart = new Date(startYear, startMonth - 1, startDay);
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      
      const year = currentDay.getFullYear();
      const month = String(currentDay.getMonth() + 1).padStart(2, '0');
      const day = String(currentDay.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      const entry = getEntryForDate(date);
      const dayClass = getDayClass(date);
      const dayInfo = getDayInfo(date);
      
      const dayNumber = String(currentDay.getDate()).padStart(2, '0');
      const monthNumber = String(currentDay.getMonth() + 1).padStart(2, '0');
      const dateDisplay = `${monthNumber}/${dayNumber}`;
      
      days.push(
        <div key={date} className={timeEntryStyles.dayWrapper}>
          <div className={timeEntryStyles.dayNumber}>{dateDisplay}</div>
          <div className={dayClass}>
            {dayInfo.type && (
              <div className={timeEntryStyles.dayContent}>
                <div className={timeEntryStyles.dayType}>{dayInfo.type.replace(/_/g, ' ')}</div>
                {dayInfo.details.length > 0 && (
                  <div className={timeEntryStyles.dayDetails}>
                    {dayInfo.details.map((detail, idx) => (
                      <div key={idx} className={timeEntryStyles.dayDetailItem}>{detail}</div>
                    ))}
                  </div>
                )}
                {entry?.project && (
                  <div className={timeEntryStyles.dayDetails} style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                    <div className={timeEntryStyles.dayDetailItem}>{entry.project.name} - {entry.project.jobNumber}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const calculateWeekSummary = () => {
    if (!payPeriod) {
      return {
        totalHours: 0,
        overtimeHours: 0,
        totalHolidayHours: 0,
        totalSickHours: 0,
        totalRotationHours: 0,
        totalTravelHours: 0,
        totalPtoHours: 0,
        totalPerDiem: 0,
      };
    }

    // Cap regular hours at 40 for display, show excess as overtime
    const totalHours = payPeriod.totalHours ? Number(payPeriod.totalHours) : 0;
    const regularHours = Math.min(totalHours, 40);
    const overtimeHours = Math.max(totalHours - 40, 0);

    return {
      totalHours: regularHours, // Capped at 40 for display
      overtimeHours: overtimeHours,
      totalHolidayHours: payPeriod.totalHolidayHours || 0,
      totalSickHours: payPeriod.totalSickHours || 0,
      totalRotationHours: payPeriod.totalRotationHours || 0,
      totalTravelHours: payPeriod.totalTravelHours || 0,
      totalPtoHours: payPeriod.totalPtoHours || 0,
      totalPerDiem: payPeriod.totalPerDiem || 0,
    };
  };

  const formatWeekRange = () => {
    if (!payPeriod) return '';
    
    // Parse date strings manually to avoid timezone issues
    const [startYear, startMonthNum, startDayNum] = payPeriod.startDate.split('-').map(Number);
    const [endYear, endMonthNum, endDayNum] = payPeriod.endDate.split('-').map(Number);
    const weekStart = new Date(startYear, startMonthNum - 1, startDayNum);
    const weekEnd = new Date(endYear, endMonthNum - 1, endDayNum);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const startMonth = monthNames[weekStart.getMonth()];
    const endMonth = monthNames[weekEnd.getMonth()];
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekStart.getFullYear();
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading pay period...</div>
      </div>
    );
  }

  if (!payPeriod) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Pay period not found</div>
      </div>
    );
  }

  const summary = calculateWeekSummary();
  const canApproveReject = payPeriod.status === 'SUBMITTED';

  return (
    <div className={timeEntryStyles.container}>
      <div className={timeEntryStyles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className={timeEntryStyles.title}>
            Pay Period Review - {payPeriod.employee.user.firstName} {payPeriod.employee.user.lastName}
          </h1>
          <button 
            onClick={() => router.push('/admin/pay-periods')}
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Back to List
          </button>
        </div>
        
        {error && <div className={timeEntryStyles.error}>{error}</div>}
        {success && <div className={timeEntryStyles.success}>{success}</div>}

        <div className={timeEntryStyles.calendarHeader}>
          <h2 className={timeEntryStyles.monthTitle}>
            {formatWeekRange()}
          </h2>
        </div>

        <div className={timeEntryStyles.calendar}>
          <div className={timeEntryStyles.weekDays}>
            {weekDays.map(day => (
              <div key={day} className={timeEntryStyles.weekDayWrapper}>
                <div className={timeEntryStyles.weekDaySpacer}></div>
                <div className={timeEntryStyles.weekDay}>{day}</div>
              </div>
            ))}
          </div>
          <div className={timeEntryStyles.daysGrid}>
            {renderCalendar()}
          </div>
        </div>

        <div className={timeEntryStyles.summarySection}>
          <h3 className={timeEntryStyles.summaryTitle}>Week Summary</h3>
          <div className={timeEntryStyles.summaryGrid}>
            <div className={timeEntryStyles.summaryItem}>
              <span className={timeEntryStyles.summaryLabel}>Regular Hours:</span>
              <span className={timeEntryStyles.summaryValue}>{summary.totalHours.toFixed(2)}h</span>
            </div>
            {summary.overtimeHours > 0 && (
              <div className={timeEntryStyles.summaryItem}>
                <span className={timeEntryStyles.summaryLabel}>Overtime:</span>
                <span className={timeEntryStyles.summaryValue}>{summary.overtimeHours.toFixed(2)}h</span>
              </div>
            )}
            {summary.totalPerDiem > 0 && (
              <div className={timeEntryStyles.summaryItem}>
                <span className={timeEntryStyles.summaryLabel}>Total Per Diem:</span>
                <span className={timeEntryStyles.summaryValue}>${(summary.totalPerDiem * 50).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {canApproveReject && (
          <div className={timeEntryStyles.clearWeekSection} style={{ marginTop: '2rem' }}>
            <button 
              onClick={handleApprove} 
              className={timeEntryStyles.submitButton}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Approve'}
            </button>
            <button 
              onClick={handleRejectClick} 
              className={timeEntryStyles.clearWeekButton}
              disabled={processing}
            >
              Reject
            </button>
          </div>
        )}
      </div>

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

