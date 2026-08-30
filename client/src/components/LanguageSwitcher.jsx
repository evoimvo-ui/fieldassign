import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'bs' ? 'en' : 'bs';
    i18n.changeLanguage(next);
    localStorage.setItem('fo_lang', next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
      title="Promijeni jezik / Change language"
    >
      <span className="text-sm">{i18n.language === 'bs' ? '🇧🇦' : '🇬🇧'}</span>
      <span>{i18n.language === 'bs' ? 'BS' : 'EN'}</span>
    </button>
  );
}
