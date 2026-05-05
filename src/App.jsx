import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Calendario from './pages/Calendario';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Aprovacoes from './pages/Aprovacoes';

function App() {
  // Mock auth state until Supabase is integrated
  const [user, setUser] = useState(() => {
    try {
       const saved = localStorage.getItem('usuario_logado');
       return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ 
         style: { background: '#111827', color: '#fff', border: '1px solid #374151' } 
      }} />
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={u => { setUser(u); localStorage.setItem('usuario_logado', JSON.stringify(u)); }} /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} onLogout={() => { setUser(null); localStorage.removeItem('usuario_logado'); }} /> : <Navigate to="/login" />}>
          <Route index element={<Calendario user={user} />} />
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="aprovacoes" element={<Aprovacoes user={user} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
