'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './time-entries.module.scss';

type EntryType = 'regular' | 'pto' | 'sick' | 'travel' | 'holiday';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalHours: number | null;
  hasPerDiem: boolean;
  sickDay: boolean;
  isTravelDay: boolean;
  isPTO: boolean;
  isHoliday: boolean;
  payPeriodId?: string | null;
  payPeriod?: {
    id: string;
    status: string;
  } | null;
}

export default function TimeEntriesPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('regular');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [hasPerDiem, setHasPerDiem] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Get the start of the current week (Sunday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadTimeEntries();
  }, [router, currentWeekStart]);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get start and end of current week (Sunday to Saturday)
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startYear = weekStart.getFullYear();
      const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(weekStart.getDate()).padStart(2, '0');
      const startDate = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = weekEnd.getFullYear();
      const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEnd.getDate()).padStart(2, '0');
      const endDate = `${endYear}-${endMonth}-${endDay}`;
      
      const response = await apiClient.getTimeEntries({ startDate, endDate });
      if (response.success && response.data) {
        const entries = (response.data as any).timeEntries || [];
        setTimeEntries(entries);
      } else {
        // If API call fails, still show calendar with empty entries
        setTimeEntries([]);
        setError(response.error || 'Failed to load time entries. Calendar will still work.');
      }
    } catch (err: any) {
      // If error occurs, still show calendar with empty entries
      setTimeEntries([]);
      setError(err.response?.data?.error || err.message || 'Failed to load time entries. Calendar will still work.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string) => {
    const existingEntry = timeEntries.find(entry => entry.date === date);
    
    if (existingEntry) {
      setEditingEntry(existingEntry);
      // Determine entry type - check in order of priority
      if (existingEntry.isPTO) {
        setEntryType('pto');
      } else if (existingEntry.isHoliday) {
        setEntryType('holiday');
      } else if (existingEntry.sickDay) {
        setEntryType('sick');
      } else if (existingEntry.isTravelDay) {
        setEntryType('travel');
      } else {
        setEntryType('regular');
      }
      setStartTime(existingEntry.startTime || '09:00');
      setEndTime(existingEntry.endTime || '17:00');
      setHasPerDiem(existingEntry.hasPerDiem || false);
    } else {
      setEditingEntry(null);
      setEntryType('regular');
      setStartTime('09:00');
      setEndTime('17:00');
      setHasPerDiem(false);
    }
    
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    try {
      setError('');
      setLoading(true);

      const entryData: any = {
        date: selectedDate,
        hasPerDiem: false,
        sickDay: false,
        isTravelDay: false,
        isPTO: false,
        isHoliday: false,
      };

      // Set values based on entry type
      if (entryType === 'regular') {
        entryData.startTime = startTime;
        entryData.endTime = endTime;
        entryData.hasPerDiem = hasPerDiem;
      } else if (entryType === 'pto') {
        entryData.isPTO = true;
        entryData.startTime = null;
        entryData.endTime = null;
        // No other fields
      } else if (entryType === 'holiday') {
        entryData.isHoliday = true;
        entryData.startTime = null;
        entryData.endTime = null;
        // No other fields
      } else if (entryType === 'sick') {
        entryData.sickDay = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = null;
        entryData.endTime = null;
      } else if (entryType === 'travel') {
        entryData.isTravelDay = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = null;
        entryData.endTime = null;
      }
      
      let response;
      if (editingEntry) {
        response = await apiClient.updateTimeEntry(editingEntry.id, entryData);
      } else {
        response = await apiClient.createTimeEntry(entryData);
      }

      if (response.success) {
        setShowModal(false);
        setSelectedDate(null);
        setEditingEntry(null);
        // Reload entries to get the updated data
        await loadTimeEntries();
      } else {
        setError(response.error || 'Failed to save time entry');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save time entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;

    try {
      setError('');
      setLoading(true);
      const response = await apiClient.deleteTimeEntry(editingEntry.id);
      if (response.success) {
        setShowModal(false);
        setSelectedDate(null);
        setEditingEntry(null);
        loadTimeEntries();
      } else {
        setError(response.error || 'Failed to delete time entry');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete time entry');
    } finally {
      setLoading(false);
    }
  };

  const getEntryForDate = (date: string): TimeEntry | undefined => {
    return timeEntries.find(entry => entry.date === date);
  };

  const getDraftEntries = (): TimeEntry[] => {
    return timeEntries.filter(entry => !entry.payPeriodId);
  };

  const getCurrentWeekDraftEntries = (): TimeEntry[] => {
    // Get week start and end dates as strings for comparison
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Convert to date strings for comparison
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    
    return timeEntries.filter(entry => {
      // Filter out entries that are already in a pay period
      if (entry.payPeriodId) return false;
      
      // Compare date strings directly (YYYY-MM-DD format)
      // This avoids timezone issues
      return entry.date >= weekStartStr && entry.date <= weekEndStr;
    });
  };

  const handleSubmitPayPeriod = async () => {
    const draftEntries = getCurrentWeekDraftEntries();
    
    if (draftEntries.length === 0) {
      setError('No draft entries found for this week to submit.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Get the week start and end dates
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startYear = weekStart.getFullYear();
      const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(weekStart.getDate()).padStart(2, '0');
      const startDate = `${startYear}-${startMonth}-${startDay}`;

      const endYear = weekEnd.getFullYear();
      const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
      const endDay = String(weekEnd.getDate()).padStart(2, '0');
      const endDate = `${endYear}-${endMonth}-${endDay}`;

      // Create pay period
      const createResponse = await apiClient.createPayPeriod({ startDate, endDate });
      
      if (!createResponse.success || !createResponse.data) {
        throw new Error(createResponse.error || 'Failed to create pay period');
      }

      const payPeriodId = (createResponse.data as any).payPeriod?.id;
      if (!payPeriodId) {
        throw new Error('Pay period ID not returned');
      }

      // Associate time entries with the pay period
      const timeEntryIds = draftEntries.map(entry => entry.id);
      const updateResponse = await apiClient.updatePayPeriod(payPeriodId, { timeEntryIds });
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to associate time entries with pay period');
      }

      // Submit the pay period
      const submitResponse = await apiClient.submitPayPeriod(payPeriodId);
      
      if (!submitResponse.success) {
        throw new Error(submitResponse.error || 'Failed to submit pay period');
      }

      // Reload time entries to reflect the changes
      await loadTimeEntries();
      
      alert('Pay period submitted successfully for admin review!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit pay period');
    } finally {
      setSubmitting(false);
    }
  };

  const getDayClass = (date: string): string => {
    const entry = getEntryForDate(date);
    if (!entry) return styles.day;
    
    if (entry.isPTO) return styles.dayPto;
    if (entry.isHoliday) return styles.dayHoliday;
    if (entry.sickDay) return styles.daySick;
    if (entry.isTravelDay) return styles.dayTravel;
    return styles.dayRegular;
  };

  const getDayInfo = (date: string): { type: string; details: string[] } => {
    const entry = getEntryForDate(date);
    if (!entry) return { type: '', details: [] };
    
    const details: string[] = [];
    
    // Check entry type flags in priority order
    // IMPORTANT: Check special types BEFORE checking for regular hours
    if (entry.isPTO === true) {
      return { type: 'PTO', details: [] };
    }
    
    if (entry.isHoliday === true) {
      return { type: 'HOLIDAY', details: [] };
    }
    
    if (entry.sickDay === true) {
      if (entry.hasPerDiem === true) {
        details.push('Per Diem');
      }
      return { type: 'SICK', details };
    }
    
    if (entry.isTravelDay === true) {
      if (entry.hasPerDiem === true) {
        details.push('Per Diem');
      }
      return { type: 'TRAVEL', details };
    }
    
    // Regular hours entry - only reached if none of the special types above are true
    // This means isPTO, isHoliday, sickDay, and isTravelDay are all false/undefined
    if (entry.startTime && entry.endTime) {
      details.push(`${entry.startTime} - ${entry.endTime}`);
    }
    
    if (entry.totalHours) {
      details.push(`${entry.totalHours}h`);
    }
    
    if (entry.hasPerDiem === true) {
      details.push('Per Diem');
    }
    
    return { type: 'REGULAR', details };
  };

  const renderCalendar = () => {
    const days = [];
    const weekStart = new Date(currentWeekStart);
    
    // Render 7 days (Sunday to Saturday)
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
        <div key={date} className={styles.dayWrapper}>
          <div className={styles.dayNumber}>{dateDisplay}</div>
          <div
            className={dayClass}
            onClick={() => handleDateClick(date)}
          >
            {dayInfo.type && (
              <div className={styles.dayContent}>
                <div className={styles.dayType}>{dayInfo.type}</div>
                {dayInfo.details.length > 0 && (
                  <div className={styles.dayDetails}>
                    {dayInfo.details.map((detail, idx) => (
                      <div key={idx} className={styles.dayDetailItem}>{detail}</div>
                    ))}
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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const formatWeekRange = () => {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
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

  const handlePrevWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Time Entries</h1>
        
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.calendarHeader}>
          <button onClick={handlePrevWeek} className={styles.monthButton}>‹</button>
          <h2 className={styles.monthTitle}>
            {formatWeekRange()}
          </h2>
          <button onClick={handleNextWeek} className={styles.monthButton}>›</button>
        </div>

        {getCurrentWeekDraftEntries().length > 0 && (
          <div className={styles.submitSection}>
            <p className={styles.submitInfo}>
              You have {getCurrentWeekDraftEntries().length} draft {getCurrentWeekDraftEntries().length === 1 ? 'entry' : 'entries'} for this week.
            </p>
            <button 
              onClick={handleSubmitPayPeriod} 
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Week for Review'}
            </button>
          </div>
        )}

        <div className={styles.calendar}>
          <div className={styles.weekDays}>
            {weekDays.map(day => (
              <div key={day} className={styles.weekDayWrapper}>
                <div className={styles.weekDaySpacer}></div>
                <div className={styles.weekDay}>{day}</div>
              </div>
            ))}
          </div>
          <div className={styles.daysGrid}>
            {renderCalendar()}
          </div>
        </div>

        <div className={styles.legend}>
          <h4>Legend</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendRegular}`}></div>
              <span>Regular Hours</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendPto}`}></div>
              <span>PTO</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendSick}`}></div>
              <span>Sick Day</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendTravel}`}></div>
              <span>Travel Day</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendHoliday}`}></div>
              <span>Holiday</span>
            </div>
          </div>
        </div>
      </div>

      {showModal && selectedDate && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
            </h2>
            <p className={styles.modalDate}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Entry Type</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="regular"
                      checked={entryType === 'regular'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                      }}
                    />
                    Regular Hours
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="pto"
                      checked={entryType === 'pto'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                      }}
                    />
                    PTO
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="sick"
                      checked={entryType === 'sick'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                      }}
                    />
                    Sick Day
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="travel"
                      checked={entryType === 'travel'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                      }}
                    />
                    Travel Day
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="holiday"
                      checked={entryType === 'holiday'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                      }}
                    />
                    Holiday
                  </label>
                </div>
              </div>

              {entryType === 'regular' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={hasPerDiem}
                        onChange={(e) => setHasPerDiem(e.target.checked)}
                      />
                      Per Diem
                    </label>
                  </div>
                </>
              )}

              {entryType === 'sick' && (
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={hasPerDiem}
                      onChange={(e) => setHasPerDiem(e.target.checked)}
                    />
                    Per Diem
                  </label>
                </div>
              )}

              {entryType === 'travel' && (
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={hasPerDiem}
                      onChange={(e) => setHasPerDiem(e.target.checked)}
                    />
                    Per Diem
                  </label>
                </div>
              )}

              {(entryType === 'pto' || entryType === 'holiday') && (
                <p className={styles.infoText}>
                  {entryType === 'pto' 
                    ? 'No additional information required for PTO entries.'
                    : 'No additional information required for Holiday entries.'}
                </p>
              )}

              <div className={styles.modalActions}>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className={styles.saveButton}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                {editingEntry && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedDate(null);
                    setEditingEntry(null);
                  }}
                  disabled={loading}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

