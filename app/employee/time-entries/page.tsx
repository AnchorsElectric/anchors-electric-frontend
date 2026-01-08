'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './time-entries.module.scss';

type EntryType = 'regular' | 'pto' | 'sick' | 'rotation' | 'travel' | 'holiday' | 'none';

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
  payPeriodId?: string | null;
  projectId?: string | null;
  payPeriod?: {
    id: string;
    status: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  jobNumber: string;
  address: string;
  clientName: string;
}

export default function TimeEntriesPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('regular');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:30');
  const [hasPerDiem, setHasPerDiem] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showClearWeekConfirm, setShowClearWeekConfirm] = useState(false);
  const [clearingWeek, setClearingWeek] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [payPeriods, setPayPeriods] = useState<Array<{ id: string; startDate: string; endDate: string; status: string }>>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    // Calculate days to subtract to get to Monday (0 = Sunday, 1 = Monday, etc.)
    // If Sunday (0), go back 6 days. Otherwise, go back (day - 1) days.
    const diff = today.getDate() - (day === 0 ? 6 : day - 1);
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
    loadProfile();
    loadProjects();
    loadTimeEntries();
    loadPayPeriods();
  }, [router, currentWeekStart]);

  const loadProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const user = (response.data as any).user;
        if (user?.employee) {
          setHasEmployeeProfile(true);
          if (user.employee.currentProjectId) {
            setCurrentProjectId(user.employee.currentProjectId);
          }
        } else {
          setHasEmployeeProfile(false);
        }
      }
    } catch (err: any) {
      // Silently fail - current project is optional
      setHasEmployeeProfile(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await apiClient.getProjects();
      if (response.success && response.data) {
        const projectsData = (response.data as any).projects || [];
        setProjects(projectsData);
      }
    } catch (err: any) {
      // Silently fail - projects are optional
      // Don't let this error redirect to login
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Just ignore - projects are optional for employees
        return;
      }
    }
  };

  const loadPayPeriods = async () => {
    try {
      const response = await apiClient.getPayPeriods();
      if (response.success && response.data) {
        const periodsData = (response.data as any).payPeriods || [];
        setPayPeriods(periodsData.map((period: any) => ({
          id: period.id,
          startDate: period.startDate,
          endDate: period.endDate,
          status: period.status,
        })));
      }
    } catch (err: any) {
      // Silently fail - pay periods are optional for this check
    }
  };

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      setError('');
      
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
        setTimeEntries([]);
        // If error is about employee profile not found, show a helpful message
        if (response.error?.includes('Employee profile not found')) {
          setError('Employee profile not found. Please contact an administrator to create your employee profile.');
        } else {
          setError(response.error || 'Failed to load time entries. Calendar will still work.');
        }
      }
    } catch (err: any) {
      setTimeEntries([]);
      // If error is about employee profile not found, show a helpful message
      if (err.response?.data?.error?.includes('Employee profile not found') || err.response?.status === 404) {
        setError('Employee profile not found. Please contact an administrator to create your employee profile.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load time entries. Calendar will still work.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDateLocked = (date: string): boolean => {
    // First check if the current week's pay period is SUBMITTED or APPROVED
    const currentPayPeriod = getCurrentWeekPayPeriod();
    if (currentPayPeriod) {
      const status = currentPayPeriod.status;
      // Lock if SUBMITTED, APPROVED, or PAID, allow editing if DRAFT or REJECTED
      if (status === 'SUBMITTED' || status === 'APPROVED' || status === 'PAID') {
        return true;
      }
    }
    
    // Also check individual entry's pay period status (for backwards compatibility)
    const entry = timeEntries.find(e => e.date === date);
    if (entry && entry.payPeriodId && entry.payPeriod) {
      const status = entry.payPeriod.status;
      return status === 'SUBMITTED' || status === 'APPROVED' || status === 'PAID';
    }
    
    return false;
  };

  const adjustTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMins = String(date.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMins}`;
  };

  const incrementTime = (time: string, setter: (value: string) => void) => {
    setter(adjustTime(time, 30));
  };

  const decrementTime = (time: string, setter: (value: string) => void) => {
    setter(adjustTime(time, -30));
  };

  const isWeekend = (date: string): boolean => {
    const dateObj = new Date(date + 'T00:00:00');
    const day = dateObj.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const handleDateClick = (date: string) => {
    if (!hasEmployeeProfile) {
      setError('Employee profile not found. Please contact an administrator to create your employee profile before adding time entries.');
      return;
    }

    // Check if date is locked (pay period is SUBMITTED, APPROVED, or PAID)
    if (isDateLocked(date)) {
      setError('This date is part of a submitted/approved pay period and cannot be edited');
      return;
    }

    const existingEntry = timeEntries.find(entry => entry.date === date);
    
    if (existingEntry) {
      
      // Check if weekend and entry type is not allowed on weekends
      if (isWeekend(date)) {
        if (existingEntry.isPTO || existingEntry.isHoliday || existingEntry.sickDay || existingEntry.rotationDay) {
          setError('Holiday, Sick Day, PTO, and Rotation Day cannot be logged on weekends. Please select a different entry type.');
          setEntryType('regular');
        } else {
          setEditingEntry(existingEntry);
          if (existingEntry.isTravelDay) {
            setEntryType('travel');
            setStartTime(existingEntry.startTime || '09:00');
            setEndTime(existingEntry.endTime || '17:30');
          } else if (!existingEntry.startTime && !existingEntry.endTime && !existingEntry.totalHours && (existingEntry.perDiem !== undefined && existingEntry.perDiem > 0 || existingEntry.hasPerDiem)) {
            setEntryType('none');
            setStartTime('09:00');
            setEndTime('17:00');
          } else {
            setEntryType('regular');
            setStartTime(existingEntry.startTime || '09:00');
            setEndTime(existingEntry.endTime || '17:30');
          }
          const perDiemValue = existingEntry.perDiem !== undefined ? existingEntry.perDiem : (existingEntry.hasPerDiem ? 1 : 0);
          setHasPerDiem(perDiemValue > 0);
          setSelectedProject(existingEntry.projectId || currentProjectId || '');
        }
      } else {
        setEditingEntry(existingEntry);
        if (existingEntry.isPTO) {
          setEntryType('pto');
          setStartTime(existingEntry.startTime || '09:00');
          setEndTime(existingEntry.endTime || '17:30');
        } else if (existingEntry.isHoliday) {
          setEntryType('holiday');
          setStartTime(existingEntry.startTime || '09:00');
          setEndTime(existingEntry.endTime || '17:30');
        } else if (existingEntry.sickDay) {
          setEntryType('sick');
          setStartTime(existingEntry.startTime || '09:00');
          setEndTime(existingEntry.endTime || '17:30');
        } else if (existingEntry.rotationDay) {
          setEntryType('rotation');
          setStartTime(existingEntry.startTime || '09:00');
          setEndTime(existingEntry.endTime || '17:30');
        } else if (existingEntry.isTravelDay) {
          setEntryType('travel');
          setStartTime(existingEntry.startTime || '09:00');
          setEndTime(existingEntry.endTime || '17:30');
        } else if (!existingEntry.startTime && !existingEntry.endTime && !existingEntry.totalHours && (existingEntry.perDiem !== undefined && existingEntry.perDiem > 0 || existingEntry.hasPerDiem)) {
          setEntryType('none');
          setStartTime('09:00');
          setEndTime('17:00');
        } else {
          setEntryType('regular');
          setStartTime(existingEntry.startTime || '09:00');
          setEndTime(existingEntry.endTime || '17:30');
        }
        // Convert perDiem numeric value back to boolean for checkbox
        const perDiemValue = existingEntry.perDiem !== undefined ? existingEntry.perDiem : (existingEntry.hasPerDiem ? 1 : 0);
        setHasPerDiem(perDiemValue > 0);
        setSelectedProject(existingEntry.projectId || currentProjectId || '');
      }
    } else {
      // Check if date is in a locked pay period
      if (isDateLocked(date)) {
        setError('This date is part of a submitted/approved/paid pay period and cannot be edited');
        return;
      }
      
      setEditingEntry(null);
      setEntryType('regular');
      setStartTime('09:00');
      setEndTime('17:30');
      setHasPerDiem(false);
      // Set default project to current project if available, otherwise first project
      setSelectedProject(currentProjectId || (projects.length > 0 ? projects[0].id : ''));
    }
    
    setSelectedDate(date);
    setShowModal(true);
  };

  const getLastLoggedEntry = async (): Promise<TimeEntry | null> => {
    try {
      // First, try to use already-loaded entries from the current week
      let entries = [...timeEntries];
      
      // If we don't have entries or need to look further back, fetch more
      // Use selectedDate as endDate if available, otherwise use today + 7 days
      const endDate = selectedDate ? new Date(selectedDate) : new Date();
      if (!selectedDate) {
        endDate.setDate(endDate.getDate() + 7); // Include future dates
      }
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Look back 6 months
      
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;
      
      const response = await apiClient.getTimeEntries({ startDate: startDateStr, endDate: endDateStr });
      
      if (response.success && response.data) {
        const fetchedEntries = (response.data as any).timeEntries || [];
        // Merge with existing entries, avoiding duplicates
        const existingIds = new Set(entries.map(e => e.id));
        const newEntries = fetchedEntries.filter((e: TimeEntry) => !existingIds.has(e.id));
        entries = [...entries, ...newEntries];
      }
      
      if (entries.length === 0) {
        return null;
      }
      
      // Filter out the current selected date and sort by date descending
      const filteredEntries = selectedDate 
        ? entries.filter((entry: TimeEntry) => entry.date !== selectedDate)
        : entries;
      
      if (filteredEntries.length === 0) {
        return null;
      }
      
      // Sort by date descending and get the most recent entry
      const sortedEntries = [...filteredEntries].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      return sortedEntries[0];
    } catch (error) {
      return null;
    }
  };

  const handleSameAsLastDay = async () => {
    if (!selectedDate) return;
    
    try {
      setError('');
      setLoading(true);
      const lastEntry = await getLastLoggedEntry();
      
      if (!lastEntry) {
        setError('No previous entries found.');
        setLoading(false);
        return;
      }
      
      // Determine entry type and set form values
      // Check special day types first (order matters - check more specific types first)
      let entryTypeValue: EntryType = 'regular';
      let startTimeValue = lastEntry.startTime || '09:00';
      let endTimeValue = lastEntry.endTime || '17:30';
      let hasPerDiemValue = false;
      
      // Check for per diem only FIRST (before other checks)
      // Per diem only: has per diem, no start/end time, no totalHours (or 0), no special day flags
      // Debug: Log the entry to see what we're working with
      console.log('Last entry data:', {
        startTime: lastEntry.startTime,
        endTime: lastEntry.endTime,
        totalHours: lastEntry.totalHours,
        hasPerDiem: lastEntry.hasPerDiem,
        perDiem: lastEntry.perDiem,
        isHoliday: lastEntry.isHoliday,
        sickDay: lastEntry.sickDay,
        rotationDay: lastEntry.rotationDay,
        isPTO: lastEntry.isPTO,
        isTravelDay: lastEntry.isTravelDay,
      });
      
      const hasPerDiem = lastEntry.hasPerDiem === true || (lastEntry.perDiem !== undefined && lastEntry.perDiem !== null && Number(lastEntry.perDiem) > 0);
      const noTimeFields = (!lastEntry.startTime || lastEntry.startTime === null || lastEntry.startTime === '') && 
                           (!lastEntry.endTime || lastEntry.endTime === null || lastEntry.endTime === '');
      const noHours = !lastEntry.totalHours || lastEntry.totalHours === 0 || lastEntry.totalHours === null;
      const noSpecialDays = !lastEntry.isHoliday && !lastEntry.sickDay && !lastEntry.rotationDay && !lastEntry.isPTO && !lastEntry.isTravelDay;
      
      console.log('Per diem only check:', {
        hasPerDiem,
        noTimeFields,
        noHours,
        noSpecialDays,
        isPerDiemOnly: hasPerDiem && noTimeFields && noHours && noSpecialDays,
      });
      
      // If it has per diem, no time fields, no hours, and no special days, it must be per diem only
      const isPerDiemOnly = hasPerDiem && noTimeFields && noHours && noSpecialDays;
      
      if (isPerDiemOnly) {
        entryTypeValue = 'none';
        startTimeValue = '09:00';
        endTimeValue = '17:00';
        hasPerDiemValue = true;
      } else if (lastEntry.isHoliday) {
        entryTypeValue = 'holiday';
        startTimeValue = '09:00';
        endTimeValue = '17:30';
        const perDiemValue = lastEntry.perDiem !== undefined ? lastEntry.perDiem : (lastEntry.hasPerDiem ? 1 : 0);
        hasPerDiemValue = perDiemValue > 0;
      } else if (lastEntry.sickDay) {
        entryTypeValue = 'sick';
        startTimeValue = '09:00';
        endTimeValue = '17:30';
        const perDiemValue = lastEntry.perDiem !== undefined ? lastEntry.perDiem : (lastEntry.hasPerDiem ? 1 : 0);
        hasPerDiemValue = perDiemValue > 0;
      } else if (lastEntry.rotationDay === true) {
        entryTypeValue = 'rotation';
        startTimeValue = '09:00';
        endTimeValue = '17:30';
        const perDiemValue = lastEntry.perDiem !== undefined ? lastEntry.perDiem : (lastEntry.hasPerDiem ? 1 : 0);
        hasPerDiemValue = perDiemValue > 0;
      } else if (lastEntry.isPTO) {
        entryTypeValue = 'pto';
        startTimeValue = '09:00';
        endTimeValue = '17:30';
      } else if (lastEntry.isTravelDay) {
        entryTypeValue = 'travel';
        startTimeValue = '09:00';
        endTimeValue = '17:30';
        const perDiemValue = lastEntry.perDiem !== undefined ? lastEntry.perDiem : (lastEntry.hasPerDiem ? 1 : 0);
        hasPerDiemValue = perDiemValue > 0;
      } else {
        entryTypeValue = 'regular';
        startTimeValue = lastEntry.startTime || '09:00';
        endTimeValue = lastEntry.endTime || '17:30';
        const perDiemValue = lastEntry.perDiem !== undefined ? lastEntry.perDiem : (lastEntry.hasPerDiem ? 1 : 0);
        hasPerDiemValue = perDiemValue > 0;
      }
      
      // Check if weekend and trying to save restricted entry types
      if (isWeekend(selectedDate)) {
        if (entryTypeValue === 'holiday' || entryTypeValue === 'sick' || entryTypeValue === 'pto' || entryTypeValue === 'rotation') {
          setError('Holiday, Sick Day, PTO, and Rotation Day cannot be logged on weekends. Please select a different entry type.');
          setLoading(false);
          return;
        }
      }
      
      // Prepare entry data
      const entryData: any = {
        date: selectedDate,
        hasPerDiem: false,
        sickDay: false,
        rotationDay: false,
        isTravelDay: false,
        isPTO: false,
        isHoliday: false,
      };

      if (entryTypeValue === 'regular') {
        entryData.startTime = startTimeValue;
        entryData.endTime = endTimeValue;
        entryData.hasPerDiem = hasPerDiemValue;
      } else if (entryTypeValue === 'pto') {
        entryData.isPTO = true;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryTypeValue === 'holiday') {
        entryData.isHoliday = true;
        entryData.hasPerDiem = hasPerDiemValue;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryTypeValue === 'sick') {
        entryData.sickDay = true;
        entryData.hasPerDiem = hasPerDiemValue;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryTypeValue === 'rotation') {
        entryData.rotationDay = true;
        entryData.hasPerDiem = hasPerDiemValue;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryTypeValue === 'travel') {
        entryData.isTravelDay = true;
        entryData.hasPerDiem = hasPerDiemValue;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryTypeValue === 'none') {
        entryData.hasPerDiem = true;
        entryData.startTime = null;
        entryData.endTime = null;
      }

      if (lastEntry.projectId || currentProjectId) {
        entryData.projectId = lastEntry.projectId || currentProjectId;
      }

      // Save the entry
      let response;
      if (editingEntry) {
        response = await apiClient.updateTimeEntry(editingEntry.id, entryData);
      } else {
        response = await apiClient.createTimeEntry(entryData);
      }

      if (response.success) {
        await loadTimeEntries();
        setShowModal(false);
        setSelectedDate(null);
        setEditingEntry(null);
        setEntryType('regular');
        setStartTime('09:00');
        setEndTime('17:30');
        setHasPerDiem(false);
        setSelectedProject('');
      } else {
        setError(response.error || 'Failed to save time entry');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to save time entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    try {
      setError('');
      setLoading(true);

      // Check if weekend and trying to save restricted entry types
      if (isWeekend(selectedDate)) {
        if (entryType === 'holiday' || entryType === 'sick' || entryType === 'pto' || entryType === 'rotation') {
          setError('Holiday, Sick Day, PTO, and Rotation Day cannot be logged on weekends. Please select a different entry type.');
          setLoading(false);
          return;
        }
      }

      const entryData: any = {
        date: selectedDate,
        hasPerDiem: false,
        sickDay: false,
        rotationDay: false,
        isTravelDay: false,
        isPTO: false,
        isHoliday: false,
      };

      if (entryType === 'regular') {
        entryData.startTime = startTime;
        entryData.endTime = endTime;
        entryData.hasPerDiem = hasPerDiem;
      } else if (entryType === 'pto') {
        entryData.isPTO = true;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryType === 'holiday') {
        entryData.isHoliday = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryType === 'sick') {
        entryData.sickDay = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryType === 'rotation') {
        entryData.rotationDay = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
        // Explicitly ensure other day types are false
        entryData.sickDay = false;
        entryData.isTravelDay = false;
        entryData.isPTO = false;
        entryData.isHoliday = false;
      } else if (entryType === 'travel') {
        entryData.isTravelDay = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryType === 'none') {
        entryData.hasPerDiem = true;
        entryData.startTime = null;
        entryData.endTime = null;
      }

      entryData.projectId = selectedProject;

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
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete time entry';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearWeek = async () => {
    try {
      setError('');
      setClearingWeek(true);
      
      const weekEntries = getCurrentWeekDraftEntries();
      
      if (weekEntries.length === 0) {
        setError('No entries to delete for this week.');
        setClearingWeek(false);
        setShowClearWeekConfirm(false);
        return;
      }

      const deletePromises = weekEntries.map(entry => 
        apiClient.deleteTimeEntry(entry.id).catch(err => {
          return { success: false, error: err.message };
        })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        setError(`Failed to delete ${failed.length} ${failed.length === 1 ? 'entry' : 'entries'}.`);
      } else {
        setSuccess(`Successfully cleared ${weekEntries.length} ${weekEntries.length === 1 ? 'entry' : 'entries'} from this week.`);
        setTimeout(() => setSuccess(''), 5000);
      }
      
      await loadTimeEntries();
      setShowClearWeekConfirm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to clear week entries');
    } finally {
      setClearingWeek(false);
    }
  };

  const getEntryForDate = (date: string): TimeEntry | undefined => {
    return timeEntries.find(entry => entry.date === date);
  };

  const getDraftEntries = (): TimeEntry[] => {
    return timeEntries.filter(entry => !entry.payPeriodId);
  };

  const getCurrentWeekDraftEntries = (): TimeEntry[] => {
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    
    return timeEntries.filter(entry => {
      // Include entries that are either:
      // 1. Not in any pay period (draft)
      // 2. In a DRAFT pay period (can be resubmitted)
      // 3. In a REJECTED pay period (will be converted to DRAFT when edited)
      if (entry.payPeriodId && entry.payPeriod) {
        const status = entry.payPeriod.status;
        if (status !== 'DRAFT' && status !== 'REJECTED') {
          return false;
        }
      }
      return entry.date >= weekStartStr && entry.date <= weekEndStr;
    });
  };

  const getCurrentWeekEntries = (): TimeEntry[] => {
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    
    return timeEntries.filter(entry => {
      return entry.date >= weekStartStr && entry.date <= weekEndStr;
    });
  };

  const calculateWeekSummary = () => {
    const weekEntries = getCurrentWeekEntries();
    let totalHours = 0;
    let totalHolidayHours = 0;
    let totalSickHours = 0;
    let totalRotationHours = 0;
    let totalTravelHours = 0;
    let totalPtoHours = 0;
    let totalPerDiem = 0;
    
    weekEntries.forEach(entry => {
      // Count hours by type
      if (entry.isHoliday) {
        totalHolidayHours += 8;
      } else if (entry.sickDay) {
        totalSickHours += 8;
      } else if (entry.rotationDay) {
        totalRotationHours += 8;
      } else if (entry.isTravelDay) {
        totalTravelHours += 8;
      } else if (entry.isPTO) {
        totalPtoHours += 8;
      } else {
        // Regular hours
        if (entry.totalHours !== null && entry.totalHours !== undefined) {
          totalHours += entry.totalHours;
        }
      }
      
      // Sum per diem values
      const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
      totalPerDiem += perDiemValue;
    });
    
    // Calculate overtime (hours over 40)
    const overtimeHours = totalHours > 40 ? totalHours - 40 : 0;
    
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      totalHolidayHours: Math.round(totalHolidayHours * 100) / 100,
      totalSickHours: Math.round(totalSickHours * 100) / 100,
      totalRotationHours: Math.round(totalRotationHours * 100) / 100,
      totalTravelHours: Math.round(totalTravelHours * 100) / 100,
      totalPtoHours: Math.round(totalPtoHours * 100) / 100,
      totalPerDiem: Math.round(totalPerDiem * 100) / 100,
    };
  };

  const getCurrentWeekPayPeriod = (): { id: string; status: string } | null => {
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    
    // Find any entry in this week that has a pay period
    const weekEntry = timeEntries.find(entry => {
      if (!entry.payPeriodId || !entry.payPeriod) return false;
      return entry.date >= weekStartStr && entry.date <= weekEndStr;
    });
    
    if (weekEntry && weekEntry.payPeriod) {
      return {
        id: weekEntry.payPeriod.id,
        status: weekEntry.payPeriod.status,
      };
    }
    
    return null;
  };

  const handleSubmitPayPeriod = () => {
    const draftEntries = getCurrentWeekDraftEntries();
    
    if (draftEntries.length === 0) {
      setError('No draft entries found for this week to submit.');
      return;
    }

    // Show confirmation modal
    setShowSubmitConfirm(true);
  };

  const confirmSubmitPayPeriod = async () => {
    setShowSubmitConfirm(false);
    const draftEntries = getCurrentWeekDraftEntries();
    
    try {
      setSubmitting(true);
      setError('');

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

      // Check if there's an existing DRAFT pay period for this week
      const existingPayPeriod = getCurrentWeekPayPeriod();
      let payPeriodId: string;

      if (existingPayPeriod && existingPayPeriod.status === 'DRAFT') {
        // Use existing DRAFT pay period
        payPeriodId = existingPayPeriod.id;
        
        // Update time entries
        const timeEntryIds = draftEntries.map(entry => entry.id);
        const updateResponse = await apiClient.updatePayPeriod(payPeriodId, { timeEntryIds });
        
        if (!updateResponse.success) {
          throw new Error(updateResponse.error || 'Failed to associate time entries with pay period');
        }
      } else {
        // Create new pay period
        const createResponse = await apiClient.createPayPeriod({ startDate, endDate });
        
        if (!createResponse.success || !createResponse.data) {
          throw new Error(createResponse.error || 'Failed to create pay period');
        }

        payPeriodId = (createResponse.data as any).payPeriod?.id;
        if (!payPeriodId) {
          throw new Error('Pay period ID not returned');
        }

        const timeEntryIds = draftEntries.map(entry => entry.id);
        const updateResponse = await apiClient.updatePayPeriod(payPeriodId, { timeEntryIds });
        
        if (!updateResponse.success) {
          throw new Error(updateResponse.error || 'Failed to associate time entries with pay period');
        }
      }

      const submitResponse = await apiClient.submitPayPeriod(payPeriodId);
      
      if (!submitResponse.success) {
        throw new Error(submitResponse.error || 'Failed to submit pay period');
      }

      await loadTimeEntries();
      
      setSuccess('Pay period has been submitted successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit pay period');
    } finally {
      setSubmitting(false);
    }
  };

  const getDayClass = (date: string): string => {
    const entry = getEntryForDate(date);
    if (!entry) return styles.day;
    
    if (entry.payPeriodId && entry.payPeriod) {
      const status = entry.payPeriod.status;
      if (status === 'PAID') {
        return styles.dayPaid;
      } else if (status === 'APPROVED') {
        return styles.dayApproved;
      } else if (status === 'REJECTED') {
        return styles.dayRejected;
      } else if (status === 'SUBMITTED') {
        return styles.daySubmitted;
      }
    }
    
    return styles.dayRegular;
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
    
    if (entry.hasPerDiem === true) {
      details.push('Per Diem');
    }
    
    return { type: 'REGULAR', details };
  };

  const renderCalendar = () => {
    const days = [];
    const weekStart = new Date(currentWeekStart);
    
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
      const isLocked = isDateLocked(date);
      
      const dayNumber = String(currentDay.getDate()).padStart(2, '0');
      const monthNumber = String(currentDay.getMonth() + 1).padStart(2, '0');
      const dateDisplay = `${monthNumber}/${dayNumber}`;
      
      days.push(
        <div key={date} className={styles.dayWrapper}>
          <div className={styles.dayNumber}>{dateDisplay}</div>
          <div
            className={dayClass}
            onClick={isLocked ? undefined : () => handleDateClick(date)}
            style={isLocked ? { cursor: 'not-allowed', opacity: 0.6 } : { cursor: 'pointer' }}
            title={isLocked ? 'This date is part of a submitted/approved pay period and cannot be edited' : undefined}
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
                {entry?.project && (
                  <div className={styles.dayDetails} style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                    <div className={styles.dayDetailItem}>{entry.project.name}</div>
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

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.calendarHeader}>
          <button onClick={handlePrevWeek} className={styles.monthButton}>‹</button>
          <h2 className={styles.monthTitle}>
            {formatWeekRange()}
          </h2>
          <button onClick={handleNextWeek} className={styles.monthButton}>›</button>
        </div>


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

        <div className={styles.clearWeekSection}>
          {(() => {
            const currentPayPeriod = getCurrentWeekPayPeriod();
            const canSubmit = currentPayPeriod === null || 
                             currentPayPeriod.status === 'DRAFT' || 
                             currentPayPeriod.status === 'REJECTED';
            const draftEntries = getCurrentWeekDraftEntries();
            const hasEntries = draftEntries.length > 0;
            
            // Check if pay period has started (pay period starts on Monday of the current week)
            const payPeriodStarted = (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const weekStart = new Date(currentWeekStart);
              weekStart.setHours(0, 0, 0, 0);
              return today >= weekStart;
            })();
            
            return (
              <>
                <button 
                  onClick={handleSubmitPayPeriod} 
                  className={styles.submitButton}
                  disabled={submitting || !canSubmit || !hasEntries || !payPeriodStarted}
                  title={!payPeriodStarted ? 'Cannot submit until the pay period start date has been reached' : ''}
                >
                  {submitting ? 'Submitting...' : 'Submit Week'}
                </button>
                <button 
                  onClick={() => setShowClearWeekConfirm(true)} 
                  className={styles.clearWeekButton}
                  disabled={submitting || clearingWeek || !canSubmit || !hasEntries}
                >
                  {clearingWeek ? 'Clearing...' : 'Clear Week'}
                </button>
              </>
            );
          })()}
        </div>

        {(() => {
          const summary = calculateWeekSummary();
          return (
            <div className={styles.summarySection}>
              <h3 className={styles.summaryTitle}>Week Summary</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Regular Hours:</span>
                  <span className={styles.summaryValue}>{summary.totalHours.toFixed(2)}h</span>
                </div>
                {summary.overtimeHours > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Overtime Hours:</span>
                    <span className={styles.summaryValue}>{summary.overtimeHours.toFixed(2)}h</span>
                  </div>
                )}
                {summary.totalHolidayHours > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Holiday Hours:</span>
                    <span className={styles.summaryValue}>{summary.totalHolidayHours.toFixed(2)}h</span>
                  </div>
                )}
                {summary.totalSickHours > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Sick Hours:</span>
                    <span className={styles.summaryValue}>{summary.totalSickHours.toFixed(2)}h</span>
                  </div>
                )}
                {summary.totalRotationHours > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Rotation Hours:</span>
                    <span className={styles.summaryValue}>{summary.totalRotationHours.toFixed(2)}h</span>
                  </div>
                )}
                {summary.totalTravelHours > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Travel Hours:</span>
                    <span className={styles.summaryValue}>{summary.totalTravelHours.toFixed(2)}h</span>
                  </div>
                )}
                {summary.totalPtoHours > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>PTO Hours:</span>
                    <span className={styles.summaryValue}>{summary.totalPtoHours.toFixed(2)}h</span>
                  </div>
                )}
                {summary.totalPerDiem > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Total Per Diem:</span>
                    <span className={styles.summaryValue}>${(summary.totalPerDiem * 50).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className={styles.legend}>
          <h4>Legend</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendRegular}`}></div>
              <span>Draft Entries</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendSubmitted}`}></div>
              <span>Submitted Entries</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendApproved}`}></div>
              <span>Approved Entries</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendRejected}`}></div>
              <span>Rejected Entries</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendPaid}`}></div>
              <span>Paid Entries</span>
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
                      value="travel"
                      checked={entryType === 'travel'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                        setStartTime('09:00');
                        setEndTime('17:30');
                      }}
                    />
                    Travel Day
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="rotation"
                      checked={entryType === 'rotation'}
                      disabled={selectedDate ? isWeekend(selectedDate) : false}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                        setStartTime('09:00');
                        setEndTime('17:30');
                      }}
                    />
                    Rotation Day
                    {selectedDate && isWeekend(selectedDate) && <span className={styles.disabledHint}> (Not available on weekends)</span>}
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="none"
                      checked={entryType === 'none'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                      }}
                    />
                    Per Diem Only
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="pto"
                      checked={entryType === 'pto'}
                      disabled={selectedDate ? isWeekend(selectedDate) : false}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                        setStartTime('09:00');
                        setEndTime('17:30');
                      }}
                    />
                    PTO
                    {selectedDate && isWeekend(selectedDate) && <span className={styles.disabledHint}> (Not available on weekends)</span>}
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="sick"
                      checked={entryType === 'sick'}
                      disabled={selectedDate ? isWeekend(selectedDate) : false}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                        setStartTime('09:00');
                        setEndTime('17:30');
                      }}
                    />
                    Sick Day
                    {selectedDate && isWeekend(selectedDate) && <span className={styles.disabledHint}> (Not available on weekends)</span>}
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="holiday"
                      checked={entryType === 'holiday'}
                      disabled={selectedDate ? isWeekend(selectedDate) : false}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                        setStartTime('09:00');
                        setEndTime('17:30');
                      }}
                    />
                    Holiday
                    {selectedDate && isWeekend(selectedDate) && <span className={styles.disabledHint}> (Not available on weekends)</span>}
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Project *</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className={styles.input}
                  required
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.jobNumber}
                    </option>
                  ))}
                </select>
              </div>

              {entryType === 'regular' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Time</label>
                    <div className={styles.timeInputWrapper}>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={styles.timeInput}
                        step="1800"
                        lang="en-GB"
                      />
                      <div className={styles.timeButtonContainer}>
                        <button
                          type="button"
                          onClick={() => incrementTime(startTime, setStartTime)}
                          className={styles.timeButton}
                          aria-label="Increase time by 30 minutes"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => decrementTime(startTime, setStartTime)}
                          className={styles.timeButton}
                          aria-label="Decrease time by 30 minutes"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Time</label>
                    <div className={styles.timeInputWrapper}>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={styles.timeInput}
                        step="1800"
                        lang="en-GB"
                      />
                      <div className={styles.timeButtonContainer}>
                        <button
                          type="button"
                          onClick={() => incrementTime(endTime, setEndTime)}
                          className={styles.timeButton}
                          aria-label="Increase time by 30 minutes"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => decrementTime(endTime, setEndTime)}
                          className={styles.timeButton}
                          aria-label="Decrease time by 30 minutes"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
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

              {(entryType === 'sick' || entryType === 'holiday' || entryType === 'pto' || entryType === 'travel') && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      readOnly
                      className={styles.input}
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      readOnly
                      className={styles.input}
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <p className={styles.infoText}>
                      <strong>Total Hours: 8 hours</strong>
                    </p>
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

              {entryType === 'none' && (
                <p className={styles.infoText}>
                  Per diem will be automatically included for this entry.
                </p>
              )}

              {entryType === 'holiday' && (
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
                {!editingEntry && (
                  <button
                    type="button"
                    onClick={handleSameAsLastDay}
                    disabled={loading}
                    className={styles.saveButton}
                  >
                    Same as Last Day
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowSubmitConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalHeader}>
              <h2 className={styles.confirmModalTitle}>⚠️ Confirm Submission</h2>
            </div>
            <div className={styles.confirmModalBody}>
              <p className={styles.confirmModalMessage}>
                Once you submit this pay period, you will <strong>not be able to add more days or update any entries</strong> for this week.
              </p>
              <p className={styles.confirmModalSubMessage}>
                The pay period will be sent to admin for review. You can only edit entries if the pay period is rejected.
              </p>
            </div>
            <div className={styles.confirmModalActions}>
              <button
                onClick={confirmSubmitPayPeriod}
                disabled={submitting}
                className={styles.confirmButton}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className={styles.cancelConfirmButton}
              >
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Week Confirmation Modal */}
      {showClearWeekConfirm && (
        <div className={styles.modalOverlay} onClick={() => !clearingWeek && setShowClearWeekConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalHeader}>
              <h2 className={styles.confirmModalTitle}>⚠️ Clear Week</h2>
            </div>
            <div className={styles.confirmModalBody}>
              <p className={styles.confirmModalMessage}>
                Are you sure you want to delete <strong>all entries</strong> for this week?
              </p>
              <p className={styles.confirmModalSubMessage}>
                This action cannot be undone. Only draft and rejected entries will be deleted.
              </p>
            </div>
            <div className={styles.confirmModalActions}>
              <button
                onClick={handleClearWeek}
                disabled={clearingWeek}
                className={styles.confirmButton}
              >
                {clearingWeek ? 'Clearing...' : 'Yes, Clear Week'}
              </button>
              <button
                onClick={() => setShowClearWeekConfirm(false)}
                disabled={clearingWeek}
                className={styles.cancelConfirmButton}
              >
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

