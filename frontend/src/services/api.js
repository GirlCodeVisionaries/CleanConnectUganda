import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  profile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
};

export const servicesAPI = {
  list: () => api.get('/services/'),
};

export const partnersAPI = {
  list: (params) => api.get('/partners/', { params }),
  detail: (id) => api.get(`/partners/${id}/`),
  create: (data) => api.post('/partners/', data),
  update: (id, data) => api.put(`/partners/${id}/`, data),
  services: (partnerId) => api.get(`/partners/${partnerId}/services/`),
  addService: (partnerId, data) => api.post(`/partners/${partnerId}/services/`, data),
};

export const bookingsAPI = {
  list: (params) => api.get('/bookings/', { params }),
  detail: (id) => api.get(`/bookings/${id}/`),
  create: (data) => api.post('/bookings/', data),
  update: (id, data) => api.put(`/bookings/${id}/`, data),
};

export const adminAPI = {
  overview: () => api.get('/admin/overview/'),

  partners: (params) => api.get('/admin/partners/', { params }),
  partner: (id) => api.get(`/admin/partners/${id}/`),
  updatePartner: (id, data) => api.patch(`/admin/partners/${id}/`, data),
  setPartnerVerification: (id, data) => api.post(`/admin/partners/${id}/verification/`, data),
  payoutPartner: (id, data) => api.post(`/admin/partners/${id}/payout/`, data),

  documents: (params) => api.get('/admin/documents/', { params }),
  reviewDocument: (id, data) => api.post(`/admin/documents/${id}/review/`, data),

  bookings: (params) => api.get('/admin/bookings/', { params }),
  booking: (id) => api.get(`/admin/bookings/${id}/`),
  setBookingStatus: (id, data) => api.post(`/admin/bookings/${id}/status/`, data),

  payments: (params) => api.get('/admin/payments/', { params }),
  refundPayment: (id) => api.post(`/admin/payments/${id}/refund/`),

  payouts: (params) => api.get('/admin/payouts/', { params }),
  retryPayout: (id) => api.post(`/admin/payouts/${id}/retry/`),

  users: (params) => api.get('/admin/users/', { params }),
  user: (id) => api.get(`/admin/users/${id}/`),
  setUserActive: (id, data) => api.post(`/admin/users/${id}/active/`, data),
  setUserRole: (id, data) => api.post(`/admin/users/${id}/role/`, data),

  categories: () => api.get('/admin/categories/'),
  createCategory: (data) => api.post('/admin/categories/', data),
  updateCategory: (id, data) => api.patch(`/admin/categories/${id}/`, data),
  disableCategory: (id) => api.delete(`/admin/categories/${id}/`),

  activity: (params) => api.get('/admin/activity/', { params }),
};

export const partnerPortalAPI = {
  me: () => api.get('/partners/me/'),
  onboard: (data) => api.post('/partners/onboard/', data),
  updateProfile: (data) => api.put('/partners/me/', data),
  documents: () => api.get('/partners/me/documents/'),
  uploadDocument: (formData) =>
    api.post('/partners/me/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteDocument: (id) => api.delete(`/partners/me/documents/${id}/`),
  earnings: () => api.get('/partners/me/earnings/'),
  payouts: () => api.get('/partners/me/payouts/'),
  requestPayout: (data) => api.post('/partners/me/payouts/', data),
};

export const paymentsAPI = {
  create: (data) => api.post('/payments/', data),
};

export const reviewsAPI = {
  list: (params) => api.get('/reviews/', { params }),
  create: (data) => api.post('/reviews/', data),
};

export const aiAPI = {
  quote: (data) => api.post('/ai/quote/', data),
  match: (data) => api.post('/ai/match/', data),
  assign: (data) => api.post('/ai/assign/', data),
  forecast: (params) => api.get('/ai/forecast/', { params }),
  chat: (data) => api.post('/ai/chat/', data),
  trustScore: (partnerId) => api.get(`/ai/trust-score/${partnerId}/`),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats/'),
};

export default api;
