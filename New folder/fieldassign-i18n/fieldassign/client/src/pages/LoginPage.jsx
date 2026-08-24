import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">FieldAssign</h1>
          <p className="text-sm text-gray-500 mt-1">{t('layout.tagline')}</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('auth.login')}</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vasa@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
              {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-800 font-medium">
            {t('auth.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
