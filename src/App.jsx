import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Calendario from './pages/Calendario';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
  // Mock auth state until Supabase is integrated
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />}>
          <Route index element={<Calendario user={user} />} />
          <Route path="dashboard" element={<Dashboard user={user} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
