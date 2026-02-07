'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import docStyles from './documents.module.scss';
import profileStyles from '@/app/employee/profile/edit.module.scss';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload document';
      setError(errorMessage);
      // Keep error visible for 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDocumentToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await apiClient.deleteDocument(documentToDelete.id);
      if (response.success) {
        setSuccess('Document deleted successfully!');
        setShowDeleteModal(false);
        setDocumentToDelete(null);
        loadDocuments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={profileStyles.section}>
      <h2 className={profileStyles.sectionTitle}>Personal Documents</h2>

      {error && <div className={profileStyles.error}>{error}</div>}
      {success && <div className={profileStyles.success}>{success}</div>}

      {showUploadForm && (
        <form onSubmit={handleSubmit} className={docStyles.uploadForm} noValidate>
          <div className={docStyles.field}>
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

          <div className={docStyles.field}>
            <label htmlFor="docFile">Document File *</label>
            <input
              id="docFile"
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

          <div className={docStyles.formActions}>
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
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className={docStyles.emptyMessage}>No documents uploaded yet.</p>
      ) : (
        <div className={docStyles.documentList}>
          {documents.map((doc) => (
            <div key={doc.id} className={docStyles.documentItem}>
              <div className={docStyles.documentInfo}>
                <h3 className={docStyles.documentName}>{doc.name}</h3>
                <p className={docStyles.documentFileName}>{doc.fileName}</p>
                <p className={docStyles.documentMeta}>
                  Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className={docStyles.documentActions}>
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={docStyles.viewButton}
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteClick(doc.id, doc.name)}
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
          {showUploadForm ? 'Cancel' : '+ Add Document'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className={docStyles.modalOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className={docStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={docStyles.modalHeader}>
              <h2 className={docStyles.modalTitle}>Delete Document</h2>
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
                Are you sure you want to delete <strong>{documentToDelete.name}</strong>?
              </p>
              <p className={docStyles.warning}>
                This action cannot be undone. The document will be permanently deleted from the system.
              </p>
            </div>
            <div className={docStyles.modalFooter}>
              <button
                className={docStyles.cancelButton}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDocumentToDelete(null);
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
                {deleting ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
