import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Layout() {
  const { t } = useTranslation();
  const { user, organization, logout } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: '⊞', exact: true },
    { to: '/tasks', label: t('nav.tasks'), icon: '☑' },
    { to: '/activities', label: t('nav.activities'), icon: '◎' },
    { to: '/reports', label: t('nav.reports'), icon: '▤' },
    { to: '/admin', label: t('nav.workers'), icon: '👥', adminOnly: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">FieldAssign</div>
          <div className="text-xs text-gray-400 mt-0.5">{organization?.name || t('layout.tagline')}</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User + Language */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-2">
          {/* Language switcher */}
          <div className="flex justify-start">
            <LanguageSwitcher />
          </div>

          {/* User info */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600 flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 text-xs transition-colors"
              title={t('common.logout')}
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
