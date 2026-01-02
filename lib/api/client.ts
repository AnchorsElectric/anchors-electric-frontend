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
}

export const apiClient = new ApiClient();

