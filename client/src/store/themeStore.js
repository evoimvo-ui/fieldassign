import { create } from 'zustand';

const STORAGE_KEY = 'fo_theme';

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // Nema sačuvane preference — prati OS postavku samo pri prvom posjetu
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  init: () => {
    applyTheme(get().theme);
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    set({ theme: next });
  },
}));

export default useThemeStore;
