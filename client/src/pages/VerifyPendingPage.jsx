import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

export default function VerifyPendingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, resendVerification, updateEmail, logout } = useAuthStore();

  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | sent | error
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState('');
  const [changeEmailSuccess, setChangeEmailSuccess] = useState('');
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resendStatus === 'sending') return;
    setGlobalError('');
    setResendStatus('sending');
    try {
      await resendVerification();
      setResendStatus('sent');
      setCooldown(60);
      setTimeout(() => setResendStatus('idle'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Greška';
      const waitSec = err.response?.data?.waitSeconds;
      if (waitSec) setCooldown(waitSec);
      setGlobalError(msg);
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 2000);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || changeEmailLoading) return;
    setChangeEmailError('');
    setChangeEmailSuccess('');
    setChangeEmailLoading(true);
    try {
      await updateEmail(newEmail);
      setChangeEmailSuccess(t('verifyPending.resendSent'));
      setNewEmail('');
      setShowChangeEmail(false);
      setCooldown(60);
      setTimeout(() => setChangeEmailSuccess(''), 3000);
    } catch (err) {
      setChangeEmailError(err.response?.data?.message || 'Greška');
    } finally {
      setChangeEmailLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <img
            src="/FAicon-512.png"
            alt="FieldAssign"
            className="w-20 h-20 mx-auto mb-4 rounded-2xl object-contain shadow-sm"
            draggable={false}
          />
          <h1 className="text-2xl font-semibold text-gray-900">FieldAssign</h1>
          <p className="text-sm text-gray-500 mt-1">{t('layout.tagline')}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-base font-semibold text-gray-900 text-center mb-2">
            {t('verifyPending.title')}
          </h2>
          <p className="text-sm text-gray-600 text-center mb-5">
            {t('verifyPending.description', { email: user?.email || '' })}
          </p>

          <div className="flex items-center justify-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg mb-5">
            <span className="text-sm font-medium text-gray-800 truncate">{user?.email}</span>
          </div>

          {globalError && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
              {globalError}
            </div>
          )}

          {changeEmailSuccess && (
            <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg mb-4">
              {changeEmailSuccess}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendStatus === 'sending'}
            className="btn btn-primary w-full justify-center py-2.5 mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resendStatus === 'sending'
              ? t('common.loading')
              : resendStatus === 'sent'
              ? t('verifyPending.resendSent')
              : cooldown > 0
              ? t('verifyPending.resendCooldown', { seconds: cooldown })
              : t('verifyPending.resend')}
          </button>

          {!showChangeEmail ? (
            <button
              onClick={() => {
                setShowChangeEmail(true);
                setChangeEmailError('');
                setGlobalError('');
              }}
              className="w-full text-sm text-brand-600 hover:text-brand-800 font-medium py-2"
            >
              {t('verifyPending.wrongEmail')}
            </button>
          ) : (
            <form onSubmit={handleUpdateEmail} className="space-y-3 pt-2">
              <div>
                <label className="label">{t('auth.email')}</label>
                <input
                  type="email"
                  className="input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('verifyPending.newEmailPlaceholder')}
                  required
                  autoFocus
                />
              </div>
              {changeEmailError && (
                <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                  {changeEmailError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeEmail(false);
                    setChangeEmailError('');
                    setNewEmail('');
                  }}
                  className="btn btn-secondary flex-1 justify-center py-2.5"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changeEmailLoading}
                  className="btn btn-primary flex-1 justify-center py-2.5 disabled:opacity-60"
                >
                  {changeEmailLoading ? t('common.loading') : t('verifyPending.updateEmailBtn')}
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
            >
              {t('verifyPending.logout')}
            </button>
          </div>
        </div>

        <footer className="mt-10 text-center">
          <p className="text-xs text-gray-500 tracking-wider uppercase mb-4">
            © {new Date().getFullYear()} EI-APPS. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
            <a
              href="https://ei-apps.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 hover:underline tracking-wide uppercase"
            >
              Privacy Policy
            </a>
            <a
              href="https://ei-apps.com/tos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 hover:underline tracking-wide uppercase"
            >
              Terms of Service
            </a>
            <a
              href="https://ei-apps.com/dpa"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 hover:underline tracking-wide uppercase"
            >
              DPA
            </a>
            <a
              href="https://ei-apps.com/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 hover:underline tracking-wide uppercase"
            >
              Refund Policy
            </a>
            <a
              href="mailto:info@ei-apps.com"
              className="hover:text-gray-700 hover:underline tracking-wide uppercase"
            >
              Contact
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
