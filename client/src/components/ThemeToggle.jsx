import useThemeStore from '../store/themeStore.js';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 transition-colors"
      title={theme === 'dark' ? 'Svijetla tema' : 'Tamna tema'}
    >
      <span className="text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
