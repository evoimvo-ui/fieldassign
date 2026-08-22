import { create } from 'zustand';
import api, { changePassword as changePasswordApi } from '../services/api.js';

const useAuthStore = create((set) => ({
  user: null,
  organization: null,
  token: localStorage.getItem('fo_token') || null,
  loading: true,

  // Provjeri token pri pokretanju
  init: async () => {
    const token = localStorage.getItem('fo_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, organization: data.organization, loading: false });
    } catch {
      localStorage.removeItem('fo_token');
      set({ token: null, user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('fo_token', data.token);
    set({ token: data.token, user: data.user, organization: data.organization });
    return data;
  },

  register: async (orgName, name, email, password) => {
    const { data } = await api.post('/auth/register', { orgName, name, email, password });
    localStorage.setItem('fo_token', data.token);
    set({ token: data.token, user: data.user, organization: data.organization });
    return data;
  },

  changePassword: async (currentPassword, newPassword) => {
    await changePasswordApi(currentPassword, newPassword);
    set((state) => ({
      user: state.user ? { ...state.user, mustChangePassword: false } : null
    }));
  },

  logout: () => {
    localStorage.removeItem('fo_token');
    set({ token: null, user: null, organization: null });
  },
}));

export default useAuthStore;
