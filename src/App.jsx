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
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('usuario_logado');
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

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
        logout();
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (loadingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Carregando autenticação...
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#111827', color: '#fff', border: '1px solid #374151' }
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
          <Route path="aprovacoes" element={<Aprovacoes user={user} />} />
          <Route path="admin/usuarios" element={user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;