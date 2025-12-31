import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.client.post<ApiResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await this.client.post<ApiResponse>('/auth/register', data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get<ApiResponse>('/auth/me');
    return response.data;
  }

  async logout() {
    const response = await this.client.post<ApiResponse>('/auth/logout');
    return response.data;
  }

  // Employee methods
  async getProfile() {
    const response = await this.client.get<ApiResponse>('/employees/profile');
    return response.data;
  }

  async updateProfile(data: {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) {
    const response = await this.client.put<ApiResponse>(
      '/employees/profile',
      data
    );
    return response.data;
  }

  async registerEmployee(data: any) {
    const response = await this.client.post<ApiResponse>(
      '/employees/register',
      data
    );
    return response.data;
  }

  async uploadDocument(file: File, documentType: string) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    const response = await this.client.post<ApiResponse>(
      '/employees/documents',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // Emergency contacts
  async addEmergencyContact(data: any) {
    const response = await this.client.post<ApiResponse>(
      '/employees/emergency-contacts',
      data
    );
    return response.data;
  }

  async updateEmergencyContact(id: string, data: any) {
    const response = await this.client.put<ApiResponse>(
      `/employees/emergency-contacts/${id}`,
      data
    );
    return response.data;
  }

  async deleteEmergencyContact(id: string) {
    const response = await this.client.delete<ApiResponse>(
      `/employees/emergency-contacts/${id}`
    );
    return response.data;
  }

  // Admin methods
  async getApplications(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const response = await this.client.get<ApiResponse>('/admin/applications', {
      params,
    });
    return response.data;
  }

  async getApplication(id: string) {
    const response = await this.client.get<ApiResponse>(
      `/admin/applications/${id}`
    );
    return response.data;
  }

  async approveApplication(id: string) {
    const response = await this.client.post<ApiResponse>(
      `/admin/applications/${id}/approve`
    );
    return response.data;
  }

  async rejectApplication(id: string, rejectionReason?: string) {
    const response = await this.client.post<ApiResponse>(
      `/admin/applications/${id}/reject`,
      { status: 'REJECTED', rejectionReason }
    );
    return response.data;
  }

  async getEmployees(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const response = await this.client.get<ApiResponse>('/admin/employees', {
      params,
    });
    return response.data;
  }

  async getEmployee(id: string) {
    const response = await this.client.get<ApiResponse>(`/admin/employees/${id}`);
    return response.data;
  }

  async updateEmployee(id: string, data: any) {
    const response = await this.client.put<ApiResponse>(
      `/admin/employees/${id}`,
      data
    );
    return response.data;
  }

  async updateEmployeeStatus(id: string, status: string) {
    const response = await this.client.patch<ApiResponse>(
      `/admin/employees/${id}/status`,
      { status }
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();

