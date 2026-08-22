import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore.js';

import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import ActivitiesPage from './pages/ActivitiesPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';

function ProtectedRoute({ children, requirePasswordChange = false }) {
  const { token, loading, user } = useAuthStore();
  const location = useLocation();
  
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Učitavanje...</div>;
  if (!token) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  
  // If we're not already on the change password page and must change password
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  
  // If we're on change password page but don't need to change password
  if (!user?.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuthStore();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Učitavanje...</div>;
  if (token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Change Password Route (protected but special) */}
        <Route path="/change-password" element={
          <ProtectedRoute requirePasswordChange={true}>
            <ChangePasswordPage />
          </ProtectedRoute>
        } />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
