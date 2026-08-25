import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Layout() {
  const { t } = useTranslation();
  const { user, organization, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: '⊞', exact: true },
    { to: '/tasks', label: t('nav.tasks'), icon: '☑' },
    { to: '/activities', label: t('nav.activities'), icon: '◎' },
    { to: '/reports', label: t('nav.reports'), icon: '▤' },
    { to: '/templates', label: t('nav.templates'), icon: '🔁', adminOnly: true },
    { to: '/admin', label: t('nav.workers'), icon: '👥', adminOnly: true },
  ];

  const handleLogout = () => {
    setSidebarOpen(false);
    logout();
    navigate('/login');
  };

  const handleNavClick = () => setSidebarOpen(false);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const Sidebar = () => (
    <aside className="w-64 md:w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <img
            src="/FAicon-512.png"
            alt="FieldAssign"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
            draggable={false}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">FieldAssign</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">{organization?.name || t('layout.tagline')}</div>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-gray-700 flex items-center justify-center w-10 h-10 rounded-lg -mr-2"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
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
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base leading-none w-5 flex-shrink-0 text-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User + Language */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-2">
        <div className="flex justify-start">
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 capitalize truncate">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            title={t('common.logout')}
            aria-label="Logout"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden max-w-screen">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center gap-3 px-3 py-2 bg-white border-b border-gray-100 sticky top-0 z-40 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-50 -ml-1"
          aria-label="Open menu"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/FAicon-512.png"
            alt=""
            className="w-7 h-7 rounded-lg object-contain flex-shrink-0"
            draggable={false}
          />
          <span className="text-sm font-semibold text-gray-900 truncate">FieldAssign</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600 flex-shrink-0 -mr-1">
          {initials}
        </div>
      </header>

      {/* Desktop sidebar (uvijek vidljiv) */}
      <div className="hidden md:flex md:h-screen md:sticky md:top-0 md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer (overlay) */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-150"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full shadow-xl translate-x-0 transition-transform duration-200 animate-in slide-in-from-left">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content — max-width za 4K, centriran */}
      <main className="flex-1 overflow-y-auto w-full md:h-screen">
        <div className="w-full max-w-screen-2xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
