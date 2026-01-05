import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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
  async register(data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    dateOfBirth: string;
    ssn: string;
    emergencyContact?: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      relationship: string;
    };
  }) {
    const response = await this.client.post<ApiResponse>('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post<ApiResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post<ApiResponse>('/auth/forgot-password', {
      email,
    });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post<ApiResponse>('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  }

  // Profile methods
  async getProfile() {
    const response = await this.client.get<ApiResponse>('/profile');
    return response.data;
  }

  async updateProfile(data: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    phone?: string;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    zipCode?: string;
    emergencyContact?: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string | null;
      relationship: string;
    };
  }) {
    const response = await this.client.put<ApiResponse>('/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.post<ApiResponse>('/profile/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  // Admin methods
  async getUsers(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await this.client.get<ApiResponse>(`/admin/users${params}`);
    return response.data;
  }

  async getUserById(userId: string) {
    const response = await this.client.get<ApiResponse>(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserById(userId: string, data: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    zipCode?: string;
    emergencyContact?: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string | null;
      relationship: string;
    };
  }) {
    const response = await this.client.put<ApiResponse>(`/admin/users/${userId}`, data);
    return response.data;
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    const response = await this.client.put<ApiResponse>(`/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  }

  async createEmployeeProfile(
    userId: string,
    data: {
      paymentType: 'HOURLY' | 'SALARY';
      hourlyRate?: number;
      salaryAmount?: number;
    }
  ) {
    const response = await this.client.post<ApiResponse>(`/admin/users/${userId}/employee`, data);
    return response.data;
  }

  async getEmployeeProfile(userId: string) {
    const response = await this.client.get<ApiResponse>(`/admin/users/${userId}/employee`);
    return response.data;
  }

  async updateEmployeeProfile(
    userId: string,
    data: {
      paymentType: 'HOURLY' | 'SALARY';
      hourlyRate?: number;
      salaryAmount?: number;
    }
  ) {
    const response = await this.client.put<ApiResponse>(`/admin/users/${userId}/employee`, data);
    return response.data;
  }

  // Time Entry Methods
  async getMyTimeEntries(params?: { startDate?: string; endDate?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);
    
    const url = `/time-entries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.client.get<ApiResponse>(url);
    return response.data;
  }

  async createOrUpdateTimeEntry(data: { date: string; hours?: number | null }) {
    const response = await this.client.post<ApiResponse>('/time-entries', data);
    return response.data;
  }

  async submitTimeEntries(entryIds: string[]) {
    const response = await this.client.post<ApiResponse>('/time-entries/submit', { entryIds });
    return response.data;
  }

  async deleteTimeEntry(entryId: string) {
    const response = await this.client.delete<ApiResponse>(`/time-entries/${entryId}`);
    return response.data;
  }

  async getMyTimeEntriesHistory(params?: { status?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const queryString = queryParams.toString();
    const url = `/time-entries/history${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<ApiResponse>(url);
    return response.data;
  }

  // Admin Time Entry Review Methods
  async getSubmittedTimeEntries(params?: { status?: string; employeeId?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await this.client.get<ApiResponse>(`/admin/time-entries?${queryParams.toString()}`);
    return response.data;
  }

  async approveTimeEntry(timeEntryId: string) {
    const response = await this.client.post<ApiResponse>(`/admin/time-entries/${timeEntryId}/approve`);
    return response.data;
  }

  async rejectTimeEntry(timeEntryId: string, rejectionReason?: string) {
    const response = await this.client.post<ApiResponse>(`/admin/time-entries/${timeEntryId}/reject`, {
      rejectionReason: rejectionReason || null,
    });
    return response.data;
  }

  async markTimeEntryAsPaid(timeEntryId: string) {
    const response = await this.client.post<ApiResponse>(`/admin/time-entries/${timeEntryId}/mark-paid`);
    return response.data;
  }
}

export const apiClient = new ApiClient();

