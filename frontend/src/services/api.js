import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
  forecast: (params) => api.get('/ai/forecast/', { params }),
  chat: (data) => api.post('/ai/chat/', data),
  trustScore: (partnerId) => api.get(`/ai/trust-score/${partnerId}/`),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats/'),
};

export default api;
