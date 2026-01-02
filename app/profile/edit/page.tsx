'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data?.user) {
        const user = response.data.user;
        setFormData({
          firstName: user.firstName || '',
          middleName: user.middleName || '',
          lastName: user.lastName || '',
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value,
      },
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
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

    if (!isPasswordFormValid()) {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
      } else {
        setError('Please fill in all password fields');
      }
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setChangingPassword(true);

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
        setTimeout(() => {
          router.push('/dashboard?profileUpdated=true');
        }, 2000);
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
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
        phone: formData.phone,
        address1: formData.address1,
        address2: formData.address2 || null,
        city: formData.city,
        state: formData.state.toUpperCase(),
        zipCode: formData.zipCode,
      };

      // Add emergency contact if any fields are filled
      if (formData.emergencyContact.firstName || 
          formData.emergencyContact.lastName || 
          formData.emergencyContact.phone || 
          formData.emergencyContact.relationship) {
        payload.emergencyContact = {
          firstName: formData.emergencyContact.firstName,
          lastName: formData.emergencyContact.lastName,
          phone: formData.emergencyContact.phone,
          email: formData.emergencyContact.email || null,
          relationship: formData.emergencyContact.relationship,
        };
      }

      const response = await apiClient.updateProfile(payload);

      if (response.success) {
        setSuccess('Profile has been updated successfully!');
        setTimeout(() => {
          router.push('/dashboard?profileUpdated=true');
        }, 2000);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
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
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Profile</h1>
        <p className={styles.subtitle}>Update your profile information</p>

        {success && <div className={styles.success}>{success}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Personal Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="middleName">Middle Name</label>
                <input
                  id="middleName"
                  name="middleName"
                  type="text"
                  value={formData.middleName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="phone">Phone *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="address1">Address Line 1 *</label>
                <input
                  id="address1"
                  name="address1"
                  type="text"
                  value={formData.address1}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="address2">Address Line 2</label>
                <input
                  id="address2"
                  name="address2"
                  type="text"
                  value={formData.address2}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="state">State * (2 letters)</label>
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
              </div>

              <div className={styles.field}>
                <label htmlFor="zipCode">Zip Code *</label>
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
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Emergency Contact (Optional)</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="ecFirstName">First Name</label>
                <input
                  id="ecFirstName"
                  name="firstName"
                  type="text"
                  value={formData.emergencyContact.firstName}
                  onChange={handleEmergencyContactChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ecLastName">Last Name</label>
                <input
                  id="ecLastName"
                  name="lastName"
                  type="text"
                  value={formData.emergencyContact.lastName}
                  onChange={handleEmergencyContactChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ecPhone">Phone</label>
                <input
                  id="ecPhone"
                  name="phone"
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={handleEmergencyContactChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ecEmail">Email</label>
                <input
                  id="ecEmail"
                  name="email"
                  type="email"
                  value={formData.emergencyContact.email}
                  onChange={handleEmergencyContactChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ecRelationship">Relationship</label>
                <input
                  id="ecRelationship"
                  name="relationship"
                  type="text"
                  value={formData.emergencyContact.relationship}
                  onChange={handleEmergencyContactChange}
                  placeholder="e.g., Spouse, Parent, Friend"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Change Password</h2>
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

              <div className={styles.passwordActions}>
                <button
                  type="submit"
                  className={styles.passwordButton}
                  disabled={changingPassword || !isPasswordFormValid()}
                >
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
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
        </form>
      </div>
    </div>
  );
}

