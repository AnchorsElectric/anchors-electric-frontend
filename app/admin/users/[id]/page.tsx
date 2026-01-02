'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
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
  const [isEditing, setIsEditing] = useState(false);
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
  }, [router, userId]);

  const checkAdminStatus = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        const isUserAdmin = (response.data as any).isAdmin || false;
        setIsAdmin(isUserAdmin);
        if (!isUserAdmin) {
          router.push('/dashboard');
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
          phone: userData.phone || '',
          address1: userData.address1 || '',
          address2: userData.address2 || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zipCode || '',
          emergencyContact: userData.emergencyContacts?.[0] ? {
            firstName: userData.emergencyContacts[0].firstName || '',
            lastName: userData.emergencyContacts[0].lastName || '',
            phone: userData.emergencyContacts[0].phone || '',
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
      } else {
        setError(response.error || 'Failed to load user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setSuccess('');
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
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        phone: formData.phone,
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
          phone: formData.emergencyContact.phone,
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
            <button onClick={() => setIsEditing(true)} className={styles.editButton}>
              Edit User
            </button>
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
              onClick={() => {
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
    </div>
  );
}
