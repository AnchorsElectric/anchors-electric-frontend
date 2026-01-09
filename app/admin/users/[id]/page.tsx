'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import { formatPhoneNumber, getPhoneDigits } from '@/lib/utils/phone-format';
import styles from './user-detail.module.scss';

interface User {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  ssn: string;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  emergencyContacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    relationship: string;
  }>;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<{ 
    paymentType: 'HOURLY' | 'SALARY';
    hourlyRate?: number;
    salaryAmount?: number;
    ptoDaysLeft?: number;
    sickDaysLeft?: number;
    currentProject?: {
      id: string;
      name: string;
      jobNumber: string;
      clientName: string;
    };
  } | null>(null);
  const [employeePaymentType, setEmployeePaymentType] = useState<'HOURLY' | 'SALARY'>('HOURLY');
  const [employeeHourlyRate, setEmployeeHourlyRate] = useState('');
  const [employeeSalaryAmount, setEmployeeSalaryAmount] = useState('');
  const [employeePtoDaysLeft, setEmployeePtoDaysLeft] = useState('10');
  const [employeeSickDaysLeft, setEmployeeSickDaysLeft] = useState('7');
  const [employeeProjectId, setEmployeeProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; jobNumber: string; clientName: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      relationship: '',
    },
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    checkAdminStatus();
    loadUser();
    loadEmployeeProfile();
    loadProjects();
  }, [router, userId]);

  const checkAdminStatus = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const profileData = response.data as any;
        const isUserAdmin = profileData.isAdmin || false;
        setIsAdmin(isUserAdmin);
        // The response structure is { user: {...}, isAdmin: ... }
        setCurrentUserId(profileData.user?.id || null);
        if (!isUserAdmin) {
          router.push('/employee/profile');
        }
      }
    } catch (err) {
      router.push('/dashboard');
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getUserById(userId);
      if (response.success && response.data) {
        const userData = (response.data as any).user;
        setUser(userData);
        setFormData({
          firstName: userData.firstName || '',
          middleName: userData.middleName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: formatPhoneNumber(userData.phone || ''),
          address1: userData.address1 || '',
          address2: userData.address2 || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zipCode || '',
          emergencyContact: userData.emergencyContacts?.[0] ? {
            firstName: userData.emergencyContacts[0].firstName || '',
            lastName: userData.emergencyContacts[0].lastName || '',
            phone: formatPhoneNumber(userData.emergencyContacts[0].phone || ''),
            email: userData.emergencyContacts[0].email || '',
            relationship: userData.emergencyContacts[0].relationship || '',
          } : {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            relationship: '',
          },
        });
        
        // If user has employee profile, load it
        if (userData.employee) {
          const profile: any = {
            paymentType: userData.employee.paymentType || 'HOURLY',
          };
          if (userData.employee.hourlyRate) {
            profile.hourlyRate = parseFloat(userData.employee.hourlyRate.toString());
            setEmployeeHourlyRate(userData.employee.hourlyRate.toString());
          }
          if (userData.employee.salaryAmount) {
            profile.salaryAmount = parseFloat(userData.employee.salaryAmount.toString());
            setEmployeeSalaryAmount(userData.employee.salaryAmount.toString());
          }
          if (userData.employee.currentProject) {
            profile.currentProject = userData.employee.currentProject;
            setEmployeeProjectId(userData.employee.currentProject.id);
          } else {
            setEmployeeProjectId('');
          }
          if (userData.employee.ptoDaysLeft !== undefined && userData.employee.ptoDaysLeft !== null) {
            profile.ptoDaysLeft = userData.employee.ptoDaysLeft;
            setEmployeePtoDaysLeft(userData.employee.ptoDaysLeft.toString());
          } else {
            profile.ptoDaysLeft = 10;
            setEmployeePtoDaysLeft('10');
          }
          if (userData.employee.sickDaysLeft !== undefined && userData.employee.sickDaysLeft !== null) {
            profile.sickDaysLeft = userData.employee.sickDaysLeft;
            setEmployeeSickDaysLeft(userData.employee.sickDaysLeft.toString());
          } else {
            profile.sickDaysLeft = 7;
            setEmployeeSickDaysLeft('7');
          }
          setEmployeeProfile(profile);
          setEmployeePaymentType(userData.employee.paymentType || 'HOURLY');
        } else {
          // No employee profile
          setEmployeeProfile(null);
          setEmployeeProjectId('');
          setEmployeePtoDaysLeft('10');
          setEmployeeSickDaysLeft('7');
        }
      } else {
        setError(response.error || 'Failed to load user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await apiClient.getProjects();
      if (response.success && response.data) {
        const projectsData = (response.data as any).projects || [];
        setProjects(projectsData);
      }
    } catch (err: any) {
      // Silently fail - projects are optional
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadEmployeeProfile = async () => {
    try {
      const response = await apiClient.getEmployeeProfile(userId);
      if (response.success && response.data) {
        const employee = (response.data as any).employee;
        const profile: any = {
          paymentType: employee.paymentType || 'HOURLY',
        };
        if (employee.hourlyRate) {
          profile.hourlyRate = parseFloat(employee.hourlyRate.toString());
          setEmployeeHourlyRate(employee.hourlyRate.toString());
        }
        if (employee.salaryAmount) {
          profile.salaryAmount = parseFloat(employee.salaryAmount.toString());
          setEmployeeSalaryAmount(employee.salaryAmount.toString());
        }
        if (employee.currentProject) {
          profile.currentProject = employee.currentProject;
          setEmployeeProjectId(employee.currentProject.id);
        } else {
          setEmployeeProjectId('');
        }
        if (employee.ptoDaysLeft !== undefined && employee.ptoDaysLeft !== null) {
          profile.ptoDaysLeft = employee.ptoDaysLeft;
          setEmployeePtoDaysLeft(employee.ptoDaysLeft.toString());
        } else {
          profile.ptoDaysLeft = 10;
          setEmployeePtoDaysLeft('10');
        }
        if (employee.sickDaysLeft !== undefined && employee.sickDaysLeft !== null) {
          profile.sickDaysLeft = employee.sickDaysLeft;
          setEmployeeSickDaysLeft(employee.sickDaysLeft.toString());
        } else {
          profile.sickDaysLeft = 7;
          setEmployeeSickDaysLeft('7');
        }
        setEmployeeProfile(profile);
        setEmployeePaymentType(employee.paymentType || 'HOURLY');
      } else {
        // Employee profile doesn't exist yet, that's okay
        setEmployeeProfile(null);
        setEmployeeProjectId('');
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError('Failed to load employee profile');
      }
      setEmployeeProfile(null);
      setEmployeeProjectId('');
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Format phone number if it's the phone field
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: formatted,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    setError('');
    setSuccess('');
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Format phone number if it's the phone field
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [name]: formatted,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [name]: value,
        },
      }));
    }
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate employee profile fields if they're being edited
    if (employeePaymentType === 'HOURLY' && (!employeeHourlyRate || parseFloat(employeeHourlyRate) <= 0)) {
      setError('Please enter a valid hourly rate');
      return;
    }
    if (employeePaymentType === 'SALARY' && (!employeeSalaryAmount || parseFloat(employeeSalaryAmount) <= 0)) {
      setError('Please enter a valid salary amount');
      return;
    }
    if (!employeePtoDaysLeft || parseInt(employeePtoDaysLeft, 10) < 0 || isNaN(parseInt(employeePtoDaysLeft, 10))) {
      setError('Please enter a valid PTO days value');
      return;
    }
    if (!employeeSickDaysLeft || parseInt(employeeSickDaysLeft, 10) < 0 || isNaN(parseInt(employeeSickDaysLeft, 10))) {
      setError('Please enter a valid sick days value');
      return;
    }
    if (!employeeProjectId) {
      setError('Please select a project');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile
      const updateData: any = {
        firstName: formData.firstName,
        middleName: formData.middleName || null,
        lastName: formData.lastName,
        email: formData.email,
        phone: getPhoneDigits(formData.phone),
        address1: formData.address1,
        address2: formData.address2 || null,
        city: formData.city,
        state: formData.state.toUpperCase(),
        zipCode: formData.zipCode,
      };

      // Only include emergency contact if at least one field is filled
      if (
        formData.emergencyContact.firstName ||
        formData.emergencyContact.lastName ||
        formData.emergencyContact.phone ||
        formData.emergencyContact.relationship
      ) {
        updateData.emergencyContact = {
          firstName: formData.emergencyContact.firstName,
          lastName: formData.emergencyContact.lastName,
          phone: getPhoneDigits(formData.emergencyContact.phone),
          email: formData.emergencyContact.email || null,
          relationship: formData.emergencyContact.relationship,
        };
      }

      const userResponse = await apiClient.updateUserById(userId, updateData);

      if (!userResponse.success) {
        setError(userResponse.error || 'Failed to update user');
        setSaving(false);
        return;
      }

      // Update employee profile (only if it exists)
      if (employeeProfile) {
        const employeeData: any = {
          paymentType: employeePaymentType,
          ptoDaysLeft: parseInt(employeePtoDaysLeft, 10),
          sickDaysLeft: parseInt(employeeSickDaysLeft, 10),
        };
        if (employeePaymentType === 'HOURLY') {
          employeeData.hourlyRate = parseFloat(employeeHourlyRate);
        } else {
          employeeData.salaryAmount = parseFloat(employeeSalaryAmount);
        }
        employeeData.currentProjectId = employeeProjectId;

        const employeeResponse = await apiClient.updateEmployeeProfile(userId, employeeData);
        if (!employeeResponse.success) {
          setError(employeeResponse.error || 'Failed to update employee profile');
          setSaving(false);
          return;
        }
      }

      setSuccess('User and employee profile updated successfully!');
      setIsEditing(false);
      await loadUser();
      await loadEmployeeProfile();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEmployeeProfile = async () => {
    // Validate fields
    if (employeePaymentType === 'HOURLY' && (!employeeHourlyRate || parseFloat(employeeHourlyRate) <= 0)) {
      setError('Please enter a valid hourly rate');
      return;
    }
    if (employeePaymentType === 'SALARY' && (!employeeSalaryAmount || parseFloat(employeeSalaryAmount) <= 0)) {
      setError('Please enter a valid salary amount');
      return;
    }
    if (!employeePtoDaysLeft || parseInt(employeePtoDaysLeft, 10) < 0 || isNaN(parseInt(employeePtoDaysLeft, 10))) {
      setError('Please enter a valid PTO days value');
      return;
    }
    if (!employeeSickDaysLeft || parseInt(employeeSickDaysLeft, 10) < 0 || isNaN(parseInt(employeeSickDaysLeft, 10))) {
      setError('Please enter a valid sick days value');
      return;
    }
    if (!employeeProjectId) {
      setError('Please select a project');
      return;
    }

    setSavingEmployee(true);
    setError('');
    setSuccess('');

    try {
      const employeeData: any = {
        paymentType: employeePaymentType,
        ptoDaysLeft: parseInt(employeePtoDaysLeft, 10),
        sickDaysLeft: parseInt(employeeSickDaysLeft, 10),
      };
      if (employeePaymentType === 'HOURLY') {
        employeeData.hourlyRate = parseFloat(employeeHourlyRate);
      } else {
        employeeData.salaryAmount = parseFloat(employeeSalaryAmount);
      }
      employeeData.currentProjectId = employeeProjectId;

      const response = await apiClient.createEmployeeProfile(userId, employeeData);
      if (response.success) {
        setSuccess('Employee profile created successfully!');
        setShowEmployeeModal(false);
        await loadEmployeeProfile();
      } else {
        setError(response.error || 'Failed to create employee profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create employee profile');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleSubmitOld = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = {
        firstName: formData.firstName,
        middleName: formData.middleName || null,
        lastName: formData.lastName,
        email: formData.email,
        phone: getPhoneDigits(formData.phone),
        address1: formData.address1,
        address2: formData.address2 || null,
        city: formData.city,
        state: formData.state.toUpperCase(),
        zipCode: formData.zipCode,
      };

      // Only include emergency contact if at least one field is filled
      if (
        formData.emergencyContact.firstName ||
        formData.emergencyContact.lastName ||
        formData.emergencyContact.phone ||
        formData.emergencyContact.relationship
      ) {
        updateData.emergencyContact = {
          firstName: formData.emergencyContact.firstName,
          lastName: formData.emergencyContact.lastName,
          phone: getPhoneDigits(formData.emergencyContact.phone),
          email: formData.emergencyContact.email || null,
          relationship: formData.emergencyContact.relationship,
        };
      }

      const response = await apiClient.updateUserById(userId, updateData);
      if (response.success) {
        setSuccess(response.message || 'User information has been updated successfully!');
        setIsEditing(false);
        // Reload user data
        await loadUser();
      } else {
        setError(response.error || 'Failed to update user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.deactivateUser(userId);
      if (response.success) {
        setSuccess('User deactivated successfully');
        setShowDeactivateModal(false);
        await loadUser();
      } else {
        setError(response.error || 'Failed to deactivate user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to deactivate user');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.reactivateUser(userId);
      if (response.success) {
        setSuccess('User reactivated successfully');
        await loadUser();
      } else {
        setError(response.error || 'Failed to reactivate user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reactivate user');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Loading user details...</div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.error}>{error || 'User not found'}</div>
          <button onClick={() => router.push('/admin/users')} className={styles.backButton}>
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Details</h1>
        <div className={styles.headerActions}>
          {!isEditing ? (
            <>
              {employeeProfile && (
                <button onClick={async () => {
                  // Load latest employee profile data and projects before entering edit mode
                  await loadEmployeeProfile();
                  await loadProjects();
                  if (employeeProfile) {
                    setEmployeePaymentType(employeeProfile.paymentType);
                    setEmployeeHourlyRate(employeeProfile.hourlyRate?.toString() || '');
                    setEmployeeSalaryAmount(employeeProfile.salaryAmount?.toString() || '');
                    // If no project assigned, select the first available project
                    if (employeeProfile.currentProject?.id) {
                      setEmployeeProjectId(employeeProfile.currentProject.id);
                    } else if (projects.length > 0) {
                      setEmployeeProjectId(projects[0].id);
                    } else {
                      setEmployeeProjectId('');
                    }
                    setEmployeePtoDaysLeft(employeeProfile.ptoDaysLeft?.toString() || '10');
                    setEmployeeSickDaysLeft(employeeProfile.sickDaysLeft?.toString() || '7');
                  }
                  setIsEditing(true);
                }} className={styles.editButton}>
                  Edit User
                </button>
              )}
              {!employeeProfile && (
                <button onClick={async () => {
                  // Load projects before opening modal
                  await loadProjects();
                  // Initialize for new employee profile
                  setEmployeePaymentType('HOURLY');
                  setEmployeeHourlyRate('');
                  setEmployeeSalaryAmount('');
                  setEmployeeProjectId(projects.length > 0 ? projects[0].id : '');
                  setEmployeePtoDaysLeft('10');
                  setEmployeeSickDaysLeft('7');
                  setShowEmployeeModal(true);
                }} className={styles.createEmployeeButton}>
                  Create Employee Profile
                </button>
              )}
              {user.isActive ? (
                currentUserId && currentUserId !== userId && (
                  <button 
                    onClick={() => setShowDeactivateModal(true)} 
                    className={styles.deactivateButton}
                    disabled={saving}
                  >
                    Deactivate User
                  </button>
                )
              ) : (
                currentUserId && currentUserId !== userId && (
                  <button 
                    onClick={handleReactivate} 
                    className={styles.reactivateButton}
                    disabled={saving}
                  >
                    {saving ? 'Reactivating...' : 'Reactivate User'}
                  </button>
                )
              )}
              {currentUserId && currentUserId !== userId && (
                <button onClick={() => setShowDeleteModal(true)} className={styles.deleteButton}>
                  Delete User
                </button>
              )}
            </>
          ) : null}
          <button onClick={() => router.push('/admin/users')} className={styles.backButton}>
            ← Back to Users
          </button>
        </div>
      </div>

      {success && (
        <div className={styles.success}>{success}</div>
      )}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.card}>
        {/* Personal Information */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal Information</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.firstName}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Middle Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.middleName || 'N/A'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.lastName}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.email}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="(XXX) XXX-XXXX"
                  maxLength={14}
                />
              ) : (
                <div className={styles.value}>{user.phone}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Date of Birth</label>
              <div className={styles.value}>
                {new Date(user.dateOfBirth).toLocaleDateString()}
              </div>
            </div>
            <div className={styles.field}>
              <label>SSN</label>
              <div className={styles.value}>{user.ssn}</div>
            </div>
            <div className={styles.field}>
              <label>Role</label>
              <div className={styles.value}>
                <span className={`${styles.role} ${styles[user.role.toLowerCase()]}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <div className={styles.field}>
              <label>Account Status</label>
              <div className={styles.value}>
                {user.isActive ? (
                  <span className={styles.activeStatus}>Active</span>
                ) : (
                  <span className={styles.inactiveStatus}>Deactivated</span>
                )}
              </div>
            </div>
            <div className={styles.field}>
              <label>Email Verified</label>
              <div className={styles.value}>
                {user.emailVerified ? (
                  <span className={styles.verified}>✓ Verified</span>
                ) : (
                  <span className={styles.unverified}>✗ Not Verified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact Information</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Address Line 1</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address1"
                  value={formData.address1}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.address1}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Address Line 2</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address2"
                  value={formData.address2}
                  onChange={handleChange}
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.address2 || 'N/A'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>City</label>
              {isEditing ? (
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.city}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>State</label>
              {isEditing ? (
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  maxLength={2}
                  className={styles.input}
                  placeholder="XX"
                />
              ) : (
                <div className={styles.value}>{user.state}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Zip Code</label>
              {isEditing ? (
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  required
                  pattern="^\d{5}(-\d{4})?$"
                  className={styles.input}
                />
              ) : (
                <div className={styles.value}>{user.zipCode}</div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Emergency Contacts</h2>
          <div className={styles.emergencyContacts}>
            <div className={styles.emergencyContact}>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.emergencyContact.firstName}
                      onChange={handleEmergencyContactChange}
                      className={styles.input}
                    />
                  ) : (
                    <div className={styles.value}>
                      {user.emergencyContacts?.[0]?.firstName || 'N/A'}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.emergencyContact.lastName}
                      onChange={handleEmergencyContactChange}
                      className={styles.input}
                    />
                  ) : (
                    <div className={styles.value}>
                      {user.emergencyContacts?.[0]?.lastName || 'N/A'}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.emergencyContact.phone}
                      onChange={handleEmergencyContactChange}
                      className={styles.input}
                      placeholder="(XXX) XXX-XXXX"
                      maxLength={14}
                    />
                  ) : (
                    <div className={styles.value}>
                      {user.emergencyContacts?.[0]?.phone || 'N/A'}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.emergencyContact.email}
                      onChange={handleEmergencyContactChange}
                      className={styles.input}
                    />
                  ) : (
                    <div className={styles.value}>
                      {user.emergencyContacts?.[0]?.email || 'N/A'}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Relationship</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={handleEmergencyContactChange}
                      className={styles.input}
                    />
                  ) : (
                    <div className={styles.value}>
                      {user.emergencyContacts?.[0]?.relationship || 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Profile */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Employee Profile</h2>
          {!employeeProfile && !isEditing && (
            <p style={{ marginBottom: '1rem', color: '#666', fontStyle: 'italic' }}>
              No employee profile exists for this user. Click "Edit User" to create one.
            </p>
          )}
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Payment Type{isEditing && ' *'}</label>
              {isEditing ? (
                <select
                  value={employeePaymentType}
                  onChange={(e) => {
                    setEmployeePaymentType(e.target.value as 'HOURLY' | 'SALARY');
                    if (e.target.value === 'HOURLY') {
                      setEmployeeSalaryAmount('');
                    } else {
                      setEmployeeHourlyRate('');
                    }
                  }}
                  className={styles.input}
                  required
                  disabled={saving}
                >
                  <option value="HOURLY">HOURLY</option>
                  <option value="SALARY">SALARY</option>
                </select>
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.paymentType || 'N/A'}
                </div>
              )}
            </div>
            {isEditing ? (
              employeePaymentType === 'HOURLY' ? (
                <div className={styles.field}>
                  <label>Hourly Rate ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeHourlyRate}
                    onChange={(e) => setEmployeeHourlyRate(e.target.value)}
                    className={styles.input}
                    placeholder="0.00"
                    required
                    disabled={saving}
                  />
                </div>
              ) : (
                <div className={styles.field}>
                  <label>Salary Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeSalaryAmount}
                    onChange={(e) => setEmployeeSalaryAmount(e.target.value)}
                    className={styles.input}
                    placeholder="0.00"
                    required
                    disabled={saving}
                  />
                </div>
              )
            ) : (
              <>
                {employeeProfile?.paymentType === 'HOURLY' && employeeProfile.hourlyRate ? (
                  <div className={styles.field}>
                    <label>Hourly Rate</label>
                    <div className={styles.value}>
                      ${employeeProfile.hourlyRate.toFixed(2)}/hour
                    </div>
                  </div>
                ) : employeeProfile?.salaryAmount ? (
                  <div className={styles.field}>
                    <label>Salary Amount</label>
                    <div className={styles.value}>
                      ${employeeProfile.salaryAmount.toFixed(2)}/period
                    </div>
                  </div>
                ) : null}
              </>
            )}
            <div className={styles.field}>
              <label>PTO Days Left{isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={employeePtoDaysLeft}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow digits
                    if (value === '' || /^\d+$/.test(value)) {
                      setEmployeePtoDaysLeft(value);
                    }
                  }}
                  className={styles.input}
                  placeholder="10"
                  required
                  disabled={saving}
                />
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.ptoDaysLeft !== undefined && employeeProfile.ptoDaysLeft !== null 
                    ? employeeProfile.ptoDaysLeft 
                    : 'N/A'}
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label>Sick Days Left{isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={employeeSickDaysLeft}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow digits
                    if (value === '' || /^\d+$/.test(value)) {
                      setEmployeeSickDaysLeft(value);
                    }
                  }}
                  className={styles.input}
                  placeholder="7"
                  required
                  disabled={saving}
                />
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.sickDaysLeft !== undefined && employeeProfile.sickDaysLeft !== null 
                    ? employeeProfile.sickDaysLeft 
                    : 'N/A'}
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label>Current Project{isEditing && ' *'}</label>
              {isEditing ? (
                <select
                  value={employeeProjectId}
                  onChange={(e) => setEmployeeProjectId(e.target.value)}
                  className={styles.input}
                  disabled={saving || loadingProjects}
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.jobNumber}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.currentProject 
                    ? `${employeeProfile.currentProject.name} - ${employeeProfile.currentProject.jobNumber}`
                    : 'No project assigned'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Information</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Account Created</label>
              <div className={styles.value}>
                {new Date(user.createdAt).toLocaleString()}
              </div>
            </div>
            <div className={styles.field}>
              <label>Last Updated</label>
              <div className={styles.value}>
                {new Date(user.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={async () => {
                setIsEditing(false);
                setError('');
                setSuccess('');
                // Reset form data to original user data
                if (user) {
                  setFormData({
                    firstName: user.firstName || '',
                    middleName: user.middleName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    address1: user.address1 || '',
                    address2: user.address2 || '',
                    city: user.city || '',
                    state: user.state || '',
                    zipCode: user.zipCode || '',
                    emergencyContact: user.emergencyContacts?.[0] ? {
                      firstName: user.emergencyContacts[0].firstName || '',
                      lastName: user.emergencyContacts[0].lastName || '',
                      phone: user.emergencyContacts[0].phone || '',
                      email: user.emergencyContacts[0].email || '',
                      relationship: user.emergencyContacts[0].relationship || '',
                    } : {
                      firstName: '',
                      lastName: '',
                      phone: '',
                      email: '',
                      relationship: '',
                    },
                  });
                }
                // Reset employee profile fields
                await loadEmployeeProfile();
                if (employeeProfile) {
                  setEmployeePaymentType(employeeProfile.paymentType);
                  setEmployeeHourlyRate(employeeProfile.hourlyRate?.toString() || '');
                  setEmployeeSalaryAmount(employeeProfile.salaryAmount?.toString() || '');
                  setEmployeeProjectId(employeeProfile.currentProject?.id || '');
                  setEmployeePtoDaysLeft(employeeProfile.ptoDaysLeft?.toString() || '10');
                  setEmployeeSickDaysLeft(employeeProfile.sickDaysLeft?.toString() || '7');
                } else {
                  setEmployeePaymentType('HOURLY');
                  setEmployeeHourlyRate('');
                  setEmployeeSalaryAmount('');
                  setEmployeeProjectId('');
                  setEmployeePtoDaysLeft('10');
                  setEmployeeSickDaysLeft('7');
                }
              }}
              className={styles.cancelButton}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete User</h2>
              <button
                className={styles.modalClose}
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong> ({user.email})?
              </p>
              <p className={styles.warning}>
                This action cannot be undone. This will permanently delete:
              </p>
              <ul className={styles.deleteList}>
                <li>User account</li>
                <li>Employee profile (if exists)</li>
                <li>Emergency contacts</li>
                <li>All time entries</li>
                <li>All pay periods</li>
              </ul>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={async () => {
                  setDeleting(true);
                  setError('');
                  try {
                    const response = await apiClient.deleteUser(userId);
                    if (response.success) {
                      setSuccess('User deleted successfully');
                      setTimeout(() => {
                        router.push('/admin/users');
                      }, 1500);
                    } else {
                      setError(response.error || 'Failed to delete user');
                      setDeleting(false);
                    }
                  } catch (err: any) {
                    setError(err.response?.data?.error || 'Failed to delete user');
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className={styles.modalOverlay} onClick={() => !saving && setShowDeactivateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Deactivate User</h2>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setShowDeactivateModal(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to deactivate <strong>{user.firstName} {user.lastName}</strong> ({user.email})?
              </p>
              <p className={styles.warning}>
                This user will not be able to log in until you reactivate their account.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDeactivateModal(false)}
                disabled={saving}
              >
                No, Cancel
              </button>
              <button
                className={styles.deactivateButton}
                onClick={handleDeactivate}
                disabled={saving}
              >
                {saving ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Employee Profile Modal */}
      {showEmployeeModal && (
        <div className={styles.modalOverlay} onClick={() => !savingEmployee && setShowEmployeeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create Employee Profile</h2>
              <button
                className={styles.modalClose}
                onClick={() => !savingEmployee && setShowEmployeeModal(false)}
                disabled={savingEmployee}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label htmlFor="modalPaymentType">Payment Type *</label>
                <select
                  id="modalPaymentType"
                  value={employeePaymentType}
                  onChange={(e) => {
                    setEmployeePaymentType(e.target.value as 'HOURLY' | 'SALARY');
                    if (e.target.value === 'HOURLY') {
                      setEmployeeSalaryAmount('');
                    } else {
                      setEmployeeHourlyRate('');
                    }
                  }}
                  className={styles.input}
                  required
                  disabled={savingEmployee}
                >
                  <option value="HOURLY">HOURLY</option>
                  <option value="SALARY">SALARY</option>
                </select>
              </div>
              {employeePaymentType === 'HOURLY' ? (
                <div className={styles.field}>
                  <label htmlFor="modalHourlyRate">Hourly Rate ($) *</label>
                  <input
                    id="modalHourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeHourlyRate}
                    onChange={(e) => setEmployeeHourlyRate(e.target.value)}
                    className={styles.input}
                    placeholder="0.00"
                    required
                    disabled={savingEmployee}
                  />
                </div>
              ) : (
                <div className={styles.field}>
                  <label htmlFor="modalSalaryAmount">Salary Amount ($) *</label>
                  <input
                    id="modalSalaryAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeSalaryAmount}
                    onChange={(e) => setEmployeeSalaryAmount(e.target.value)}
                    className={styles.input}
                    placeholder="0.00"
                    required
                    disabled={savingEmployee}
                  />
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="modalPtoDaysLeft">PTO Days Left *</label>
                <input
                  id="modalPtoDaysLeft"
                  type="number"
                  min="0"
                  step="1"
                  value={employeePtoDaysLeft}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setEmployeePtoDaysLeft(value);
                    }
                  }}
                  className={styles.input}
                  placeholder="10"
                  required
                  disabled={savingEmployee}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="modalSickDaysLeft">Sick Days Left *</label>
                <input
                  id="modalSickDaysLeft"
                  type="number"
                  min="0"
                  step="1"
                  value={employeeSickDaysLeft}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setEmployeeSickDaysLeft(value);
                    }
                  }}
                  className={styles.input}
                  placeholder="7"
                  required
                  disabled={savingEmployee}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="modalEmployeeProject">Current Project *</label>
                <select
                  id="modalEmployeeProject"
                  value={employeeProjectId}
                  onChange={(e) => setEmployeeProjectId(e.target.value)}
                  className={styles.input}
                  disabled={savingEmployee || loadingProjects}
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.jobNumber}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowEmployeeModal(false)}
                disabled={savingEmployee}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleCreateEmployeeProfile}
                disabled={savingEmployee}
              >
                {savingEmployee ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
