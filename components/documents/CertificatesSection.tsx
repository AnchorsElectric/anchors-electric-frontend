'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import styles from './documents.module.scss';

interface Certificate {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string | null;
  expirationDate: string | null;
  doesNotExpire: boolean;
  createdAt: string;
}

export default function CertificatesSection() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    file: null as File | null,
    expirationDate: '',
    doesNotExpire: false,
  });

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDocuments('CERTIFICATE');
      if (response.success && response.data) {
        setCertificates((response.data as any).documents || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setSuccess('');

    if (!formData.file) {
      setError('Please select a file');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a certificate name');
      return;
    }

    if (!formData.doesNotExpire && !formData.expirationDate) {
      setError('Please enter an expiration date or check "Does not expire"');
      return;
    }

    setUploading(true);

    try {
      console.log('Starting upload...', {
        fileName: formData.file.name,
        fileSize: formData.file.size,
        name: formData.name,
        type: 'CERTIFICATE',
        expirationDate: formData.doesNotExpire ? null : formData.expirationDate,
        doesNotExpire: formData.doesNotExpire,
      });

      const response = await apiClient.uploadDocument(formData.file, {
        name: formData.name.trim(),
        type: 'CERTIFICATE',
        expirationDate: formData.doesNotExpire ? null : formData.expirationDate,
        doesNotExpire: formData.doesNotExpire,
      });

      console.log('Upload response:', response);

      if (response.success) {
        setSuccess('Certificate uploaded successfully!');
        setFormData({
          name: '',
          file: null,
          expirationDate: '',
          doesNotExpire: false,
        });
        setShowUploadForm(false);
        // Reset file input
        const fileInput = document.getElementById('certFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        loadCertificates();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to upload certificate');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
      });
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload certificate';
      setError(errorMessage);
      // Keep error visible for 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {
      return;
    }

    try {
      const response = await apiClient.deleteDocument(id);
      if (response.success) {
        setSuccess('Certificate deleted successfully!');
        loadCertificates();
      } else {
        setError(response.error || 'Failed to delete certificate');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete certificate');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const expirationDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Certificates</h2>
        <button
          type="button"
          onClick={() => setShowUploadForm(!showUploadForm)}
          className={styles.addButton}
        >
          {showUploadForm ? 'Cancel' : '+ Add Certificate'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {showUploadForm && (
        <form 
          onSubmit={handleSubmit} 
          className={styles.uploadForm}
          noValidate
          action="#"
          method="post"
        >
          <div className={styles.field}>
            <label htmlFor="certName">Certificate Name *</label>
            <input
              id="certName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={uploading}
              placeholder="e.g., OSHA 30-Hour, First Aid CPR"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="certFile">Certificate File *</label>
            <input
              id="certFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              required
              disabled={uploading}
              key={showUploadForm ? 'file-input' : 'file-input-reset'}
            />
            {formData.file && (
              <p className={styles.fileName}>Selected: {formData.file.name}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.doesNotExpire}
                onChange={(e) => setFormData({ ...formData, doesNotExpire: e.target.checked, expirationDate: '' })}
                disabled={uploading}
              />
              Does not expire
            </label>
          </div>

          {!formData.doesNotExpire && (
            <div className={styles.field}>
              <label htmlFor="certExpiration">Expiration Date *</label>
              <input
                id="certExpiration"
                type="date"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                required={!formData.doesNotExpire}
                disabled={uploading || formData.doesNotExpire}
              />
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setFormData({
                  name: '',
                  file: null,
                  expirationDate: '',
                  doesNotExpire: false,
                });
                setError('');
              }}
              className={styles.cancelButton}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={uploading}
              onClick={(e) => {
                // Additional safety - prevent any default behavior
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Certificate'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading certificates...</p>
      ) : certificates.length === 0 ? (
        <p className={styles.emptyMessage}>No certificates uploaded yet.</p>
      ) : (
        <div className={styles.documentList}>
          {certificates.map((cert) => (
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
                        isExpired(cert.expirationDate) ? styles.expired : ''
                      } ${isExpiringSoon(cert.expirationDate) ? styles.expiringSoon : ''}`}
                    >
                      Expires: {formatDate(cert.expirationDate)}
                      {isExpired(cert.expirationDate) && ' (Expired)'}
                      {isExpiringSoon(cert.expirationDate) && ' (Expiring Soon)'}
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
                  onClick={() => handleDelete(cert.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
