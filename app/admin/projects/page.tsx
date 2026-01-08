'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './projects.module.scss';

interface Project {
  id: string;
  name: string;
  jobNumber: string;
  address: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    jobNumber: '',
    address: '',
    clientName: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadProjects();
  }, [router]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getProjects();
      if (response.success && response.data) {
        const projectsData = (response.data as any).projects || [];
        setProjects(projectsData);
      } else {
        setError(response.error || 'Failed to load projects');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({ name: '', jobNumber: '', address: '', clientName: '' });
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      jobNumber: project.jobNumber,
      address: project.address,
      clientName: project.clientName,
    });
    setShowModal(true);
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    if (deleteConfirmText !== projectToDelete.name) {
      setError('Project name does not match. Please enter the exact project name to confirm deletion.');
      return;
    }

    try {
      setDeleting(true);
      setError('');
      const response = await apiClient.deleteProject(projectToDelete.id);
      if (response.success) {
        setShowDeleteModal(false);
        setProjectToDelete(null);
        setDeleteConfirmText('');
        await loadProjects();
      } else {
        setError(response.error || 'Failed to delete project');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      let response;
      if (editingProject) {
        response = await apiClient.updateProject(editingProject.id, formData);
      } else {
        response = await apiClient.createProject(formData);
      }

      if (response.success) {
        setShowModal(false);
        await loadProjects();
      } else {
        setError(response.error || `Failed to ${editingProject ? 'update' : 'create'} project`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || `Failed to ${editingProject ? 'update' : 'create'} project`);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Projects</h1>
        <button onClick={handleAdd} className={styles.addButton}>
          Add Project
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.projectsList}>
        {projects.length === 0 ? (
          <p className={styles.emptyMessage}>No projects found. Click "Add Project" to create one.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Job Number</th>
                <th>Address</th>
                <th>Client Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className={styles.tableRow} onClick={() => router.push(`/admin/projects/${project.id}`)}>
                  <td>{project.name}</td>
                  <td>{project.jobNumber}</td>
                  <td>{project.address}</td>
                  <td>{project.clientName}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(project)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingProject ? 'Edit Project' : 'Add Project'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Job Number</label>
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Client Name</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.saveButton}>
                  {editingProject ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && projectToDelete && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete Project</h2>
              <button
                className={styles.modalClose}
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.warningBox}>
                <h3 className={styles.warningTitle}>⚠️ Warning: This action cannot be undone</h3>
                <p className={styles.warningText}>
                  You are about to permanently delete the project <strong>"{projectToDelete.name}"</strong> (Job Number: {projectToDelete.jobNumber}).
                </p>
                <p className={styles.warningText}>
                  This will:
                </p>
                <ul className={styles.warningList}>
                  <li>Remove the project from the system permanently</li>
                  <li>Disassociate any employees currently assigned to this project</li>
                  <li>Remove the project reference from all time entries (time entries will remain but without project association)</li>
                  <li>Affect any historical data linked to this project</li>
                </ul>
                <p className={styles.warningText}>
                  <strong>To confirm deletion, please type the exact project name below:</strong>
                </p>
                <div className={styles.formGroup}>
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={projectToDelete.name}
                    disabled={deleting}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.deleteConfirmButton}
                onClick={handleDeleteConfirm}
                disabled={deleting || deleteConfirmText !== projectToDelete.name}
              >
                {deleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

