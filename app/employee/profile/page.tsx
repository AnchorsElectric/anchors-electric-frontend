'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import { formatPhoneNumber, getPhoneDigits } from '@/lib/utils/phone-format';
import styles from './edit.module.scss';

export default function EditProfilePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
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
  const [ptoDaysLeft, setPtoDaysLeft] = useState<number | null>(null);
  const [sickDaysLeft, setSickDaysLeft] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(formData);

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
      }
    } catch (err: any) {
      // Silently fail - projects are optional
    }
  };

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data?.user) {
        const user = response.data.user;
        const loadedData = {
          firstName: user.firstName || '',
          middleName: user.middleName || '',
          lastName: user.lastName || '',
          phone: formatPhoneNumber(user.phone || ''),
          address1: user.address1 || '',
          address2: user.address2 || '',
          city: user.city || '',
          state: user.state || '',
          zipCode: user.zipCode || '',
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
        };
        setFormData(loadedData);
        setOriginalFormData(loadedData);
        
        // Check if user has an employee profile
        if (user.employee) {
          setHasEmployeeProfile(true);
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
          setPtoDaysLeft(user.employee.ptoDaysLeft ?? null);
          setSickDaysLeft(user.employee.sickDaysLeft ?? null);
        } else {
          setHasEmployeeProfile(false);
          setCurrentProjectId('');
          setCurrentProjectName('');
          setPtoDaysLeft(null);
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
    const newProjectId = e.target.value;
    if (!newProjectId) {
      setError('Please select a project');
      return;
    }
    setUpdatingProject(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.updateCurrentProject(newProjectId);
      if (response.success) {
        setCurrentProjectId(newProjectId);
        const selectedProject = projects.find(p => p.id === newProjectId);
        setCurrentProjectName(selectedProject ? `${selectedProject.name} - ${selectedProject.jobNumber}` : '');
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
      };

      // Add emergency contact if all required fields are filled
      if (formData.emergencyContact.firstName && 
          formData.emergencyContact.firstName.trim() &&
          formData.emergencyContact.lastName && 
          formData.emergencyContact.lastName.trim() &&
          formData.emergencyContact.phone && 
          formData.emergencyContact.phone.trim() &&
          formData.emergencyContact.relationship &&
          formData.emergencyContact.relationship.trim()) {
        payload.emergencyContact = {
          firstName: formData.emergencyContact.firstName.trim(),
          lastName: formData.emergencyContact.lastName.trim(),
          phone: getPhoneDigits(formData.emergencyContact.phone),
          email: formData.emergencyContact.email?.trim() || null,
          relationship: formData.emergencyContact.relationship.trim(),
        };
      }

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
    // If no project is assigned and projects are available, auto-select the first one
    if (!currentProjectId && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
      setCurrentProjectName(`${projects[0].name} - ${projects[0].jobNumber}`);
    }
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

        <form onSubmit={handleSubmit}>
          {/* Personal Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
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
            </div>
          </div>

          {/* Contact Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.fields}>
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
            <h2 className={styles.sectionTitle}>Emergency Contact (Optional)</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="ecFirstName">First Name</label>
                {isEditing ? (
                  <input
                    id="ecFirstName"
                    name="firstName"
                    type="text"
                    value={formData.emergencyContact.firstName}
                    onChange={handleEmergencyContactChange}
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.firstName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ecLastName">Last Name</label>
                {isEditing ? (
                  <input
                    id="ecLastName"
                    name="lastName"
                    type="text"
                    value={formData.emergencyContact.lastName}
                    onChange={handleEmergencyContactChange}
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.lastName || 'N/A'}</div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="ecPhone">Phone</label>
                {isEditing ? (
                  <input
                    id="ecPhone"
                    name="phone"
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={handleEmergencyContactChange}
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
                <label htmlFor="ecRelationship">Relationship</label>
                {isEditing ? (
                  <input
                    id="ecRelationship"
                    name="relationship"
                    type="text"
                    value={formData.emergencyContact.relationship}
                    onChange={handleEmergencyContactChange}
                    placeholder="e.g., Spouse, Parent, Friend"
                    disabled={loading}
                  />
                ) : (
                  <div className={styles.fieldValue}>{formData.emergencyContact.relationship || 'N/A'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Information Section - Only show if user has employee profile */}
          {hasEmployeeProfile && (
            <>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Employee Information</h2>
                <div className={styles.fields}>
                  {ptoDaysLeft !== null && (
                    <div className={styles.field}>
                      <label>PTO Days Left</label>
                      <div className={styles.fieldValue}>{ptoDaysLeft}</div>
                    </div>
                  )}
                  {sickDaysLeft !== null && (
                    <div className={styles.field}>
                      <label>Sick Days Left</label>
                      <div className={styles.fieldValue}>{sickDaysLeft}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Current Project</h2>
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="currentProject">Current Project{isEditing && ' *'}</label>
                    {isEditing ? (
                      <>
                        <select
                          id="currentProject"
                          value={currentProjectId}
                          onChange={handleProjectChange}
                          disabled={updatingProject || loading}
                          className={styles.select}
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
                        {updatingProject && <p className={styles.helpText}>Updating...</p>}
                      </>
                    ) : (
                      <div className={styles.fieldValue}>
                        {currentProjectName || 'No Project Assigned'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

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
                className={styles.submitButton}
                disabled={loading || changingPassword}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          )}
        </form>

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

