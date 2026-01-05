'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './time-entries.module.scss';

interface TimeEntry {
  id: string;
  date: string;
  hours: number | null;
  status: string;
  submittedAt: string | null;
  createdAt: string;
}

interface EmployeeProfile {
  paymentType: 'HOURLY' | 'SALARY';
}

export default function TimeEntriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Get the start of the current week (Sunday)
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = today.getDate() - day; // Days to subtract to get to Sunday
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  // Format date as YYYY-MM-DD without timezone conversion
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to extract YYYY-MM-DD from entry date (handles ISO strings and YYYY-MM-DD strings)
  const extractDateString = (entryDate: string | Date): string => {
    if (typeof entryDate === 'string') {
      // If it's an ISO string, extract just the date part (YYYY-MM-DD)
      if (entryDate.includes('T')) {
        return entryDate.split('T')[0];
      }
      // Already in YYYY-MM-DD format
      return entryDate;
    }
    // If it's a Date object, format it
    return formatDateString(new Date(entryDate));
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router, currentWeekStart]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get employee profile to check payment type
      const profileResponse = await apiClient.getProfile();
      
      if (profileResponse.success && profileResponse.data) {
        const user = (profileResponse.data as any).user;
        
        // Check if user has employee profile (handle both null and undefined)
        if (user.employee && user.employee !== null && user.employee !== undefined) {
          setEmployeeProfile({
            paymentType: user.employee.paymentType,
          });
        } else {
          setError('Employee profile not found. Please contact an administrator to create an employee profile for you.');
          setLoading(false);
          return;
        }
      } else {
        setError('Failed to load profile information.');
        setLoading(false);
        return;
      }

      // Load time entries for current week
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days to get to Saturday
      const startDate = formatDateString(weekStart);
      const endDate = formatDateString(weekEnd);

      const response = await apiClient.getMyTimeEntries({ startDate, endDate });
      if (response.success && response.data) {
        const entries = (response.data as any).timeEntries || [];
        // Filter out rejected entries - they should not show on calendar
        const filteredEntries = entries.filter((e: TimeEntry) => e.status !== 'REJECTED');
        setTimeEntries(filteredEntries);
      } else {
        setError(response.error || 'Failed to load time entries');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    // Find entry - handle both ISO strings and YYYY-MM-DD strings from backend
    const entry = timeEntries.find(e => {
      if (!e || !e.date) return false;
      return extractDateString(e.date) === date;
    });
    
    if (entry) {
      // Allow editing DRAFT entries, and allow creating new entries for REJECTED entries
      // (backend will delete rejected entry and create new draft)
      if (entry.status === 'REJECTED') {
        // Clear the form - backend will handle deleting rejected entry and creating new draft
        setHours('');
        setError(''); // Clear any previous errors
        return; // Allow the form to be filled and submitted
      }
      
      // Only allow editing if status is DRAFT
      if (entry.status !== 'DRAFT') {
        setError(`Cannot edit ${entry.status.toLowerCase()} entries. Only draft entries can be modified.`);
        setSelectedDate('');
        setHours('');
        return;
      }
      
      // Handle hours - could be number, string, or Decimal-like object
      const hoursValue = entry.hours;
      if (hoursValue !== null && hoursValue !== undefined) {
        if (typeof hoursValue === 'number') {
          setHours(hoursValue.toString());
        } else if (typeof hoursValue === 'string') {
          setHours(hoursValue);
        } else {
          // Handle Decimal type from Prisma (has toString method)
          setHours(hoursValue.toString());
        }
      } else {
        setHours('');
      }
    } else {
      setHours('');
    }
  };

  const handleSaveEntry = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    // For hourly employees, allow 0 hours (which will effectively delete the entry)
    // For salary employees, we just need to save the entry
    if (employeeProfile?.paymentType === 'HOURLY') {
      if (hours === '' || hours === null || hours === undefined) {
        setError('Please enter hours (use 0 to remove entry)');
        return;
      }
      const hoursValue = parseFloat(hours);
      if (isNaN(hoursValue) || hoursValue < 0) {
        setError('Please enter a valid number of hours (0 or greater)');
        return;
      }
      if (hoursValue > 24) {
        setError('Hours cannot exceed 24 hours per day');
        return;
      }
      // If hours is 0, delete the entry instead
      if (hoursValue === 0) {
        const existingEntry = timeEntries.find(e => {
          if (!e || !e.date) return false;
          return extractDateString(e.date) === selectedDate;
        });
        if (existingEntry) {
          await handleDeleteEntry(existingEntry.id);
          return;
        } else {
          setError('No entry exists to delete');
          return;
        }
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await apiClient.createOrUpdateTimeEntry({
        date: selectedDate,
        hours: employeeProfile?.paymentType === 'HOURLY' ? parseFloat(hours) : null,
      });

      if (response.success) {
        const existingEntry = timeEntries.find(e => {
          const entryDate = typeof e.date === 'string' ? e.date : formatDateString(new Date(e.date));
          return entryDate === selectedDate;
        });
        setSuccess(existingEntry ? 'Time entry updated successfully' : 'Time entry created successfully');
        setSelectedDate('');
        setHours('');
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to save time entry');
      }
    } catch (err: any) {
      console.error('Error saving time entry:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save time entry';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await apiClient.deleteTimeEntry(entryId);
      if (response.success) {
        setSuccess('Time entry deleted successfully');
        setSelectedDate('');
        setHours('');
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to delete time entry');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete time entry');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAllDrafts = async () => {
    const draftEntries = timeEntries
      .filter(e => e.status === 'DRAFT')
      .map(e => e.id);

    if (draftEntries.length === 0) {
      setError('No draft entries to submit');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await apiClient.submitTimeEntries(draftEntries);
      if (response.success) {
        setSuccess(response.message || 'Time entries submitted successfully');
        await loadData();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.error || 'Failed to submit time entries');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit time entries');
    } finally {
      setSaving(false);
    }
  };

  const getDaysInWeek = () => {
    const days = [];
    // Get 7 days starting from currentWeekStart (Sunday)
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEntryForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    // Find entry by matching date string
    // Backend may return dates as ISO strings (2026-01-05T00:00:00.000Z) or YYYY-MM-DD strings
    const entry = timeEntries.find(e => {
      if (!e || !e.date) return false;
      return extractDateString(e.date) === dateStr;
    });
    return entry;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return styles.draft;
      case 'SUBMITTED': return styles.submitted;
      case 'APPROVED': return styles.approved;
      case 'REJECTED': return styles.rejected;
      case 'PAID': return styles.paid;
      default: return '';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return styles.draftBadge;
      case 'SUBMITTED': return styles.submittedBadge;
      case 'APPROVED': return styles.approvedBadge;
      case 'REJECTED': return styles.rejectedBadge;
      case 'PAID': return styles.paidBadge;
      default: return '';
    }
  };

  const changeWeek = (direction: number) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newWeekStart);
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

  if (!employeeProfile) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Time Entries</h1>
          <p className={styles.error}>Employee profile not found. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  const days = getDaysInWeek();
  // Format week range (e.g., "Jan 5 - Jan 11, 2026")
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);
  const weekRange = `${currentWeekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.paymentTypeInfo}>
          <p>Payment Type: <strong>{employeeProfile.paymentType}</strong></p>
          {employeeProfile.paymentType === 'HOURLY' && (
            <p className={styles.note}>Enter hours worked for each day</p>
          )}
          {employeeProfile.paymentType === 'SALARY' && (
            <p className={styles.note}>Mark working days (hours not required)</p>
          )}
        </div>

        {/* Calendar */}
        <div className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <button onClick={() => changeWeek(-1)} className={styles.monthButton}>←</button>
            <h2 className={styles.monthTitle}>{weekRange}</h2>
            <button onClick={() => changeWeek(1)} className={styles.monthButton}>→</button>
          </div>

          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={styles.weekDay}>{day}</div>
              ))}
            </div>
            <div className={styles.days}>
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className={styles.dayEmpty} />;
                }

                const dateStr = formatDateString(date);
                const entry = getEntryForDate(date);
                const today = new Date();
                const todayStr = formatDateString(today);
                const isToday = dateStr === todayStr;
                const isSelected = selectedDate === dateStr;
                // Compare dates at the day level (not time level) to avoid timezone issues
                const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isPast = dateMidnight < todayMidnight;
                const isFuture = dateMidnight > todayMidnight;

                // Determine status class for background color
                let statusClass = '';
                if (entry) {
                  statusClass = getStatusColor(entry.status);
                } else if (isPast) {
                  statusClass = ''; // No entry, past date
                }

                return (
                  <div
                    key={dateStr}
                    className={`${styles.day} ${statusClass} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''} ${isFuture ? styles.future : ''} ${entry ? styles.hasEntry : ''}`}
                    onClick={() => {
                      // Allow clicking on past dates and today (not future dates)
                      if (!isFuture) {
                        handleDateClick(dateStr);
                      }
                    }}
                    title={entry ? `Click to edit: ${entry.hours ? `${entry.hours} hours` : 'Working day'} (${entry.status})` : 'Click to add entry'}
                  >
                    <div className={styles.dayNumber}>{date.getDate()}</div>
                    {entry && (
                      <div className={styles.dayEntry}>
                        {employeeProfile.paymentType === 'HOURLY' && entry.hours !== null && entry.hours !== undefined && (
                          <div className={styles.hours}>
                            {(() => {
                              const hoursValue = typeof entry.hours === 'number' ? entry.hours : parseFloat(entry.hours.toString());
                              return `${hoursValue}h`;
                            })()}
                          </div>
                        )}
                        {employeeProfile.paymentType === 'SALARY' && (
                          <div className={styles.checkmark}>✓</div>
                        )}
                        <div className={`${styles.statusBadge} ${getStatusBadgeClass(entry.status)}`}>{entry.status}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Entry Form */}
        {selectedDate && (
          <div className={styles.entryForm}>
            <h3>
              {(() => {
                const existingEntry = timeEntries.find(e => {
                  if (!e || !e.date) return false;
                  return extractDateString(e.date) === selectedDate;
                });
                return existingEntry ? 'Edit Entry' : 'Create Entry';
              })()} for {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
            </h3>
            {employeeProfile.paymentType === 'HOURLY' && (
              <div className={styles.formField}>
                <label>Hours Worked</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for clearing
                    if (value === '') {
                      setHours('');
                      return;
                    }
                    const numValue = parseFloat(value);
                    // Prevent values greater than 24
                    if (!isNaN(numValue) && numValue > 24) {
                      setError('Hours cannot exceed 24 hours per day');
                      return;
                    }
                    setHours(value);
                    setError(''); // Clear error when valid input
                  }}
                  placeholder="0.00"
                  disabled={saving}
                />
                <p className={styles.helpText}>Maximum 24 hours per day. Enter 0 hours to delete this entry.</p>
              </div>
            )}
            {employeeProfile.paymentType === 'SALARY' && (
              <p className={styles.salaryNote}>Marking this as a working day</p>
            )}
            <div className={styles.formActions}>
              <button onClick={handleSaveEntry} disabled={saving} className={styles.saveButton}>
                {saving ? 'Saving...' : (() => {
                  const existingEntry = timeEntries.find(e => {
                    if (!e || !e.date) return false;
                    return extractDateString(e.date) === selectedDate;
                  });
                  return existingEntry ? 'Update Entry' : 'Create Entry';
                })()}
              </button>
              {(() => {
                const existingEntry = timeEntries.find(e => {
                  if (!e || !e.date) return false;
                  return extractDateString(e.date) === selectedDate;
                });
                return existingEntry && existingEntry.status === 'DRAFT';
              })() && (
                <button
                  onClick={() => {
                    const existingEntry = timeEntries.find(e => {
                      if (!e || !e.date) return false;
                      return extractDateString(e.date) === selectedDate;
                    });
                    if (existingEntry) {
                      handleDeleteEntry(existingEntry.id);
                    }
                  }}
                  disabled={saving}
                  className={styles.deleteButton}
                >
                  {saving ? 'Deleting...' : 'Delete Entry'}
                </button>
              )}
              <button 
                onClick={() => { setSelectedDate(''); setHours(''); }} 
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Submit Draft Entries */}
        {timeEntries.filter(e => e.status === 'DRAFT').length > 0 && (
          <div className={styles.submitSection}>
            <h3>Submit Entries for Review</h3>
            <p className={styles.submitInfo}>
              You have {timeEntries.filter(e => e.status === 'DRAFT').length} draft entr{timeEntries.filter(e => e.status === 'DRAFT').length === 1 ? 'y' : 'ies'} ready to submit.
            </p>
            <button
              onClick={handleSubmitAllDrafts}
              disabled={saving}
              className={styles.submitButton}
            >
              {saving ? 'Submitting...' : `Submit All Draft Entries for Review`}
            </button>
          </div>
        )}

        {/* Status Legend */}
        <div className={styles.legend}>
          <h4>Status Legend</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.draft}`}></div>
              <span>Draft</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.submitted}`}></div>
              <span>Submitted</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.approved}`}></div>
              <span>Approved</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.rejected}`}></div>
              <span>Rejected</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.paid}`}></div>
              <span>Paid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

