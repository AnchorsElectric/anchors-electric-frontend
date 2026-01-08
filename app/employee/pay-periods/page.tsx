'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './pay-periods.module.scss';
import timeEntryStyles from '../time-entries/time-entries.module.scss';

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

  const getEntryForDate = (date: string, period: PayPeriod): TimeEntry | null => {
    return period.timeEntries.find(entry => entry.date === date) || null;
  };

  const getDayClass = (date: string, period: PayPeriod): string => {
    const entry = getEntryForDate(date, period);
    if (!entry) return timeEntryStyles.day;
    
    if (period.status === 'PAID') {
      return timeEntryStyles.dayPaid;
    } else if (period.status === 'APPROVED') {
      return timeEntryStyles.dayApproved;
    } else if (period.status === 'REJECTED') {
      return timeEntryStyles.dayRejected;
    } else if (period.status === 'SUBMITTED') {
      return timeEntryStyles.daySubmitted;
    }
    
    return timeEntryStyles.dayRegular;
  };

  const getDayInfo = (date: string, period: PayPeriod): { type: string; details: string[] } => {
    const entry = getEntryForDate(date, period);
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
        details.push('Per Diem');
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
        details.push('Per Diem');
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
        details.push('Per Diem');
      }
      return { type: 'ROTATION', details };
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
        details.push('Per Diem');
      }
      return { type: 'TRAVEL', details };
    }
    
    const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
    if (!entry.startTime && !entry.endTime && !entry.totalHours && perDiemValue > 0) {
      return { type: 'PER DIEM ONLY', details: [] };
    }
    
    if (entry.startTime && entry.endTime) {
      details.push(`${entry.startTime} - ${entry.endTime}`);
    }
    
    if (entry.totalHours) {
      details.push(`${entry.totalHours}h`);
    }
    
    if (entry.hasPerDiem === true || perDiemValue > 0) {
      details.push('Per Diem');
    }
    
    return { type: 'REGULAR', details };
  };

  const renderCalendar = (period: PayPeriod) => {
    const days = [];
    // Parse date string manually to avoid timezone issues
    const [startYear, startMonth, startDay] = period.startDate.split('-').map(Number);
    const weekStart = new Date(startYear, startMonth - 1, startDay);
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      
      const year = currentDay.getFullYear();
      const month = String(currentDay.getMonth() + 1).padStart(2, '0');
      const day = String(currentDay.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      const entry = getEntryForDate(date, period);
      const dayClass = getDayClass(date, period);
      const dayInfo = getDayInfo(date, period);
      
      const dayNumber = String(currentDay.getDate()).padStart(2, '0');
      const monthNumber = String(currentDay.getMonth() + 1).padStart(2, '0');
      const dateDisplay = `${monthNumber}/${dayNumber}`;
      
      // Show content if there's a type, details, or a project
      const hasContent = dayInfo.type || dayInfo.details.length > 0 || entry?.project;
      
      days.push(
        <div key={date} className={timeEntryStyles.dayWrapper}>
          <div className={timeEntryStyles.dayNumber}>{dateDisplay}</div>
          <div 
            className={dayClass}
            onClick={undefined}
            style={{ cursor: 'not-allowed', opacity: 0.6 }}
            title="This date is part of a submitted/approved pay period and cannot be edited"
          >
            {hasContent && (
              <div className={timeEntryStyles.dayContent}>
                {dayInfo.type && (
                  <div className={timeEntryStyles.dayType}>{dayInfo.type}</div>
                )}
                {dayInfo.details.length > 0 && (
                  <div className={timeEntryStyles.dayDetails}>
                    {dayInfo.details.map((detail, idx) => (
                      <div key={idx} className={timeEntryStyles.dayDetailItem}>{detail}</div>
                    ))}
                  </div>
                )}
                {entry?.project && (
                  <div className={timeEntryStyles.dayDetails} style={{ marginTop: dayInfo.type || dayInfo.details.length > 0 ? '0.25rem' : '0', fontStyle: 'italic' }}>
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

  const formatWeekRange = (period: PayPeriod) => {
    // Parse date strings manually to avoid timezone issues
    const [startYear, startMonthNum, startDayNum] = period.startDate.split('-').map(Number);
    const [endYear, endMonthNum, endDayNum] = period.endDate.split('-').map(Number);
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
                    <div className={timeEntryStyles.calendarHeader}>
                      <h2 className={timeEntryStyles.monthTitle}>
                        {formatWeekRange(period)}
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
                        {renderCalendar(period)}
                      </div>
                    </div>

                    <div className={timeEntryStyles.summarySection}>
                      <h3 className={timeEntryStyles.summaryTitle}>Week Summary</h3>
                      <div className={timeEntryStyles.summaryGrid}>
                        <div className={timeEntryStyles.summaryItem}>
                          <span className={timeEntryStyles.summaryLabel}>Total Hours:</span>
                          <span className={timeEntryStyles.summaryValue}>
                            {period.totalHours !== null ? period.totalHours.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        {period.totalOvertimeHours !== null && period.totalOvertimeHours > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Overtime:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {period.totalOvertimeHours.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {period.totalSickDays > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Sick Days:</span>
                            <span className={timeEntryStyles.summaryValue}>{period.totalSickDays}</span>
                          </div>
                        )}
                        {period.totalPto > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>PTO:</span>
                            <span className={timeEntryStyles.summaryValue}>{period.totalPto}</span>
                          </div>
                        )}
                        {Number(period.totalPerDiem) > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Per Diem:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {Number(period.totalPerDiem).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {period.totalHolidayHours !== null && period.totalHolidayHours !== undefined && period.totalHolidayHours > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Holiday Hours:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {period.totalHolidayHours.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {period.totalRotationHours !== null && period.totalRotationHours !== undefined && period.totalRotationHours > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Rotation Hours:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {period.totalRotationHours.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {period.totalTravelHours !== null && period.totalTravelHours !== undefined && period.totalTravelHours > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Travel Hours:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {period.totalTravelHours.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {period.totalPtoHours !== null && period.totalPtoHours !== undefined && period.totalPtoHours > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>PTO Hours:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {period.totalPtoHours.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {period.totalSickHours !== null && period.totalSickHours !== undefined && period.totalSickHours > 0 && (
                          <div className={timeEntryStyles.summaryItem}>
                            <span className={timeEntryStyles.summaryLabel}>Sick Hours:</span>
                            <span className={timeEntryStyles.summaryValue}>
                              {period.totalSickHours.toFixed(2)}
                            </span>
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

