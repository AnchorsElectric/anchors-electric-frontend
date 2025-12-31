// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  position?: string;
  department?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
  compensationType: 'HOURLY' | 'SALARY';
  hourlyRate?: number;
  salaryAmount?: number;
  payPeriodType: 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY';
  applicationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'TERMINATED';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  emergencyContacts?: EmergencyContact[];
  documents?: Document[];
}

export interface EmergencyContact {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  employeeId: string;
  documentType: 'DRIVERS_LICENSE' | 'ID_CARD' | 'WORK_AUTHORIZATION' | 'OTHER';
  fileName: string;
  uploadedAt: string;
  fileSize?: number;
  mimeType?: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User & { employee?: Employee };
  token: string;
}

