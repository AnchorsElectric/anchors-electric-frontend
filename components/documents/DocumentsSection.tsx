'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import styles from './documents.module.scss';

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string | null;
  createdAt: string;
}

export default function DocumentsSection() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDocuments('PERSONAL_DOCUMENT');
      if (response.success && response.data) {
        setDocuments((response.data as any).documents || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load documents');
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
    setError('');
    setSuccess('');

    if (!formData.file) {
      setError('Please select a file');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a document name');
      return;
    }

    setUploading(true);

    try {
      const response = await apiClient.uploadDocument(formData.file, {
        name: formData.name.trim(),
        type: 'PERSONAL_DOCUMENT',
        doesNotExpire: true,
      });

      if (response.success) {
        setSuccess('Document uploaded successfully!');
        setFormData({
          name: '',
          file: null,
        });
        setShowUploadForm(false);
        // Reset file input
        const fileInput = document.getElementById('docFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        loadDocuments();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to upload document');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload document';
      setError(errorMessage);
      // Keep error visible for 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await apiClient.deleteDocument(id);
      if (response.success) {
        setSuccess('Document deleted successfully!');
        loadDocuments();
      } else {
        setError(response.error || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Personal Documents</h2>
        <button
          type="button"
          onClick={() => setShowUploadForm(!showUploadForm)}
          className={styles.addButton}
        >
          {showUploadForm ? 'Cancel' : '+ Add Document'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {showUploadForm && (
        <form onSubmit={handleSubmit} className={styles.uploadForm}>
          <div className={styles.field}>
            <label htmlFor="docName">Document Name *</label>
            <input
              id="docName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={uploading}
              placeholder="e.g., SSN Card, Driver License"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="docFile">Document File *</label>
            <input
              id="docFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              required
              disabled={uploading}
            />
            {formData.file && (
              <p className={styles.fileName}>Selected: {formData.file.name}</p>
            )}
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setFormData({
                  name: '',
                  file: null,
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
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className={styles.emptyMessage}>No documents uploaded yet.</p>
      ) : (
        <div className={styles.documentList}>
          {documents.map((doc) => (
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
                  onClick={() => handleDelete(doc.id)}
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
