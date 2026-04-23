import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, LogOut, Menu, X, Bell, BellRing } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Fecha dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
       if (notifRef.current && !notifRef.current.contains(event.target)) {
          setNotifOpen(false);
       }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fechar sidebar mobile ao navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const unreadNotifs = 2; // Mock

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
           className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
           onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative flex flex-col w-64 h-full bg-uvv-blue text-white border-r border-gray-800/50 shadow-2xl z-40 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-uvv-yellow">Agenda UVV</h1>
            <p className="text-sm opacity-80 mt-1">Olá, {user?.nome}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mt-0.5">{user?.role}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
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
      <main className="flex-1 flex flex-col min-w-0 bg-gray-950 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-full h-96 bg-uvv-blue/5 blur-[120px] pointer-events-none z-0"></div>
        
        <header className="bg-gray-900/80 backdrop-blur-md px-4 md:px-8 py-4 shadow-sm border-b border-gray-800 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
               <Menu size={24} />
             </button>
             <h2 className="text-lg md:text-2xl font-bold text-uvv-yellow tracking-tight truncate">
               {location.pathname === '/' ? 'Calendário de Compromissos' : 'Meus Compromissos'}
             </h2>
          </div>

          {/* Notificações Widget */}
          <div className="relative" ref={notifRef}>
             <button 
               onClick={() => setNotifOpen(!isNotifOpen)} 
               className="p-2 relative text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-full transition-all focus:outline-none"
             >
               {unreadNotifs > 0 ? <BellRing size={20} className="animate-[wiggle_1s_ease-in-out_infinite] text-uvv-yellow" /> : <Bell size={20} />}
               {unreadNotifs > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
               )}
             </button>

             {/* Dropdown Menu */}
             {isNotifOpen && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-gray-900 border border-gray-800 shadow-2xl rounded-xl z-50 animate-fade-in-up origin-top-right overflow-hidden">
                   <div className="px-4 py-3 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
                     <h3 className="font-bold text-gray-100 text-sm">Notificações</h3>
                     <span className="bg-uvv-yellow text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{unreadNotifs} Novas</span>
                   </div>
                   <div className="max-h-64 overflow-y-auto w-full">
                      <div className="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer">
                         <div className="flex items-start gap-3">
                            <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full shrink-0"></div>
                            <div>
                               <p className="text-sm text-gray-200 leading-snug">Resumo Diário: Você tem 2 compromissos importantes hoje.</p>
                               <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-widest">Agora Mesmo</p>
                            </div>
                         </div>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-800/30 transition-colors cursor-pointer">
                         <div className="flex items-start gap-3">
                            <div className="w-2 h-2 mt-1.5 bg-yellow-500 rounded-full shrink-0"></div>
                            <div>
                               <p className="text-sm text-gray-200 leading-snug">Conselho da Pós Graduação inicia em <span className="font-bold text-gray-100">1 hora</span>.</p>
                               <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-widest">Há 2 horas</p>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="px-4 py-2 bg-gray-950/80 border-t border-gray-800 text-center">
                      <button className="text-xs text-blue-400 font-semibold hover:text-blue-300">Marcar todas como lidas</button>
                   </div>
                </div>
             )}
          </div>
        </header>

        <div className="p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
