'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import { formatPhoneNumber, getPhoneDigits } from '@/lib/utils/phone-format';
import { formatDateOnly } from '@/lib/utils/date';
import CertificatesSection from '@/components/documents/CertificatesSection';
import DocumentsSection from '@/components/documents/DocumentsSection';
import ProfilePictureCropModal from '@/components/profile-picture-crop/ProfilePictureCropModal';
import styles from './edit.module.scss';

export default function AdminProfilePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
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
    dateOfBirth: '',
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; jobNumber: string; clientName: string }>>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentProjectName, setCurrentProjectName] = useState<string>('');
  const [updatingProject, setUpdatingProject] = useState(false);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [employeeTitle, setEmployeeTitle] = useState<string | null>(null);
  const [employeePaymentType, setEmployeePaymentType] = useState<'HOURLY' | 'SALARY' | null>(null);
  const [employeeHourlyRate, setEmployeeHourlyRate] = useState<number | null>(null);
  const [employeeSalaryAmount, setEmployeeSalaryAmount] = useState<number | null>(null);
  const [ptoCredit, setPtoCredit] = useState<number | null>(null);
  const [weeklyPtoRate, setWeeklyPtoRate] = useState<number | null>(null);
  const [sickDaysLeft, setSickDaysLeft] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [pendingPictureFile, setPendingPictureFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [fileForCrop, setFileForCrop] = useState<File | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadProfile();
    loadProjects();
  }, [router]);

  const loadProjects = async () => {
    try {
      const response = await apiClient.getProjects();
      if (response.success && response.data) {
        const projectsData = (response.data as any).projects || [];
        setProjects(projectsData);
      } else {
        setError('Failed to load projects list');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load projects list');
    }
  };

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data?.user) {
        const user = response.data.user;
        setCurrentUserId(user.id);
        setUserRole(user.role || '');
        setCreatedAt(user.createdAt || '');
        setUpdatedAt(user.updatedAt || '');
        setProfilePictureUrl(user.profilePictureUrl || null);
        const loadedData = {
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
          dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
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
        };
        setFormData(loadedData);
        setOriginalFormData(loadedData);
        
        // Check if user has an employee profile
        if (user.employee) {
          setHasEmployeeProfile(true);
          setEmployeeTitle(user.employee.title || null);
          setEmployeePaymentType(user.employee.paymentType || null);
          setEmployeeHourlyRate(user.employee.hourlyRate != null ? parseFloat(String(user.employee.hourlyRate)) : null);
          setEmployeeSalaryAmount(user.employee.salaryAmount != null ? parseFloat(String(user.employee.salaryAmount)) : null);
          setPtoCredit(user.employee.ptoCredit ?? null);
          setWeeklyPtoRate(user.employee.weeklyPtoRate ?? null);
          setSickDaysLeft(user.employee.sickDaysLeft ?? null);
          if (user.employee.currentProjectId) {
            setCurrentProjectId(user.employee.currentProjectId);
            if (user.employee.currentProject && user.employee.currentProject.jobNumber) {
              setCurrentProjectName(`${user.employee.currentProject.name} - ${user.employee.currentProject.jobNumber}`);
            } else if (user.employee.currentProject) {
              setCurrentProjectName(user.employee.currentProject.name);
            } else {
              setCurrentProjectName('');
            }
          } else {
            setCurrentProjectId('');
            setCurrentProjectName('');
          }
        } else {
          setHasEmployeeProfile(false);
          setEmployeeTitle(null);
          setEmployeePaymentType(null);
          setEmployeeHourlyRate(null);
          setEmployeeSalaryAmount(null);
          setCurrentProjectId('');
          setCurrentProjectName('');
          setPtoCredit(null);
          setWeeklyPtoRate(null);
          setSickDaysLeft(null);
        }
      } else {
        setError('Failed to load profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoadingProfile(false);
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
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setPasswordError('');
  };

  const handleProjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectId = e.target.value || null;
    setUpdatingProject(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.updateCurrentProject(newProjectId);
      if (response.success) {
        setCurrentProjectId(newProjectId || '');
        if (newProjectId) {
          const selectedProject = projects.find(p => p.id === newProjectId);
          setCurrentProjectName(selectedProject ? `${selectedProject.name} - ${selectedProject.jobNumber}` : '');
        } else {
          setCurrentProjectName('');
        }
        setSuccess('Current project updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to update current project');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update current project');
    } finally {
      setUpdatingProject(false);
    }
  };

  const isPasswordFormValid = () => {
    return (
      passwordData.currentPassword.length > 0 &&
      passwordData.newPassword.length > 0 &&
      passwordData.confirmPassword.length > 0 &&
      passwordData.newPassword === passwordData.confirmPassword
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPasswordError('');

    // Validate all fields are filled
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    // Validate password length
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate old password is different from new password
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from your current password');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');

    try {
      const response = await apiClient.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        setSuccess('Password has been changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setIsEditingPassword(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setPasswordError(response.error || 'Failed to change password');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An error occurred';
      // Check if it's a wrong password error
      if (errorMessage.toLowerCase().includes('current password') || 
          errorMessage.toLowerCase().includes('incorrect password') ||
          errorMessage.toLowerCase().includes('wrong password') ||
          errorMessage.toLowerCase().includes('invalid password')) {
        setPasswordError('Current password is incorrect');
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload: any = {
        firstName: formData.firstName,
        middleName: formData.middleName || null,
        lastName: formData.lastName,
        phone: getPhoneDigits(formData.phone),
        address1: formData.address1,
        address2: formData.address2 || null,
        city: formData.city,
        state: formData.state.toUpperCase(),
        zipCode: formData.zipCode,
        dateOfBirth: formData.dateOfBirth,
        ssn: formData.ssn,
      };
      if (userRole === 'ADMIN') {
        payload.email = formData.email;
      }

      payload.emergencyContact = {
        firstName: formData.emergencyContact.firstName.trim(),
        lastName: formData.emergencyContact.lastName.trim(),
        phone: getPhoneDigits(formData.emergencyContact.phone),
        email: formData.emergencyContact.email?.trim() || null,
        relationship: formData.emergencyContact.relationship.trim(),
      };

      if (formData.pantsSize) payload.pantsSize = formData.pantsSize;
      if (formData.shirtSize) payload.shirtSize = formData.shirtSize;
      if (formData.glovesSize) payload.glovesSize = formData.glovesSize;
      if (formData.vestSize) payload.vestSize = formData.vestSize;
      if (formData.jacketSize) payload.jacketSize = formData.jacketSize;

      const response = await apiClient.updateProfile(payload);

      if (response.success) {
        setSuccess('Profile has been updated successfully!');
        setOriginalFormData(formData);
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setFormData(originalFormData);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setFormData(originalFormData);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handlePictureClick = () => fileInputRef.current?.click();
  const handlePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFileForCrop(file);
      setShowCropModal(true);
      setError('');
    }
    e.target.value = '';
  };
  const handleCropApply = (croppedFile: File) => {
    setPendingPictureFile(croppedFile);
    setShowCropModal(false);
    setFileForCrop(null);
  };
  const handleCropCancel = () => {
    setShowCropModal(false);
    setFileForCrop(null);
  };
  const handleSavePicture = async () => {
    if (!pendingPictureFile) return;
    setUploadingPicture(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.uploadProfilePicture(pendingPictureFile);
      if (response.success) {
        const data = response.data as { profilePictureUrl?: string } | undefined;
        const url = (data?.profilePictureUrl != null && data.profilePictureUrl !== '') ? data.profilePictureUrl : null;
        setProfilePictureUrl(url);
        setPendingPictureFile(null);
        setSuccess('Profile picture updated.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to upload picture');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload picture');
    } finally {
      setUploadingPicture(false);
    }
  };
  const handleCancelPicture = () => setPendingPictureFile(null);
  const handleDeletePicture = async () => {
    if (!window.confirm('Remove your profile picture? This cannot be undone.')) return;
    setUploadingPicture(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.deleteProfilePicture();
      if (response.success) {
        setProfilePictureUrl(null);
        setPendingPictureFile(null);
        setSuccess('Profile picture removed.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to delete picture');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Loading Profile...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {showCropModal && fileForCrop && (
        <ProfilePictureCropModal
          file={fileForCrop}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Profile</h1>
            <p className={styles.subtitle}>View and manage your profile information</p>
          </div>
          {!isEditing && (
            <div className={styles.headerButtons}>
              <button
                type="button"
                onClick={handleEditClick}
                className={styles.editButton}
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPassword(true)}
                className={styles.changePasswordButton}
              >
                Change Password
              </button>
            </div>
          )}
        </div>

        {success && <div className={styles.success}>{success}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <form id="admin-profile-form" onSubmit={handleSubmit} className={styles.formMain}>
          {/* Personal Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            <div className={styles.sectionRow}>
              <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="firstName">First Name{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.firstName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="middleName">Middle Name</label>
                {isEditing ? (
                  <input
                    id="middleName"
                    name="middleName"
                    type="text"
                    value={formData.middleName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.middleName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="lastName">Last Name{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.lastName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="dateOfBirth">Date of Birth{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>
                    {formData.dateOfBirth ? formatDateOnly(formData.dateOfBirth) : 'N/A'}
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ssn">SSN{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="ssn"
                    name="ssn"
                    type="text"
                    value={formData.ssn}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="XXX-XX-XXXX"
                    pattern="[0-9]{3}-[0-9]{2}-[0-9]{4}"
                    maxLength={11}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.ssn || 'N/A'}</div>
                )}
              </div>
              </div>
              <div className={styles.sectionPicture}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePictureFileChange}
                  style={{ display: 'none' }}
                  aria-hidden
                />
                <button
                  type="button"
                  className={styles.pictureCircle}
                  onClick={handlePictureClick}
                  disabled={uploadingPicture}
                  aria-label="Upload profile picture"
                >
                  {pendingPictureFile ? (
                    <img src={URL.createObjectURL(pendingPictureFile)} alt="Preview" />
                  ) : profilePictureUrl ? (
                    <img key={profilePictureUrl} src={profilePictureUrl} alt="Profile" />
                  ) : (
                    <span className={styles.picturePlaceholder}>Click to upload</span>
                  )}
                </button>
                {pendingPictureFile && (
                  <div className={styles.pictureActions}>
                    <button type="button" className={styles.pictureLink} onClick={handleSavePicture} disabled={uploadingPicture}>
                      Save
                    </button>
                    <button type="button" className={styles.pictureLink} onClick={handleCancelPicture} disabled={uploadingPicture}>
                      Cancel
                    </button>
                  </div>
                )}
                {(profilePictureUrl || pendingPictureFile) && (
                  <div className={styles.pictureActions}>
                    <button type="button" className={styles.pictureLink} onClick={handlePictureClick} disabled={uploadingPicture}>
                      Change
                    </button>
                    {profilePictureUrl && !pendingPictureFile && (
                      <button type="button" className={`${styles.pictureLink} ${styles.pictureLinkDelete}`} onClick={handleDeletePicture} disabled={uploadingPicture}>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.fields}>
              <div className={`${styles.field} ${styles.fieldFullWidth}`}>
                <label htmlFor="email">Email{isEditing && userRole === 'ADMIN' && ' *'}</label>
                {isEditing && userRole === 'ADMIN' ? (
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.email || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="phone">Phone{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="(XXX) XXX-XXXX"
                    maxLength={14}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.phone || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="address1">Address Line 1{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="address1"
                    name="address1"
                    type="text"
                    value={formData.address1}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.address1 || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="address2">Address Line 2</label>
                {isEditing ? (
                  <input
                    id="address2"
                    name="address2"
                    type="text"
                    value={formData.address2}
                    onChange={handleChange}
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.address2 || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="city">City{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.city || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="state">State{isEditing && ' *'} (2 letters)</label>
                {isEditing ? (
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    maxLength={2}
                    placeholder="TX"
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.state || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="zipCode">Zip Code{isEditing && ' *'}</label>
                {isEditing ? (
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                    placeholder="77001"
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.zipCode || 'N/A'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Emergency Contact *</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="ecFirstName">First Name *</label>
                {isEditing ? (
                  <input
                    id="ecFirstName"
                    name="firstName"
                    type="text"
                    value={formData.emergencyContact.firstName}
                    onChange={handleEmergencyContactChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.firstName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ecLastName">Last Name *</label>
                {isEditing ? (
                  <input
                    id="ecLastName"
                    name="lastName"
                    type="text"
                    value={formData.emergencyContact.lastName}
                    onChange={handleEmergencyContactChange}
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.lastName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ecPhone">Phone *</label>
                {isEditing ? (
                  <input
                    id="ecPhone"
                    name="phone"
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={handleEmergencyContactChange}
                    required
                    disabled={loading}
                    placeholder="(XXX) XXX-XXXX"
                    maxLength={14}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.phone || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ecEmail">Email</label>
                {isEditing ? (
                  <input
                    id="ecEmail"
                    name="email"
                    type="email"
                    value={formData.emergencyContact.email}
                    onChange={handleEmergencyContactChange}
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.email || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ecRelationship">Relationship *</label>
                {isEditing ? (
                  <input
                    id="ecRelationship"
                    name="relationship"
                    type="text"
                    value={formData.emergencyContact.relationship}
                    onChange={handleEmergencyContactChange}
                    required
                    placeholder="e.g., Spouse, Parent, Friend"
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.relationship || 'N/A'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Clothing Sizes Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Clothing Sizes</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="pantsSize">Pants Size (Waist × Inseam)</label>
                {isEditing ? (
                  <select
                    id="pantsSize"
                    name="pantsSize"
                    value={formData.pantsSize}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select size</option>
                    {['28×28', '28×30', '28×32', '30×28', '30×30', '30×32', '30×34', '32×28', '32×30', '32×32', '32×34', '34×28', '34×30', '34×32', '34×34', '36×28', '36×30', '36×32', '36×34', '38×28', '38×30', '38×32', '38×34', '40×28', '40×30', '40×32', '40×34', '42×28', '42×30', '42×32', '42×34', '44×28', '44×30', '44×32', '44×34', '46×28', '46×30', '46×32', '46×34', '48×30', '48×32', '48×34', '50×30', '50×32', '50×34'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{formData.pantsSize || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="shirtSize">Shirt Size</label>
                {isEditing ? (
                  <select
                    id="shirtSize"
                    name="shirtSize"
                    value={formData.shirtSize}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select size</option>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{formData.shirtSize || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="glovesSize">Gloves Size</label>
                {isEditing ? (
                  <select
                    id="glovesSize"
                    name="glovesSize"
                    value={formData.glovesSize}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select size</option>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{formData.glovesSize || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="vestSize">Vest Size</label>
                {isEditing ? (
                  <select
                    id="vestSize"
                    name="vestSize"
                    value={formData.vestSize}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select size</option>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{formData.vestSize || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="jacketSize">Jacket Size</label>
                {isEditing ? (
                  <select
                    id="jacketSize"
                    name="jacketSize"
                    value={formData.jacketSize}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select size</option>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{formData.jacketSize || 'N/A'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Information Section - Always visible for all users */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Employee Information</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label>Title</label>
                <div className={styles.fieldValue}>{employeeTitle || 'N/A'}</div>
              </div>
              <div className={styles.field}>
                <label>Pay Rate</label>
                <div className={styles.fieldValue}>
                  {employeePaymentType === 'HOURLY' && employeeHourlyRate != null
                    ? `$${employeeHourlyRate.toFixed(2)}/hour`
                    : employeePaymentType === 'SALARY' && employeeSalaryAmount != null
                      ? `$${employeeSalaryAmount.toLocaleString()}/year`
                      : 'N/A'}
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="currentProject">Current Project</label>
                {hasEmployeeProfile ? (
                  <>
                    <select
                      id="currentProject"
                      value={currentProjectId || ''}
                      onChange={handleProjectChange}
                      disabled={updatingProject || loading}
                      className={styles.select}
                    >
                      <option value="">No Project Assigned</option>
                      {projects.length === 0 ? (
                        <option value="" disabled>No projects available</option>
                      ) : (
                        projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name} - {project.jobNumber}
                          </option>
                        ))
                      )}
                    </select>
                    {updatingProject && <p className={styles.helpText}>Updating...</p>}
                    {!currentProjectId && projects.length > 0 && (
                      <p className={styles.helpText}>Select a project to assign yourself to it</p>
                    )}
                  </>
                ) : (
                  <div className={styles.fieldValue}>
                    {currentProjectName || 'No Project Assigned'}
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <label>PTO Credit</label>
                <div className={styles.fieldValue}>
                  {ptoCredit !== null ? `${ptoCredit.toFixed(2)} hours` : 'N/A'}
                </div>
              </div>
              <div className={styles.field}>
                <label>Weekly PTO Rate</label>
                <div className={styles.fieldValue}>
                  {weeklyPtoRate !== null ? `${weeklyPtoRate.toFixed(2)} hours/week` : 'N/A'}
                </div>
              </div>
              <div className={styles.field}>
                <label>Sick Days Left</label>
                <div className={styles.fieldValue}>
                  {sickDaysLeft !== null ? sickDaysLeft : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Account Information</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="role">Role{isEditing && userRole === 'ADMIN' && ' *'}</label>
                {isEditing && userRole === 'ADMIN' ? (
                  <select
                    id="role"
                    name="role"
                    value={userRole}
                    onChange={async (e) => {
                      const newRole = e.target.value as 'USER' | 'ADMIN' | 'ACCOUNTANT' | 'HR' | 'PROJECT_MANAGER';
                      if (currentUserId && newRole !== userRole) {
                        setUpdatingRole(true);
                        setError('');
                        setSuccess('');
                        try {
                          const response = await apiClient.updateUserRole(currentUserId, newRole);
                          if (response.success) {
                            setUserRole(newRole);
                            setSuccess('Role updated successfully');
                            setTimeout(() => setSuccess(''), 3000);
                          } else {
                            setError(response.error || 'Failed to update role');
                          }
                        } catch (err: any) {
                          setError(err.response?.data?.error || 'Failed to update role');
                        } finally {
                          setUpdatingRole(false);
                        }
                      }
                    }}
                    disabled={loading || updatingRole}
                    className={styles.select}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="HR">HR</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{userRole || 'N/A'}</div>
                )}
                {updatingRole && <p className={styles.helpText}>Updating...</p>}
              </div>

              <div className={styles.field}>
                <label>Account Created</label>
                <div className={styles.fieldValue}>
                  {createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className={styles.field}>
                <label>Last Updated</label>
                <div className={styles.fieldValue}>
                  {updatedAt ? new Date(updatedAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </form>

        <CertificatesSection />

        <DocumentsSection />

        {/* Save/Cancel at bottom when editing */}
        {isEditing && (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleCancelEdit}
              className={styles.cancelButton}
              disabled={loading || changingPassword}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-profile-form"
              className={styles.submitButton}
              disabled={loading || changingPassword}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        )}

        {/* Change Password Modal */}
        {isEditingPassword && (
          <div className={styles.modalOverlay} onClick={() => !changingPassword && setIsEditingPassword(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Change Password</h2>
                <button
                  className={styles.modalClose}
                  onClick={() => {
                    if (!changingPassword) {
                      setIsEditingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setError('');
                      setPasswordError('');
                    }
                  }}
                  disabled={changingPassword}
                >
                  ×
                </button>
              </div>
              {passwordError && <div className={styles.error}>{passwordError}</div>}
              <form onSubmit={handleChangePassword} className={styles.passwordForm}>
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="currentPassword">Current Password *</label>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={changingPassword}
                      placeholder="Enter your current password"
                      autoFocus
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="newPassword">New Password *</label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={8}
                      disabled={changingPassword}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="confirmPassword">Confirm New Password *</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={8}
                      disabled={changingPassword}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setError('');
                      setPasswordError('');
                    }}
                    className={styles.cancelButton}
                    disabled={changingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.passwordButton}
                    disabled={changingPassword || !isPasswordFormValid()}
                  >
                    {changingPassword ? 'Changing Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

