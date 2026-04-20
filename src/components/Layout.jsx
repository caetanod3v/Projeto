import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, LogOut } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-uvv-blue text-white flex flex-col border-r border-gray-800/50 shadow-2xl z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-uvv-yellow">Agenda UVV</h1>
          <p className="text-sm opacity-80 mt-1">Olá, {user?.nome}</p>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mt-0.5">{user?.role}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link 
            to="/" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${location.pathname === '/' ? 'bg-white/10 text-uvv-yellow font-medium shadow-inner' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
          >
            <Calendar size={20} />
            Calendário
          </Link>
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${location.pathname === '/dashboard' ? 'bg-white/10 text-uvv-yellow font-medium shadow-inner' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            Meus Compromissos
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors text-red-300/80 font-medium"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-950 relative">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-full h-96 bg-uvv-blue/5 blur-[120px] pointer-events-none"></div>
        
        <header className="bg-gray-900/80 backdrop-blur-md px-8 py-5 shadow-sm border-b border-gray-800 flex justify-between items-center sticky top-0 z-20">
          <h2 className="text-2xl font-bold text-uvv-yellow tracking-tight">
            {location.pathname === '/' ? 'Calendário de Compromissos' : 'Meus Compromissos'}
          </h2>
        </header>

        <div className="p-8 relative z-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
