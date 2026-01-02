'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { setAuthToken } from '@/lib/utils/auth';
import styles from './register.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
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
  });

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

  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    const digitsOnly = e.target.value.replace(/\D/g, '');
    
    // Limit to 9 digits
    const limitedDigits = digitsOnly.slice(0, 9);
    
    // Format as XXX-XX-XXXX
    let formatted = '';
    if (limitedDigits.length > 0) {
      formatted = limitedDigits.slice(0, 3);
      if (limitedDigits.length > 3) {
        formatted += '-' + limitedDigits.slice(3, 5);
      }
      if (limitedDigits.length > 5) {
        formatted += '-' + limitedDigits.slice(5, 9);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      ssn: formatted,
    }));
    setError('');
  };

  const validateForm = (): boolean => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (!formData.phone || !formData.address1 || !formData.city || !formData.state || !formData.zipCode) {
      setError('Please fill in all required contact information');
      return false;
    }

    if (!formData.dateOfBirth || !formData.ssn) {
      setError('Please fill in date of birth and SSN');
      return false;
    }

    if (!/^\d{3}-\d{2}-\d{4}$/.test(formData.ssn)) {
      setError('SSN must be in XXX-XX-XXXX format');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        city: formData.city,
        state: formData.state.toUpperCase(),
        zipCode: formData.zipCode,
        dateOfBirth: formData.dateOfBirth,
        ssn: formData.ssn,
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
          email: formData.emergencyContact.email || undefined,
          relationship: formData.emergencyContact.relationship,
        };
      }

      const response = await apiClient.register(payload);

      if (response.success) {
        // Registration successful - redirect to login with message
        router.push('/login?registered=true');
      } else {
        setError(response.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Fill out the form below to register</p>

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

              <div className={styles.field}>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="dateOfBirth">Date of Birth *</label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ssn">SSN *</label>
                <input
                  id="ssn"
                  name="ssn"
                  type="text"
                  placeholder="XXX-XX-XXXX"
                  value={formData.ssn}
                  onChange={handleSSNChange}
                  maxLength={11}
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

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <a href="/login" className={styles.link}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}

