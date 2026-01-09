'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './time-entries.module.scss';

type EntryType = 'regular' | 'pto' | 'sick' | 'rotation' | 'travel' | 'holiday' | 'unpaidLeave' | 'none';

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
  const [ptoDaysLeft, setPtoDaysLeft] = useState<number | null>(null);
  const [sickDaysLeft, setSickDaysLeft] = useState<number | null>(null);
  const [payPeriods, setPayPeriods] = useState<Array<{ id: string; startDate: string; endDate: string; status: string }>>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
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
          setPtoDaysLeft(user.employee.ptoDaysLeft ?? null);
          setSickDaysLeft(user.employee.sickDaysLeft ?? null);
        } else {
          setHasEmployeeProfile(false);
          setPtoDaysLeft(null);
          setSickDaysLeft(null);
        }
      }
    } catch (err: any) {
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
      if (err.response?.status === 401 || err.response?.status === 403) {
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
        if (response.error?.includes('Employee profile not found')) {
          setError('Employee profile not found. Please contact an administrator to create your employee profile.');
        } else {
          setError(response.error || 'Failed to load time entries. Calendar will still work.');
        }
      }
    } catch (err: any) {
      setTimeEntries([]);
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
    const currentPayPeriod = getCurrentWeekPayPeriod();
    if (currentPayPeriod) {
      const status = currentPayPeriod.status;
      if (status === 'SUBMITTED' || status === 'APPROVED' || status === 'PAID') {
        return true;
      }
    }
    
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
    return day === 0 || day === 6;
  };

  const handleDateClick = async (date: string) => {
    if (!hasEmployeeProfile) {
      setError('Employee profile not found. Please contact an administrator to create your employee profile before adding time entries.');
      return;
    }

    await loadProfile();

    if (isDateLocked(date)) {
      setError('This date is part of a submitted/approved pay period and cannot be edited');
      return;
    }

    const existingEntry = timeEntries.find(entry => entry.date === date);
    
    if (existingEntry) {
      
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
        } else if (existingEntry.isUnpaidLeave) {
          setEntryType('unpaidLeave');
          setStartTime(null);
          setEndTime(null);
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
        const perDiemValue = existingEntry.perDiem !== undefined ? existingEntry.perDiem : (existingEntry.hasPerDiem ? 1 : 0);
        setHasPerDiem(perDiemValue > 0);
        setSelectedProject(existingEntry.projectId || currentProjectId || '');
      }
    } else {
      if (isDateLocked(date)) {
        setError('This date is part of a submitted/approved/paid pay period and cannot be edited');
        return;
      }
      
      setEditingEntry(null);
      setEntryType('regular');
      setStartTime('09:00');
      setEndTime('17:30');
      setHasPerDiem(false);
      setSelectedProject(currentProjectId || (projects.length > 0 ? projects[0].id : ''));
    }
    
    setSelectedDate(date);
    setShowModal(true);
  };

  const getLastLoggedEntry = async (): Promise<TimeEntry | null> => {
    try {
      let entries = [...timeEntries];
      
      const endDate = selectedDate ? new Date(selectedDate) : new Date();
      if (!selectedDate) {
        endDate.setDate(endDate.getDate() + 7);
      }
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      
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
        const existingIds = new Set(entries.map(e => e.id));
        const newEntries = fetchedEntries.filter((e: TimeEntry) => !existingIds.has(e.id));
        entries = [...entries, ...newEntries];
      }
      
      if (entries.length === 0) {
        return null;
      }
      
      const filteredEntries = selectedDate 
        ? entries.filter((entry: TimeEntry) => entry.date !== selectedDate)
        : entries;
      
      if (filteredEntries.length === 0) {
        return null;
      }
      
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
      
      let entryTypeValue: EntryType = 'regular';
      let startTimeValue = lastEntry.startTime || '09:00';
      let endTimeValue = lastEntry.endTime || '17:30';
      let hasPerDiemValue = false;
      
      const hasPerDiem = lastEntry.hasPerDiem === true || (lastEntry.perDiem !== undefined && lastEntry.perDiem !== null && Number(lastEntry.perDiem) > 0);
      const noTimeFields = (!lastEntry.startTime || lastEntry.startTime === null || lastEntry.startTime === '') && 
                           (!lastEntry.endTime || lastEntry.endTime === null || lastEntry.endTime === '');
      const noHours = !lastEntry.totalHours || lastEntry.totalHours === 0 || lastEntry.totalHours === null;
      const noSpecialDays = !lastEntry.isHoliday && !lastEntry.sickDay && !lastEntry.rotationDay && !lastEntry.isPTO && !lastEntry.isTravelDay;
      
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
      } else if (lastEntry.isUnpaidLeave) {
        entryTypeValue = 'unpaidLeave';
        startTimeValue = null;
        endTimeValue = null;
        hasPerDiemValue = false;
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
      
      if (isWeekend(selectedDate)) {
        if (entryTypeValue === 'holiday' || entryTypeValue === 'sick' || entryTypeValue === 'pto' || entryTypeValue === 'rotation') {
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
        isUnpaidLeave: false,
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
      } else if (entryTypeValue === 'unpaidLeave') {
        entryData.isUnpaidLeave = true;
        entryData.startTime = null;
        entryData.endTime = null;
        entryData.hasPerDiem = false;
      } else if (entryTypeValue === 'none') {
        entryData.hasPerDiem = true;
        entryData.startTime = null;
        entryData.endTime = null;
      }

      if (lastEntry.projectId || currentProjectId) {
        entryData.projectId = lastEntry.projectId || currentProjectId;
      }

      let response;
      if (editingEntry) {
        response = await apiClient.updateTimeEntry(editingEntry.id, entryData);
      } else {
        response = await apiClient.createTimeEntry(entryData);
      }

      if (response.success) {
        await loadTimeEntries();
        if (entryTypeValue === 'pto' || editingEntry?.isPTO) {
          await loadProfile();
        }
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
        isUnpaidLeave: false,
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
        entryData.sickDay = false;
        entryData.isTravelDay = false;
        entryData.isPTO = false;
        entryData.isHoliday = false;
      } else if (entryType === 'travel') {
        entryData.isTravelDay = true;
        entryData.hasPerDiem = hasPerDiem;
        entryData.startTime = '09:00';
        entryData.endTime = '17:30';
      } else if (entryType === 'unpaidLeave') {
        entryData.isUnpaidLeave = true;
        entryData.startTime = null;
        entryData.endTime = null;
        entryData.hasPerDiem = false;
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
        await loadTimeEntries();
        const wasPTO = entryType === 'pto' || editingEntry?.isPTO;
        const wasSickDay = entryType === 'sick' || editingEntry?.sickDay;
        if (wasPTO || wasSickDay) {
          await loadProfile();
        }
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
      const wasPTO = editingEntry.isPTO;
      const wasSickDay = editingEntry.sickDay;
      const response = await apiClient.deleteTimeEntry(editingEntry.id);
      if (response.success) {
        await loadTimeEntries();
        if (wasPTO || wasSickDay) {
          await loadProfile();
        }
        setShowModal(false);
        setSelectedDate(null);
        setEditingEntry(null);
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

      const hadPTOEntries = weekEntries.some(entry => entry.isPTO);
      const hadSickDayEntries = weekEntries.some(entry => entry.sickDay);

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
        if (hadPTOEntries || hadSickDayEntries) {
          await loadProfile();
        }
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
      if (entry.isUnpaidLeave) {
        return;
      }
      
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
        if (entry.totalHours !== null && entry.totalHours !== undefined) {
          totalHours += entry.totalHours;
        }
      }
      
      const perDiemValue = entry.perDiem !== undefined ? entry.perDiem : (entry.hasPerDiem ? 1 : 0);
      totalPerDiem += perDiemValue;
    });
    
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

      const existingPayPeriod = getCurrentWeekPayPeriod();
      let payPeriodId: string;

      if (existingPayPeriod && existingPayPeriod.status === 'DRAFT') {
        payPeriodId = existingPayPeriod.id;
        
        const timeEntryIds = draftEntries.map(entry => entry.id);
        const updateResponse = await apiClient.updatePayPeriod(payPeriodId, { timeEntryIds });
        
        if (!updateResponse.success) {
          throw new Error(updateResponse.error || 'Failed to associate time entries with pay period');
        }
      } else {
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
                <div className={styles.dayType}>{dayInfo.type.replace(/_/g, ' ')}</div>
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
                    PTO{ptoDaysLeft !== null && ` (${ptoDaysLeft} ${ptoDaysLeft === 1 ? 'day' : 'days'} left)`}
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
                    Sick Day{sickDaysLeft !== null && ` (${sickDaysLeft} ${sickDaysLeft === 1 ? 'day' : 'days'} left)`}
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
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="entryType"
                      value="unpaidLeave"
                      checked={entryType === 'unpaidLeave'}
                      onChange={(e) => {
                        setEntryType(e.target.value as EntryType);
                        setStartTime(null);
                        setEndTime(null);
                        setHasPerDiem(false);
                      }}
                    />
                    Unpaid Leave
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

