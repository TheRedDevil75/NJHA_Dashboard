import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  User, Hospital, CollectionPeriod, IntervalConfig,
  Submission, ThemeConfig, AuditLog, PatientField,
} from '../types';

const BASE_URL = '/api';
const TOKEN_KEY = 'auth_token';

function createClient(): AxiosInstance {
  const instance = axios.create({ baseURL: BASE_URL });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      if (err.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
  );

  return instance;
}

const http = createClient();

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: { message?: string } })?.error?.message ?? 'An error occurred.';
  }
  return 'An unexpected error occurred.';
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await http.post<{ token: string; user: User }>('/auth/login', { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },
  logout: async () => {
    try { await http.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
  },
  me: async () => {
    const { data } = await http.get<{ user: User }>('/auth/me');
    return data.user;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await http.put<{ message: string; token: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },
  getToken: () => localStorage.getItem(TOKEN_KEY),
};

// ── Theme ────────────────────────────────────────────────────
export const themeApi = {
  get: async () => {
    const { data } = await http.get<{ theme: ThemeConfig }>('/admin/theme');
    return data.theme;
  },
  update: async (updates: Partial<ThemeConfig>) => {
    const { data } = await http.put<{ theme: ThemeConfig }>('/admin/theme', updates);
    return data.theme;
  },
};

// ── Fields ───────────────────────────────────────────────────
export const fieldsApi = {
  list: async () => {
    const { data } = await http.get<{ fields: PatientField[] }>('/fields');
    return data.fields;
  },
};

// ── Submissions ──────────────────────────────────────────────
export const submissionsApi = {
  submit: async (payload: {
    hospitalId: string;
    values: { fieldId: string; value: number }[];
    notes?: string;
  }) => {
    const { data } = await http.post<{ submission: Submission }>('/submissions', payload);
    return data.submission;
  },
  mySubmissions: async () => {
    const { data } = await http.get<{ submissions: Submission[]; period: CollectionPeriod | null }>('/submissions/my');
    return data;
  },
};

// ── Admin: Users ─────────────────────────────────────────────
export const adminUsersApi = {
  list: async (params?: { page?: number; search?: string; hospitalId?: string; role?: string; status?: string }) => {
    const { data } = await http.get<{
      users: User[];
      total: number;
      page: number;
      totalPages: number;
    }>('/admin/users', { params });
    return data;
  },
  create: async (payload: {
    username: string;
    password: string;
    displayName?: string;
    assignedHospitalId?: string;
    role?: 'USER' | 'ADMIN';
  }) => {
    const { data } = await http.post<{ user: User }>('/admin/users', payload);
    return data.user;
  },
  get: async (id: string) => {
    const { data } = await http.get<{ user: User & { _count: { submissions: number } } }>(`/admin/users/${id}`);
    return data.user;
  },
  update: async (id: string, payload: Partial<Pick<User, 'displayName' | 'isActive' | 'role'> & { assignedHospitalId: string | null }>) => {
    const { data } = await http.put<{ user: User }>(`/admin/users/${id}`, payload);
    return data.user;
  },
  deactivate: async (id: string) => {
    await http.delete(`/admin/users/${id}`);
  },
  resetPassword: async (id: string, newPassword: string) => {
    await http.post(`/admin/users/${id}/reset-password`, { newPassword });
  },
};

// ── Admin: Hospitals ──────────────────────────────────────────
export const adminHospitalsApi = {
  list: async () => {
    const { data } = await http.get<{ hospitals: Hospital[] }>('/admin/hospitals');
    return data.hospitals;
  },
  create: async (payload: Omit<Hospital, 'id' | 'isActive' | 'createdAt' | '_count'>) => {
    const { data } = await http.post<{ hospital: Hospital }>('/admin/hospitals', payload);
    return data.hospital;
  },
  update: async (id: string, payload: Partial<Hospital>) => {
    const { data } = await http.put<{ hospital: Hospital }>(`/admin/hospitals/${id}`, payload);
    return data.hospital;
  },
  deactivate: async (id: string) => {
    await http.delete(`/admin/hospitals/${id}`);
  },
};

// ── Admin: Intervals ──────────────────────────────────────────
export const adminIntervalsApi = {
  list: async () => {
    const { data } = await http.get<{ configs: IntervalConfig[] }>('/admin/intervals');
    return data.configs;
  },
  create: async (payload: Omit<IntervalConfig, 'id' | 'isActive' | 'createdAt' | '_count'>) => {
    const { data } = await http.post<{ config: IntervalConfig }>('/admin/intervals', payload);
    return data.config;
  },
  update: async (id: string, payload: Partial<IntervalConfig>) => {
    const { data } = await http.put<{ config: IntervalConfig }>(`/admin/intervals/${id}`, payload);
    return data.config;
  },
  activate: async (id: string) => {
    await http.post(`/admin/intervals/${id}/activate`);
  },
  triggerReset: async () => {
    await http.post('/admin/intervals/trigger-reset');
  },
};

// ── Admin: Data ───────────────────────────────────────────────
export const adminDataApi = {
  periods: async () => {
    const { data } = await http.get<{ periods: CollectionPeriod[] }>('/admin/data/periods');
    return data.periods;
  },
  current: async () => {
    const { data } = await http.get<{
      period: CollectionPeriod | null;
      fields: PatientField[];
      stats: {
        total: number;
        byType: Record<string, number>;
        byHospital: { name: string; count: number }[];
        topUsers: { username: string; displayName: string | null; count: number }[];
      } | null;
    }>('/admin/data/current');
    return data;
  },
  submissions: async (
    periodId: string,
    params?: { page?: number; hospitalId?: string; symptomType?: string; userId?: string }
  ) => {
    const { data } = await http.get<{
      submissions: Submission[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/admin/data/periods/${periodId}/submissions`, { params });
    return data;
  },
  exportUrl: (periodId: string, params?: { hospitalId?: string; symptomType?: string }) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const query = new URLSearchParams({ ...(params ?? {}), token: token ?? '' });
    return `${BASE_URL}/admin/data/periods/${periodId}/export?${query}`;
  },
};

// ── Admin: Patient Fields ─────────────────────────────────────
export const adminFieldsApi = {
  list: async () => {
    const { data } = await http.get<{ fields: PatientField[] }>('/admin/fields');
    return data.fields;
  },
  create: async (payload: { label: string; key: string; sortOrder?: number }) => {
    const { data } = await http.post<{ field: PatientField }>('/admin/fields', payload);
    return data.field;
  },
  update: async (id: string, payload: { label?: string; sortOrder?: number; isActive?: boolean }) => {
    const { data } = await http.put<{ field: PatientField }>(`/admin/fields/${id}`, payload);
    return data.field;
  },
  delete: async (id: string) => {
    await http.delete(`/admin/fields/${id}`);
  },
};

// ── Admin: Audit ──────────────────────────────────────────────
export const adminAuditApi = {
  list: async (params?: { page?: number; action?: string; userId?: string; from?: string; to?: string }) => {
    const { data } = await http.get<{
      logs: AuditLog[];
      total: number;
      page: number;
      totalPages: number;
    }>('/admin/audit', { params });
    return data;
  },
};

export { getErrorMessage };
