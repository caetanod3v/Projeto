import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Calendario from './pages/Calendario';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminUsers from './pages/AdminUsers';
import Aprovacoes from './pages/Aprovacoes';
import RetornosAprovacao from './pages/RetornosAprovacao';
import Perfil from './pages/Perfil';
import api from './services/api';
import ErrorState from './components/ui/ErrorState';
import LoadingSpinner from './components/ui/LoadingSpinner';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light';
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('usuario_logado');
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    setLoadingAuth(true);
    setAuthError(null);

    if (!token) {
      logout();
      setLoadingAuth(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const authUser = res.data.user || res.data;
      setUser(authUser);
      localStorage.setItem('user', JSON.stringify(authUser));
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      } else {
        setAuthError(err.response?.data?.error || 'Nao foi possivel verificar sua sessao.');
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] text-gray-500 dark:bg-[#0f1117] dark:text-gray-300">
        <LoadingSpinner size="lg" label="Carregando autenticacao..." />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] p-4 dark:bg-[#0f1117]">
        <ErrorState
          variant="fullpage"
          title="Nao foi possivel verificar sua sessao"
          message={authError}
          onRetry={checkAuth}
        />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#151821', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
      }} />

      <Routes>
        <Route
          path="/login"
          element={!user ? <Login onLogin={(u) => setUser(u)} /> : <Navigate to="/" replace />}
        />

        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
        <Route path="/reset-password" element={!user ? <ResetPassword /> : <Navigate to="/" replace />} />

        <Route
          path="/"
          element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Calendario user={user} />} />
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route
            path="aprovacoes"
            element={
              user?.role === 'secretaria'
                ? <RetornosAprovacao user={user} />
                : (user?.role === 'admin' || user?.role === 'coordenador'
                  ? <Aprovacoes user={user} />
                  : <Navigate to="/" replace />)
            }
          />
          <Route path="retornos-aprovacao" element={<Navigate to="/aprovacoes" replace />} />
          <Route path="perfil" element={<Perfil user={user} onUserUpdate={updateUser} />} />
          <Route path="admin/usuarios" element={user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
