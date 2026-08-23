import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.orgName, form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.registerError'));
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
          <p className="text-sm text-gray-500 mt-1">{t('auth.tagline')}</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('auth.register')}</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.orgName')}</label>
              <input name="orgName" type="text" className="input" value={form.orgName} onChange={handleChange} placeholder={t('auth.orgPlaceholder')} required />
            </div>
            <div>
              <label className="label">{t('auth.fullName')}</label>
              <input name="name" type="text" className="input" value={form.name} onChange={handleChange} placeholder={t('auth.namePlaceholder')} required />
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <input name="email" type="email" className="input" value={form.email} onChange={handleChange} placeholder="vasa@email.com" required />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input name="password" type="password" className="input" value={form.password} onChange={handleChange} placeholder={t('auth.passwordMin')} minLength={6} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
              {loading ? t('auth.registering') : t('auth.registerBtn')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-800 font-medium">{t('auth.loginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
