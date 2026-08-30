import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import api from '../services/api.js';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetchUser, token, setUserVerified } = useAuthStore();

  const [state, setState] = useState('verifying'); // verifying | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyToken = searchParams.get('token');
    if (!verifyToken) {
      setErrorMessage(t('verifyEmail.error'));
      setState('error');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${encodeURIComponent(verifyToken)}`);
        try {
          await refetchUser();
        } catch (_) {
          setUserVerified();
        }
        setState('success');
      } catch (err) {
        setErrorMessage(err.response?.data?.message || t('verifyEmail.error'));
        setState('error');
      }
    };

    verify();
  }, [searchParams, refetchUser, setUserVerified, t]);

  const handleGoToApp = () => {
    if (token) {
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">FieldAssign</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('layout.tagline')}</p>
        </div>

        <div className="card p-6 text-center">
          {state === 'verifying' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <svg
                  className="animate-spin w-14 h-14 text-brand-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('verifyEmail.verifying')}
              </h2>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-9 h-9 text-green-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-6">
                {t('verifyEmail.success')}
              </h2>
              <button
                onClick={handleGoToApp}
                className="btn btn-primary w-full justify-center py-2.5"
              >
                {t('verifyEmail.goToApp')}
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-9 h-9 text-red-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('verifyEmail.error')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
              <button
                onClick={handleGoToLogin}
                className="btn btn-primary w-full justify-center py-2.5"
              >
                {t('verifyEmail.goToLogin')}
              </button>
            </>
          )}
        </div>

        <footer className="mt-10 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-4">
            © {new Date().getFullYear()} EI-APPS. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
            <a
              href="https://ei-apps.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:text-gray-300 hover:underline tracking-wide uppercase"
            >
              Privacy Policy
            </a>
            <a
              href="https://ei-apps.com/tos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:text-gray-300 hover:underline tracking-wide uppercase"
            >
              Terms of Service
            </a>
            <a
              href="https://ei-apps.com/dpa"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:text-gray-300 hover:underline tracking-wide uppercase"
            >
              DPA
            </a>
            <a
              href="https://ei-apps.com/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:text-gray-300 hover:underline tracking-wide uppercase"
            >
              Refund Policy
            </a>
            <a
              href="mailto:info@ei-apps.com"
              className="hover:text-gray-700 dark:text-gray-300 hover:underline tracking-wide uppercase"
            >
              Contact
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
