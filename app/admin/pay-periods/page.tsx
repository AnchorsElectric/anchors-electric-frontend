'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import { UserRole } from '@/lib/config/routes';
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
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [employeeFilterInput, setEmployeeFilterInput] = useState<string>('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const canMarkAsPaid = userRole === 'ADMIN' || userRole === 'HR' || userRole === 'ACCOUNTANT';
  const canApproveReject = userRole === 'ADMIN' || userRole === 'HR' || userRole === 'PROJECT_MANAGER';

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const profileRes = await apiClient.getProfile();
        if (cancelled) return;
        const role = profileRes.success && profileRes.data
          ? ((profileRes.data as any).user?.role ?? null) as UserRole | null
          : null;
        setUserRole(role);
        await loadPayPeriods(role);
      } catch (e) {
        if (cancelled) return;
        const err = e as any;
        setError(err.response?.data?.error || err.message || 'Failed to load');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [router, statusFilter, userRole]);

  const loadPayPeriods = async (roleOverride?: UserRole | null) => {
    try {
      setLoading(true);
      setError('');
      const role = roleOverride ?? userRole;
      const statusToFetch = statusFilter;
      const response = await apiClient.getSubmittedPayPeriods({ status: statusToFetch });
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

  // Get unique employee names for autocomplete
  const getEmployeeNames = (): string[] => {
    const employeeMap = new Map<string, string>();
    payPeriods.forEach(period => {
      const fullName = `${period.employee.user.firstName} ${period.employee.user.lastName}`;
      employeeMap.set(fullName.toLowerCase(), fullName);
    });
    return Array.from(employeeMap.values()).sort();
  };

  // Filter employee names based on input
  const getFilteredEmployeeSuggestions = (): string[] => {
    if (!employeeFilterInput.trim()) {
      return getEmployeeNames();
    }
    const input = employeeFilterInput.toLowerCase();
    return getEmployeeNames().filter(name => 
      name.toLowerCase().includes(input)
    );
  };

  // Filter pay periods based on status and employee
  const getFilteredPayPeriods = (): PayPeriod[] => {
    let filtered = payPeriods;

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(period => period.status === statusFilter);
    }

    // Apply employee filter
    if (employeeFilter.trim()) {
      const filterLower = employeeFilter.toLowerCase();
      filtered = filtered.filter(period => {
        const fullName = `${period.employee.user.firstName} ${period.employee.user.lastName}`.toLowerCase();
        return fullName.includes(filterLower);
      });
    }

    // Sort by week (startDate) - most recent weeks first
    filtered.sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateB - dateA; // Descending order (most recent first)
    });

    return filtered;
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
    // Parse date string manually to avoid timezone issues
    const [year, monthNum, dayNum] = dateString.split('-').map(Number);
    const date = new Date(year, monthNum - 1, dayNum);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateWithDay = (dateString: string) => {
    // Parse date string manually to avoid timezone issues
    const [year, monthNum, dayNum] = dateString.split('-').map(Number);
    const date = new Date(year, monthNum - 1, dayNum);
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

  const hasSpecialEntries = (period: PayPeriod): boolean => {
    // Check if pay period includes any of these specific entry types:
    // - Sick Day
    // - PTO
    // - Holiday
    // - Rotation Day
    // - Travel Day
    
    // Check aggregated totals first (more efficient)
    if (period.totalPto > 0) {
      return true; // PTO
    }
    
    if (period.totalSickDays > 0) {
      return true; // Sick Day
    }
    
    if (period.totalRotationDays !== undefined && period.totalRotationDays > 0) {
      return true; // Rotation Day
    }
    
    // Check time entries for holiday or travel day (these might not have aggregated totals in the interface)
    if (period.timeEntries && period.timeEntries.length > 0) {
      return period.timeEntries.some(entry => 
        entry.isHoliday ||  // Holiday
        entry.isTravelDay   // Travel Day
      );
    }
    
    return false;
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
            {userRole === 'ACCOUNTANT' ? (
              <>
                <option value="ALL">All</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </>
            ) : (
              <>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAID">Paid</option>
                <option value="ALL">All</option>
              </>
            )}
          </select>
          <label htmlFor="employeeFilter">Employee:</label>
          <div className={styles.autocompleteWrapper}>
            <input
              id="employeeFilter"
              type="text"
              value={employeeFilterInput}
              onChange={(e) => {
                setEmployeeFilterInput(e.target.value);
                setShowEmployeeSuggestions(true);
                setEmployeeFilter(e.target.value);
              }}
              onFocus={() => setShowEmployeeSuggestions(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow click on suggestion
                setTimeout(() => setShowEmployeeSuggestions(false), 200);
              }}
              placeholder="Search employee..."
              className={styles.filterInput}
            />
            {showEmployeeSuggestions && getFilteredEmployeeSuggestions().length > 0 && (
              <div className={styles.autocompleteDropdown}>
                {getFilteredEmployeeSuggestions().map((name, index) => (
                  <div
                    key={index}
                    className={styles.autocompleteItem}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setEmployeeFilterInput(name);
                      setEmployeeFilter(name);
                      setShowEmployeeSuggestions(false);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
            {employeeFilterInput && (
              <button
                type="button"
                className={styles.clearFilterButton}
                onClick={() => {
                  setEmployeeFilterInput('');
                  setEmployeeFilter('');
                  setShowEmployeeSuggestions(false);
                }}
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {getFilteredPayPeriods().length === 0 ? (
        <div className={styles.emptyState}>
          <p>No pay periods found{statusFilter !== 'ALL' ? ` with status: ${statusFilter}` : ''}{employeeFilter ? ` for employee: ${employeeFilter}` : ''}</p>
        </div>
      ) : (
        <div className={styles.payPeriodsList}>
          {getFilteredPayPeriods().map((period) => {
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
                      {(() => {
                        // Cap regular hours at 40 for display, show excess as overtime
                        const totalHours = period.totalHours !== null ? Number(period.totalHours) : 0;
                        const regularHours = Math.min(totalHours, 40);
                        const overtimeHours = Math.max(totalHours - 40, 0);
                        return (
                          <>
                            <span>Regular Hours: {regularHours.toFixed(2)}</span>
                            {overtimeHours > 0 && (
                              <span className={styles.overtime}>
                                {' • '}Overtime: {overtimeHours.toFixed(2)}
                              </span>
                            )}
                            {period.totalPerDiem > 0 && (
                              <span className={styles.perDiem}> • Per Diem: ${(Number(period.totalPerDiem) * 50).toFixed(2)}</span>
                            )}
                            {hasSpecialEntries(period) && (
                              <span className={styles.specialEntryBadge} title="Contains special time entries (PTO, Sick, Holiday, Rotation Day, Travel Day)">
                                Special Entries
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className={styles.payPeriodActions}>
                    <span className={`${styles.status} ${getStatusColor(period.status)}`}>
                      {period.status}
                    </span>
                    {period.status === 'SUBMITTED' && canApproveReject && (
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
                    {period.status === 'APPROVED' && canMarkAsPaid && (
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
                        {(() => {
                          // Cap regular hours at 40 for display, show excess as overtime
                          const totalHours = period.totalHours !== null ? Number(period.totalHours) : 0;
                          const regularHours = Math.min(totalHours, 40);
                          const overtimeHours = Math.max(totalHours - 40, 0);
                          return (
                            <>
                              <div className={styles.infoItem}>
                                <label>Regular Hours:</label>
                                <span>{regularHours.toFixed(2)}</span>
                              </div>
                              {overtimeHours > 0 && (
                                <div className={styles.infoItem}>
                                  <label>Overtime:</label>
                                  <span>{overtimeHours.toFixed(2)}</span>
                                </div>
                              )}
                              {period.totalPerDiem > 0 && (
                                <div className={styles.infoItem}>
                                  <label>Total Per Diem:</label>
                                  <span>${(Number(period.totalPerDiem) * 50).toFixed(2)}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
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

