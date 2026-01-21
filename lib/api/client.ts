import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://anchors-electric-backend-production.up.railway.app';

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
      withCredentials: true,
    });

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

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          const url = error.config?.url || '';
          if (!url.includes('/projects') && 
              !url.includes('/auth/login') && 
              !url.includes('/auth/register') &&
              !url.includes('/profile/change-password')) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

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

  async updateCurrentProject(currentProjectId: string | null) {
    const response = await this.client.put<ApiResponse>('/profile/current-project', {
      currentProjectId,
    });
    return response.data;
  }

  async getUsers(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await this.client.get<ApiResponse>(`/admin/users${params}`);
    return response.data;
  }

  async getUserById(userId: string) {
    const response = await this.client.get<ApiResponse>(`/admin/users/${userId}`);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete<ApiResponse>(`/admin/users/${userId}`);
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

  async deactivateUser(userId: string) {
    const response = await this.client.post<ApiResponse>(`/admin/users/${userId}/deactivate`);
    return response.data;
  }

  async reactivateUser(userId: string) {
    const response = await this.client.post<ApiResponse>(`/admin/users/${userId}/reactivate`);
    return response.data;
  }

  async createEmployeeProfile(
    userId: string,
    data: {
      paymentType: 'HOURLY' | 'SALARY';
      hourlyRate?: number;
      salaryAmount?: number;
      ptoDaysLeft?: number;
      sickDaysLeft?: number;
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
      ptoDaysLeft?: number;
      sickDaysLeft?: number;
    }
  ) {
    const response = await this.client.put<ApiResponse>(`/admin/users/${userId}/employee`, data);
    return response.data;
  }

  async getTimeEntries(params?: { payPeriodId?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.payPeriodId) queryParams.append('payPeriodId', params.payPeriodId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    const url = `/time-entries${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<ApiResponse>(url);
    return response.data;
  }

  async createTimeEntry(data: {
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    hasPerDiem?: boolean;
    sickDay?: boolean;
    isTravelDay?: boolean;
    isPTO?: boolean;
    isHoliday?: boolean;
    projectId?: string | null;
  }) {
    const response = await this.client.post<ApiResponse>('/time-entries', data);
    return response.data;
  }

  async updateTimeEntry(id: string, data: {
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    hasPerDiem?: boolean;
    sickDay?: boolean;
    isTravelDay?: boolean;
    isPTO?: boolean;
    isHoliday?: boolean;
    projectId?: string | null;
  }) {
    const response = await this.client.put<ApiResponse>(`/time-entries/${id}`, data);
    return response.data;
  }

  async deleteTimeEntry(id: string) {
    const response = await this.client.delete<ApiResponse>(`/time-entries/${id}`);
    return response.data;
  }

  async getPayPeriods(params?: { status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const url = `/pay-periods${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<ApiResponse>(url);
    return response.data;
  }

  async createPayPeriod(data: {
    startDate: string;
    endDate: string;
  }) {
    const response = await this.client.post<ApiResponse>('/pay-periods', data);
    return response.data;
  }

  async updatePayPeriod(id: string, data: {
    timeEntryIds?: string[];
  }) {
    const response = await this.client.put<ApiResponse>(`/pay-periods/${id}`, data);
    return response.data;
  }

  async submitPayPeriod(id: string) {
    const response = await this.client.post<ApiResponse>(`/pay-periods/${id}/submit`);
    return response.data;
  }

  async deletePayPeriod(id: string) {
    const response = await this.client.delete<ApiResponse>(`/pay-periods/${id}`);
    return response.data;
  }

  async getSubmittedPayPeriods(params?: { status?: string; employeeId?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    const url = `/admin/pay-periods${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<ApiResponse>(url);
    return response.data;
  }

  async getPayPeriodById(id: string) {
    const response = await this.client.get<ApiResponse>(`/admin/pay-periods/${id}`);
    return response.data;
  }

  async approvePayPeriod(id: string) {
    const response = await this.client.post<ApiResponse>(`/admin/pay-periods/${id}/approve`);
    return response.data;
  }

  async rejectPayPeriod(id: string, reason: string) {
    const response = await this.client.post<ApiResponse>(`/admin/pay-periods/${id}/reject`, { rejectionReason: reason });
    return response.data;
  }

  async markPayPeriodAsPaid(id: string) {
    const response = await this.client.post<ApiResponse>(`/admin/pay-periods/${id}/mark-paid`);
    return response.data;
  }

  async getProjects() {
    const response = await this.client.get<ApiResponse>('/projects');
    return response.data;
  }

  async getProjectById(id: string) {
    const response = await this.client.get<ApiResponse>(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    jobNumber: string;
    address: string;
    clientName: string;
  }) {
    const response = await this.client.post<ApiResponse>('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: {
    name: string;
    jobNumber: string;
    address: string;
    clientName: string;
  }) {
    const response = await this.client.put<ApiResponse>(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string) {
    const response = await this.client.delete<ApiResponse>(`/projects/${id}`);
    return response.data;
  }

}

export const apiClient = new ApiClient();

