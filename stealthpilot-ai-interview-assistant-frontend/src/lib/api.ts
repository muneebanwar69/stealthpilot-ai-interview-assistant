import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; username: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),
  
  login: (username: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
  getStats: () => api.get('/users/stats'),
};

export const sessionAPI = {
  create: (data: any) => api.post('/sessions/', data),
  getAll: (limit = 50, offset = 0) => api.get(`/sessions/?limit=${limit}&offset=${offset}`),
  getById: (id: number) => api.get(`/sessions/${id}`),
  update: (id: number, data: any) => api.patch(`/sessions/${id}`, data),
  delete: (id: number) => api.delete(`/sessions/${id}`),
};

export const adminAPI = {
  getPendingUsers: () => api.get('/admin/users/pending'),
  getAllUsers: (status?: string) => 
    api.get(`/admin/users${status ? `?status_filter=${status}` : ''}`),
  approveUser: (userId: number) => api.post(`/admin/users/${userId}/approve`),
  rejectUser: (userId: number) => api.post(`/admin/users/${userId}/reject`),
  suspendUser: (userId: number) => api.post(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId: number) => api.post(`/admin/users/${userId}/unsuspend`),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
  getStats: () => api.get('/admin/stats'),
};

export const screenshotAPI = {
  analyze: (image: string, mimeType: string = 'image/png', context?: { company_name?: string; role_title?: string }) =>
    api.post('/screenshot/analyze', { image, mime_type: mimeType, context }),
};

export default api;
