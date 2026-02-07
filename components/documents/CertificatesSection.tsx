'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import docStyles from './documents.module.scss';
import profileStyles from '@/app/employee/profile/edit.module.scss';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const response = await apiClient.uploadDocument(formData.file, {
        name: formData.name.trim(),
        type: 'CERTIFICATE',
        expirationDate: formData.doesNotExpire ? null : formData.expirationDate,
        doesNotExpire: formData.doesNotExpire,
      });

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
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload certificate';
      setError(errorMessage);
      // Keep error visible for 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setCertificateToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!certificateToDelete) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await apiClient.deleteDocument(certificateToDelete.id);
      if (response.success) {
        setSuccess('Certificate deleted successfully!');
        setShowDeleteModal(false);
        setCertificateToDelete(null);
        loadCertificates();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to delete certificate');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete certificate');
    } finally {
      setDeleting(false);
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
    <div className={profileStyles.section}>
      <h2 className={profileStyles.sectionTitle}>Certificates</h2>

      {error && <div className={profileStyles.error}>{error}</div>}
      {success && <div className={profileStyles.success}>{success}</div>}

      {showUploadForm && (
        <form 
          onSubmit={handleSubmit}
          className={docStyles.uploadForm}
          noValidate
        >
          <div className={docStyles.field}>
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

          <div className={docStyles.field}>
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
              <p className={docStyles.fileName}>Selected: {formData.file.name}</p>
            )}
          </div>

          <div className={docStyles.field}>
            <label className={docStyles.checkboxLabel}>
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
            <div className={docStyles.field}>
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

          <div className={docStyles.formActions}>
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
              className={docStyles.cancelButton}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={docStyles.submitButton}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Certificate'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading certificates...</p>
      ) : certificates.length === 0 ? (
        <p className={docStyles.emptyMessage}>No certificates uploaded yet.</p>
      ) : (
        <div className={docStyles.documentList}>
          {certificates.map((cert) => (
            <div key={cert.id} className={docStyles.documentItem}>
              <div className={docStyles.documentInfo}>
                <h3 className={docStyles.documentName}>{cert.name}</h3>
                <p className={docStyles.documentFileName}>{cert.fileName}</p>
                <div className={docStyles.documentMeta}>
                  {cert.doesNotExpire ? (
                    <span className={docStyles.noExpiration}>No expiration</span>
                  ) : (
                    <span
                      className={`${docStyles.expirationDate} ${
                        isExpired(cert.expirationDate) ? docStyles.expired : ''
                      } ${isExpiringSoon(cert.expirationDate) ? docStyles.expiringSoon : ''}`}
                    >
                      Expires: {formatDate(cert.expirationDate)}
                      {isExpired(cert.expirationDate) && ' (Expired)'}
                      {isExpiringSoon(cert.expirationDate) && ' (Expiring Soon)'}
                    </span>
                  )}
                </div>
              </div>
              <div className={docStyles.documentActions}>
                {cert.fileUrl && (
                  <a
                    href={cert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={docStyles.viewButton}
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteClick(cert.id, cert.name)}
                  className={docStyles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setShowUploadForm(!showUploadForm)}
          className={docStyles.addButton}
        >
          {showUploadForm ? 'Cancel' : '+ Add Certificate'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && certificateToDelete && (
        <div className={docStyles.modalOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className={docStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={docStyles.modalHeader}>
              <h2 className={docStyles.modalTitle}>Delete Certificate</h2>
              <button
                className={docStyles.modalClose}
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
              >
                ×
              </button>
            </div>
            <div className={docStyles.modalBody}>
              <p>
                Are you sure you want to delete <strong>{certificateToDelete.name}</strong>?
              </p>
              <p className={docStyles.warning}>
                This action cannot be undone. The certificate will be permanently deleted from the system.
              </p>
            </div>
            <div className={docStyles.modalFooter}>
              <button
                className={docStyles.cancelButton}
                onClick={() => {
                  setShowDeleteModal(false);
                  setCertificateToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={docStyles.deleteButton}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
