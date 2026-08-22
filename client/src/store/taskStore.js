import { create } from 'zustand';
import api from '../services/api.js';

const useTaskStore = create((set, get) => ({
  tasks: [],
  selectedTask: null,
  activities: [],
  loading: false,
  error: null,

  fetchTasks: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/tasks', { params });
      set({ tasks: data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Greška', loading: false });
    }
  },

  fetchTask: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/tasks/${id}`);
      set({ selectedTask: data.task, activities: data.activities, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Greška', loading: false });
    }
  },

  createTask: async (taskData) => {
    const { data } = await api.post('/tasks', taskData);
    set((state) => ({ tasks: [data, ...state.tasks] }));
    return data;
  },

  updateStatus: async (id, status, gps = null) => {
    const { data } = await api.patch(`/tasks/${id}/status`, { status, gps });
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === id ? data : t)),
      selectedTask: state.selectedTask?._id === id ? data : state.selectedTask,
    }));
    // Refresh aktivnosti
    if (get().selectedTask?._id === id) {
      await get().fetchTask(id);
    }
    return data;
  },

  addActivity: async (taskId, text, note = '', gps = null) => {
    const { data } = await api.post('/activities', { taskId, text, note, gps });
    set((state) => ({ activities: [...state.activities, data] }));
    return data;
  },

  setSelectedTask: (task) => set({ selectedTask: task, activities: [] }),
  clearError: () => set({ error: null }),
}));

export default useTaskStore;
