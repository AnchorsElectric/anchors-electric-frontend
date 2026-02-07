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
  pantsSize: string | null;
  shirtSize: string | null;
  glovesSize: string | null;
  vestSize: string | null;
  jacketSize: string | null;
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
    title?: string;
    paymentType: 'HOURLY' | 'SALARY';
    hourlyRate?: number;
    salaryAmount?: number;
    ptoCredit?: number;
    weeklyPtoRate?: number;
    employmentStartDate?: string;
    sickDaysLeft?: number;
    currentProject?: {
      id: string;
      name: string;
      jobNumber: string;
      clientName: string;
    };
  } | null>(null);
  const [employeeTitle, setEmployeeTitle] = useState('');
  const [employeePaymentType, setEmployeePaymentType] = useState<'HOURLY' | 'SALARY'>('HOURLY');
  const [employeeHourlyRate, setEmployeeHourlyRate] = useState('');
  const [employeeSalaryAmount, setEmployeeSalaryAmount] = useState('');
  const [employeePtoCredit, setEmployeePtoCredit] = useState('0');
  const [employeeWeeklyPtoRate, setEmployeeWeeklyPtoRate] = useState('1.6');
  const [employeeEmploymentStartDate, setEmployeeEmploymentStartDate] = useState('');
  const [employeeSickDaysLeft, setEmployeeSickDaysLeft] = useState('5');
  const [employeeProjectId, setEmployeeProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; jobNumber: string; clientName: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string; type: 'CERTIFICATE' | 'PERSONAL_DOCUMENT' } | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [personalDocuments, setPersonalDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showCertUploadForm, setShowCertUploadForm] = useState(false);
  const [showDocUploadForm, setShowDocUploadForm] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [certFormData, setCertFormData] = useState({
    name: '',
    file: null as File | null,
    expirationDate: '',
    doesNotExpire: false,
  });
  const [docFormData, setDocFormData] = useState({
    name: '',
    file: null as File | null,
  });
  const [updatingRole, setUpdatingRole] = useState(false);
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
    ssn: '',
    emergencyContact: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      relationship: '',
    },
    pantsSize: '',
    shirtSize: '',
    glovesSize: '',
    vestSize: '',
    jacketSize: '',
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
    // Load documents after user is loaded
    if (userId) {
      loadUserDocuments();
    }
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
            ssn: userData.ssn || '',
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
          pantsSize: userData.pantsSize || '',
          shirtSize: userData.shirtSize || '',
          glovesSize: userData.glovesSize || '',
          vestSize: userData.vestSize || '',
          jacketSize: userData.jacketSize || '',
        });
        
        // If user has employee profile, load it
          if (userData.employee) {
            const profile: any = {
              paymentType: userData.employee.paymentType || 'HOURLY',
            };
            if (userData.employee.title) {
              profile.title = userData.employee.title;
              setEmployeeTitle(userData.employee.title);
            }
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
          if (userData.employee.ptoCredit !== undefined && userData.employee.ptoCredit !== null) {
            profile.ptoCredit = userData.employee.ptoCredit;
            setEmployeePtoCredit(userData.employee.ptoCredit.toString());
          } else {
            profile.ptoCredit = 0;
            setEmployeePtoCredit('0');
          }
          if (userData.employee.weeklyPtoRate !== undefined && userData.employee.weeklyPtoRate !== null) {
            profile.weeklyPtoRate = userData.employee.weeklyPtoRate;
            setEmployeeWeeklyPtoRate(userData.employee.weeklyPtoRate.toString());
          } else {
            profile.weeklyPtoRate = 1.6;
            setEmployeeWeeklyPtoRate('1.6');
          }
          if (userData.employee.employmentStartDate) {
            profile.employmentStartDate = userData.employee.employmentStartDate;
            setEmployeeEmploymentStartDate(userData.employee.employmentStartDate);
          } else {
            const today = new Date().toISOString().split('T')[0];
            setEmployeeEmploymentStartDate(today);
          }
          if (userData.employee.sickDaysLeft !== undefined && userData.employee.sickDaysLeft !== null) {
            profile.sickDaysLeft = userData.employee.sickDaysLeft;
            setEmployeeSickDaysLeft(userData.employee.sickDaysLeft.toString());
          } else {
            profile.sickDaysLeft = 5;
            setEmployeeSickDaysLeft('5');
          }
          setEmployeeProfile(profile);
          setEmployeePaymentType(userData.employee.paymentType || 'HOURLY');
        } else {
          // No employee profile
          setEmployeeProfile(null);
          setEmployeeTitle('');
          setEmployeeProjectId('');
          setEmployeePtoCredit('0');
          setEmployeeWeeklyPtoRate('1.6');
          const today = new Date().toISOString().split('T')[0];
          setEmployeeEmploymentStartDate(today);
          setEmployeeSickDaysLeft('5');
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

  const loadUserDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const [certsResponse, docsResponse] = await Promise.all([
        apiClient.getUserDocuments(userId, 'CERTIFICATE'),
        apiClient.getUserDocuments(userId, 'PERSONAL_DOCUMENT'),
      ]);
      
      if (certsResponse.success && certsResponse.data) {
        const certs = (certsResponse.data as any).documents || [];
        setCertificates(certs);
      } else {
        setCertificates([]);
      }
      
      if (docsResponse.success && docsResponse.data) {
        const docs = (docsResponse.data as any).documents || [];
        setPersonalDocuments(docs);
      } else {
        setPersonalDocuments([]);
      }
    } catch (err: any) {
      setCertificates([]);
      setPersonalDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDeleteDocumentClick = (documentId: string, documentName: string, documentType: 'CERTIFICATE' | 'PERSONAL_DOCUMENT') => {
    setDocumentToDelete({ id: documentId, name: documentName, type: documentType });
    setShowDeleteDocumentModal(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) {
      return;
    }

    setDeletingDocument(true);
    setError('');

    try {
      const response = await apiClient.deleteDocument(documentToDelete.id);
      if (response.success) {
        setSuccess('Document deleted successfully');
        setShowDeleteDocumentModal(false);
        setDocumentToDelete(null);
        loadUserDocuments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setDeletingDocument(false);
    }
  };

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCertFormData({ ...certFormData, file: e.target.files[0] });
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocFormData({ ...docFormData, file: e.target.files[0] });
    }
  };

  const handleUploadCertificate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setSuccess('');

    if (!certFormData.file) {
      setError('Please select a file');
      return;
    }

    if (!certFormData.name.trim()) {
      setError('Please enter a certificate name');
      return;
    }

    if (!certFormData.doesNotExpire && !certFormData.expirationDate) {
      setError('Please enter an expiration date or check "Does not expire"');
      return;
    }

    setUploadingCert(true);

    try {
      const response = await apiClient.uploadDocumentForUser(userId, certFormData.file, {
        name: certFormData.name.trim(),
        type: 'CERTIFICATE',
        expirationDate: certFormData.doesNotExpire ? null : certFormData.expirationDate,
        doesNotExpire: certFormData.doesNotExpire,
      });

      if (response.success) {
        setSuccess('Certificate uploaded successfully!');
        setCertFormData({
          name: '',
          file: null,
          expirationDate: '',
          doesNotExpire: false,
        });
        setShowCertUploadForm(false);
        loadUserDocuments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to upload certificate');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload certificate';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploadingCert(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setSuccess('');

    if (!docFormData.file) {
      setError('Please select a file');
      return;
    }

    if (!docFormData.name.trim()) {
      setError('Please enter a document name');
      return;
    }

    setUploadingDoc(true);

    try {
      const response = await apiClient.uploadDocumentForUser(userId, docFormData.file, {
        name: docFormData.name.trim(),
        type: 'PERSONAL_DOCUMENT',
        doesNotExpire: true,
      });

      if (response.success) {
        setSuccess('Document uploaded successfully!');
        setDocFormData({
          name: '',
          file: null,
        });
        setShowDocUploadForm(false);
        loadUserDocuments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to upload document');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload document';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRoleUpdate = async (newRole: 'USER' | 'ADMIN' | 'ACCOUNTANT' | 'HR' | 'PROJECT_MANAGER') => {
    if (!user || user.role === newRole) {
      return;
    }

    setUpdatingRole(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.updateUserRole(userId, newRole);
      if (response.success) {
        setSuccess('User role updated successfully');
        // Update local user state
        setUser({ ...user, role: newRole });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to update user role');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user role');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingRole(false);
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
        if (employee.title) {
          profile.title = employee.title;
          setEmployeeTitle(employee.title);
        }
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
        if (employee.ptoCredit !== undefined && employee.ptoCredit !== null) {
          profile.ptoCredit = employee.ptoCredit;
          setEmployeePtoCredit(employee.ptoCredit.toString());
        } else {
          profile.ptoCredit = 0;
          setEmployeePtoCredit('0');
        }
        if (employee.weeklyPtoRate !== undefined && employee.weeklyPtoRate !== null) {
          profile.weeklyPtoRate = employee.weeklyPtoRate;
          setEmployeeWeeklyPtoRate(employee.weeklyPtoRate.toString());
        } else {
          profile.weeklyPtoRate = 1.6;
          setEmployeeWeeklyPtoRate('1.6');
        }
        if (employee.employmentStartDate) {
          profile.employmentStartDate = employee.employmentStartDate;
          setEmployeeEmploymentStartDate(employee.employmentStartDate);
        } else {
          const today = new Date().toISOString().split('T')[0];
          setEmployeeEmploymentStartDate(today);
        }
        if (employee.sickDaysLeft !== undefined && employee.sickDaysLeft !== null) {
          profile.sickDaysLeft = employee.sickDaysLeft;
          setEmployeeSickDaysLeft(employee.sickDaysLeft.toString());
        } else {
          profile.sickDaysLeft = 5;
          setEmployeeSickDaysLeft('5');
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
    if (!employeePtoCredit || parseFloat(employeePtoCredit) < 0 || isNaN(parseFloat(employeePtoCredit))) {
      setError('Please enter a valid PTO credit value');
      return;
    }
    if (!employeeWeeklyPtoRate || parseFloat(employeeWeeklyPtoRate) <= 0 || parseFloat(employeeWeeklyPtoRate) > 4.0 || isNaN(parseFloat(employeeWeeklyPtoRate))) {
      setError('Please enter a valid weekly PTO rate (between 0 and 4.0)');
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

      updateData.emergencyContact = {
        firstName: formData.emergencyContact.firstName,
        lastName: formData.emergencyContact.lastName,
        phone: getPhoneDigits(formData.emergencyContact.phone),
        email: formData.emergencyContact.email || null,
        relationship: formData.emergencyContact.relationship,
      };

      if (formData.pantsSize) updateData.pantsSize = formData.pantsSize;
      if (formData.shirtSize) updateData.shirtSize = formData.shirtSize;
      if (formData.glovesSize) updateData.glovesSize = formData.glovesSize;
      if (formData.vestSize) updateData.vestSize = formData.vestSize;
      if (formData.jacketSize) updateData.jacketSize = formData.jacketSize;

      const userResponse = await apiClient.updateUserById(userId, updateData);

      if (!userResponse.success) {
        setError(userResponse.error || 'Failed to update user');
        setSaving(false);
        return;
      }

      // Update employee profile (only if it exists)
      if (employeeProfile) {
        const employeeData: any = {
          title: employeeTitle.trim(),
          paymentType: employeePaymentType,
          ptoCredit: parseFloat(employeePtoCredit),
          weeklyPtoRate: parseFloat(employeeWeeklyPtoRate),
          employmentStartDate: employeeEmploymentStartDate,
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
    if (!employeePtoCredit || parseFloat(employeePtoCredit) < 0 || isNaN(parseFloat(employeePtoCredit))) {
      setError('Please enter a valid PTO credit value');
      return;
    }
    if (!employeeWeeklyPtoRate || parseFloat(employeeWeeklyPtoRate) <= 0 || parseFloat(employeeWeeklyPtoRate) > 4.0 || isNaN(parseFloat(employeeWeeklyPtoRate))) {
      setError('Please enter a valid weekly PTO rate (between 0 and 4.0)');
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
    if (!employeeTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    setSavingEmployee(true);
    setError('');
    setSuccess('');

    try {
      const employeeData: any = {
        title: employeeTitle.trim(),
        paymentType: employeePaymentType,
        ptoCredit: parseFloat(employeePtoCredit),
        weeklyPtoRate: parseFloat(employeeWeeklyPtoRate),
        employmentStartDate: employeeEmploymentStartDate,
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
          {!isEditing && (
            <>
              {user && employeeProfile && (
                <button onClick={async () => {
                  // Load latest employee profile data and projects before entering edit mode
                  await loadEmployeeProfile();
                  await loadProjects();
                  
                  // Ensure formData is prefilled with current user values
                  if (user) {
                    setFormData({
                      firstName: user.firstName || '',
                      middleName: user.middleName || '',
                      lastName: user.lastName || '',
                      email: user.email || '',
                      phone: formatPhoneNumber(user.phone || ''),
                      address1: user.address1 || '',
                      address2: user.address2 || '',
                      city: user.city || '',
                      state: user.state || '',
                      zipCode: user.zipCode || '',
                      ssn: user.ssn || '',
                      emergencyContact: user.emergencyContacts?.[0] ? {
                        firstName: user.emergencyContacts[0].firstName || '',
                        lastName: user.emergencyContacts[0].lastName || '',
                        phone: formatPhoneNumber(user.emergencyContacts[0].phone || ''),
                        email: user.emergencyContacts[0].email || '',
                        relationship: user.emergencyContacts[0].relationship || '',
                      } : {
                        firstName: '',
                        lastName: '',
                        phone: '',
                        email: '',
                        relationship: '',
                      },
                      pantsSize: user.pantsSize || '',
                      shirtSize: user.shirtSize || '',
                      glovesSize: user.glovesSize || '',
                      vestSize: user.vestSize || '',
                      jacketSize: user.jacketSize || '',
                    });
                  }
                  
                  if (employeeProfile) {
                    setEmployeeTitle(employeeProfile.title || '');
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
                    setEmployeePtoCredit(employeeProfile.ptoCredit?.toString() || '0');
                    setEmployeeWeeklyPtoRate(employeeProfile.weeklyPtoRate?.toString() || '1.6');
                    setEmployeeEmploymentStartDate(employeeProfile.employmentStartDate || new Date().toISOString().split('T')[0]);
                    setEmployeeSickDaysLeft(employeeProfile.sickDaysLeft?.toString() || '5');
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
                  setEmployeePtoCredit('0');
                  setEmployeeWeeklyPtoRate('1.6');
                  const today = new Date().toISOString().split('T')[0];
                  setEmployeeEmploymentStartDate(today);
                  setEmployeeSickDaysLeft('5');
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
          )}
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
            <div className={`${styles.field} ${styles.fieldFullWidth}`}>
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
              <label>SSN{isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="text"
                  name="ssn"
                  value={formData.ssn}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="XXX-XX-XXXX"
                  pattern="[0-9]{3}-[0-9]{2}-[0-9]{4}"
                  maxLength={11}
                />
              ) : (
                <div className={styles.value}>{user.ssn}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Role</label>
              <div className={styles.value}>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleUpdate(e.target.value as 'USER' | 'ADMIN' | 'ACCOUNTANT' | 'HR' | 'PROJECT_MANAGER')}
                  disabled={updatingRole}
                  className={styles.roleSelect}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="HR">HR</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                </select>
                {updatingRole && <span className={styles.saving}>Updating...</span>}
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

        {/* Clothing Sizes */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Clothing Sizes</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Pants Size (Waist × Inseam)</label>
              {isEditing ? (
                <select
                  name="pantsSize"
                  value={formData.pantsSize}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                >
                  <option value="">Select size</option>
                  {['28×28', '28×30', '28×32', '30×28', '30×30', '30×32', '30×34', '32×28', '32×30', '32×32', '32×34', '34×28', '34×30', '34×32', '34×34', '36×28', '36×30', '36×32', '36×34', '38×28', '38×30', '38×32', '38×34', '40×28', '40×30', '40×32', '40×34', '42×28', '42×30', '42×32', '42×34', '44×28', '44×30', '44×32', '44×34', '46×28', '46×30', '46×32', '46×34', '48×30', '48×32', '48×34', '50×30', '50×32', '50×34'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.value}>{user.pantsSize || 'N/A'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Shirt Size</label>
              {isEditing ? (
                <select
                  name="shirtSize"
                  value={formData.shirtSize}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                >
                  <option value="">Select size</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.value}>{user.shirtSize || 'N/A'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Gloves Size</label>
              {isEditing ? (
                <select
                  name="glovesSize"
                  value={formData.glovesSize}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                >
                  <option value="">Select size</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.value}>{user.glovesSize || 'N/A'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Vest Size</label>
              {isEditing ? (
                <select
                  name="vestSize"
                  value={formData.vestSize}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                >
                  <option value="">Select size</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.value}>{user.vestSize || 'N/A'}</div>
              )}
            </div>
            <div className={styles.field}>
              <label>Jacket Size</label>
              {isEditing ? (
                <select
                  name="jacketSize"
                  value={formData.jacketSize}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                >
                  <option value="">Select size</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.value}>{user.jacketSize || 'N/A'}</div>
              )}
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
              <label>Title{isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeTitle}
                  onChange={(e) => setEmployeeTitle(e.target.value)}
                  className={styles.input}
                  placeholder="e.g., Electrician, Project Manager"
                  required
                  disabled={saving}
                  maxLength={100}
                />
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.title || 'N/A'}
                </div>
              )}
            </div>
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
              <label>PTO Credit (hours){isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={employeePtoCredit}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setEmployeePtoCredit(value);
                    }
                  }}
                  className={styles.input}
                  placeholder="0"
                  required
                  disabled={saving}
                />
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.ptoCredit !== undefined && employeeProfile.ptoCredit !== null 
                    ? `${Number(employeeProfile.ptoCredit).toFixed(2)} hours` 
                    : 'N/A'}
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label>Weekly PTO Rate (hours/week){isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="4.0"
                  step="0.1"
                  value={employeeWeeklyPtoRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const num = parseFloat(value);
                      if (value === '' || (!isNaN(num) && num >= 0 && num <= 4.0)) {
                        setEmployeeWeeklyPtoRate(value);
                      }
                    }
                  }}
                  className={styles.input}
                  placeholder="1.6"
                  required
                  disabled={saving}
                />
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.weeklyPtoRate !== undefined && employeeProfile.weeklyPtoRate !== null 
                    ? `${Number(employeeProfile.weeklyPtoRate).toFixed(2)} hours/week` 
                    : 'N/A'}
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label>Employment Start Date{isEditing && ' *'}</label>
              {isEditing ? (
                <input
                  type="date"
                  value={employeeEmploymentStartDate}
                  onChange={(e) => setEmployeeEmploymentStartDate(e.target.value)}
                  className={styles.input}
                  required
                  disabled={saving}
                />
              ) : (
                <div className={styles.value}>
                  {employeeProfile?.employmentStartDate 
                    ? new Date(employeeProfile.employmentStartDate).toLocaleDateString()
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
                  placeholder="5"
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
                    ssn: user.ssn || '',
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
                    pantsSize: user.pantsSize || '',
                    shirtSize: user.shirtSize || '',
                    glovesSize: user.glovesSize || '',
                    vestSize: user.vestSize || '',
                    jacketSize: user.jacketSize || '',
                  });
                }
                // Reset employee profile fields
                await loadEmployeeProfile();
                if (employeeProfile) {
                  setEmployeePaymentType(employeeProfile.paymentType);
                  setEmployeeHourlyRate(employeeProfile.hourlyRate?.toString() || '');
                  setEmployeeSalaryAmount(employeeProfile.salaryAmount?.toString() || '');
                  setEmployeeProjectId(employeeProfile.currentProject?.id || '');
                  setEmployeePtoCredit(employeeProfile.ptoCredit?.toString() || '0');
                  setEmployeeWeeklyPtoRate(employeeProfile.weeklyPtoRate?.toString() || '1.6');
                  setEmployeeEmploymentStartDate(employeeProfile.employmentStartDate || new Date().toISOString().split('T')[0]);
                  setEmployeeSickDaysLeft(employeeProfile.sickDaysLeft?.toString() || '5');
                } else {
                  setEmployeePaymentType('HOURLY');
                  setEmployeeHourlyRate('');
                  setEmployeeSalaryAmount('');
                  setEmployeeProjectId('');
                  setEmployeePtoCredit('0');
                  setEmployeeWeeklyPtoRate('1.6');
                  const today = new Date().toISOString().split('T')[0];
                  setEmployeeEmploymentStartDate(today);
                  setEmployeeSickDaysLeft('5');
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

      {/* Certificates Section */}
      <div className={styles.card}>
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
                <label htmlFor="modalEmployeeTitle">Title *</label>
                <input
                  id="modalEmployeeTitle"
                  type="text"
                  value={employeeTitle}
                  onChange={(e) => setEmployeeTitle(e.target.value)}
                  className={styles.input}
                  placeholder="e.g., Electrician, Project Manager"
                  required
                  disabled={savingEmployee}
                  maxLength={100}
                />
              </div>
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
                <label htmlFor="modalPtoCredit">PTO Credit (hours) *</label>
                <input
                  id="modalPtoCredit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={employeePtoCredit}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setEmployeePtoCredit(value);
                    }
                  }}
                  className={styles.input}
                  placeholder="0"
                  required
                  disabled={savingEmployee}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="modalWeeklyPtoRate">Weekly PTO Rate (hours/week) *</label>
                <input
                  id="modalWeeklyPtoRate"
                  type="number"
                  min="0"
                  max="4.0"
                  step="0.1"
                  value={employeeWeeklyPtoRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const num = parseFloat(value);
                      if (value === '' || (!isNaN(num) && num >= 0 && num <= 4.0)) {
                        setEmployeeWeeklyPtoRate(value);
                      }
                    }
                  }}
                  className={styles.input}
                  placeholder="1.6"
                  required
                  disabled={savingEmployee}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="modalEmploymentStartDate">Employment Start Date *</label>
                <input
                  id="modalEmploymentStartDate"
                  type="date"
                  value={employeeEmploymentStartDate}
                  onChange={(e) => setEmployeeEmploymentStartDate(e.target.value)}
                  className={styles.input}
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
                  placeholder="5"
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

      {/* Certificates Section */}
      <div className={styles.card}>
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Certificates</h2>
            <button
            type="button"
            onClick={() => setShowCertUploadForm(!showCertUploadForm)}
            className={styles.createEmployeeButton}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            {showCertUploadForm ? 'Cancel' : '+ Add Certificate'}
            </button>
          </div>

          {showCertUploadForm && (
          <form onSubmit={handleUploadCertificate} style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', marginBottom: '1.5rem' }} noValidate>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="adminCertName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Certificate Name *</label>
              <input
                id="adminCertName"
                type="text"
                value={certFormData.name}
                onChange={(e) => setCertFormData({ ...certFormData, name: e.target.value })}
                required
                disabled={uploadingCert}
                placeholder="e.g., OSHA 30-Hour, First Aid CPR"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="adminCertFile" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Certificate File *</label>
              <input
                id="adminCertFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleCertFileChange}
                required
                disabled={uploadingCert}
                style={{ width: '100%', padding: '0.25rem' }}
              />
              {certFormData.file && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Selected: {certFormData.file.name}</p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={certFormData.doesNotExpire}
                  onChange={(e) => setCertFormData({ ...certFormData, doesNotExpire: e.target.checked, expirationDate: '' })}
                  disabled={uploadingCert}
                />
                Does not expire
              </label>
            </div>

            {!certFormData.doesNotExpire && (
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="adminCertExpiration" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Expiration Date *</label>
                <input
                  id="adminCertExpiration"
                  type="date"
                  value={certFormData.expirationDate}
                  onChange={(e) => setCertFormData({ ...certFormData, expirationDate: e.target.value })}
                  required={!certFormData.doesNotExpire}
                  disabled={uploadingCert || certFormData.doesNotExpire}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCertUploadForm(false);
                  setCertFormData({ name: '', file: null, expirationDate: '', doesNotExpire: false });
                  setError('');
                }}
                className={styles.cancelButton}
                disabled={uploadingCert}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={uploadingCert}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {uploadingCert ? 'Uploading...' : 'Upload Certificate'}
              </button>
            </div>
          </form>
        )}
        {loadingDocuments ? (
          <p>Loading certificates...</p>
        ) : certificates.length === 0 ? (
          <p className={styles.emptyMessage}>No certificates uploaded.</p>
        ) : (
          <div className={styles.documentList}>
            {certificates.map((cert) => {
              const isExpired = cert.expirationDate && new Date(cert.expirationDate) < new Date();
              const isExpiringSoon = cert.expirationDate && !isExpired && 
                Math.ceil((new Date(cert.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30;
              
              return (
                <div key={cert.id} className={styles.documentItem}>
                  <div className={styles.documentInfo}>
                    <h3 className={styles.documentName}>{cert.name}</h3>
                    <p className={styles.documentFileName}>{cert.fileName}</p>
                    <div className={styles.documentMeta}>
                      {cert.doesNotExpire ? (
                        <span className={styles.noExpiration}>No expiration</span>
                      ) : (
                        <span
                          className={`${styles.expirationDate} ${
                            isExpired ? styles.expired : ''
                          } ${isExpiringSoon ? styles.expiringSoon : ''}`}
                        >
                          Expires: {new Date(cert.expirationDate).toLocaleDateString()}
                          {isExpired && ' (Expired)'}
                          {isExpiringSoon && ' (Expiring Soon)'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.documentActions}>
                    {cert.fileUrl && (
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.viewButton}
                      >
                        View
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteDocumentClick(cert.id, cert.name, 'CERTIFICATE')}
                      className={styles.documentDeleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Personal Documents Section */}
      <div className={styles.card}>
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Personal Documents</h2>
            <button
            type="button"
            onClick={() => setShowDocUploadForm(!showDocUploadForm)}
            className={styles.createEmployeeButton}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            {showDocUploadForm ? 'Cancel' : '+ Add Document'}
            </button>
          </div>

          {showDocUploadForm && (
          <form onSubmit={handleUploadDocument} style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', marginBottom: '1.5rem' }} noValidate>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="adminDocName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document Name *</label>
              <input
                id="adminDocName"
                type="text"
                value={docFormData.name}
                onChange={(e) => setDocFormData({ ...docFormData, name: e.target.value })}
                required
                disabled={uploadingDoc}
                placeholder="e.g., SSN Card, Driver License"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="adminDocFile" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document File *</label>
              <input
                id="adminDocFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleDocFileChange}
                required
                disabled={uploadingDoc}
                style={{ width: '100%', padding: '0.25rem' }}
              />
              {docFormData.file && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Selected: {docFormData.file.name}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDocUploadForm(false);
                  setDocFormData({ name: '', file: null });
                  setError('');
                }}
                className={styles.cancelButton}
                disabled={uploadingDoc}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={uploadingDoc}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        )}
        {loadingDocuments ? (
          <p>Loading documents...</p>
        ) : personalDocuments.length === 0 ? (
          <p className={styles.emptyMessage}>No personal documents uploaded.</p>
        ) : (
          <div className={styles.documentList}>
            {personalDocuments.map((doc) => (
              <div key={doc.id} className={styles.documentItem}>
                <div className={styles.documentInfo}>
                  <h3 className={styles.documentName}>{doc.name}</h3>
                  <p className={styles.documentFileName}>{doc.fileName}</p>
                  <p className={styles.documentMeta}>
                    Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className={styles.documentActions}>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.viewButton}
                    >
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteDocumentClick(doc.id, doc.name, 'PERSONAL_DOCUMENT')}
                    className={styles.documentDeleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Delete Document Confirmation Modal */}
      {showDeleteDocumentModal && documentToDelete && (
        <div className={styles.modalOverlay} onClick={() => !deletingDocument && setShowDeleteDocumentModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete Document</h2>
              <button
                className={styles.modalClose}
                onClick={() => !deletingDocument && setShowDeleteDocumentModal(false)}
                disabled={deletingDocument}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to delete <strong>{documentToDelete.name}</strong>?
              </p>
              <p className={styles.warning}>
                This action cannot be undone. The document will be permanently deleted from the system.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowDeleteDocumentModal(false);
                  setDocumentToDelete(null);
                }}
                disabled={deletingDocument}
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={handleDeleteDocument}
                disabled={deletingDocument}
              >
                {deletingDocument ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
        )}
    </div>
    </div>
  );
}
