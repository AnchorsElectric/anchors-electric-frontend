'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/utils/auth';
import styles from './projects.module.scss';

interface Project {
  id: string;
  name: string;
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
    address: '',
    clientName: '',
  });

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
    setFormData({ name: '', address: '', clientName: '' });
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      address: project.address,
      clientName: project.clientName,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      setError('');
      const response = await apiClient.deleteProject(id);
      if (response.success) {
        await loadProjects();
      } else {
        setError(response.error || 'Failed to delete project');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete project');
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
                <th>Address</th>
                <th>Client Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.address}</td>
                  <td>{project.clientName}</td>
                  <td>
                    <button
                      onClick={() => handleEdit(project)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
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
    </div>
  );
}

