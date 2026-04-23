import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Calendar, LayoutDashboard, LogOut, Menu, X, Bell, BellRing } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
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

  // Buscar do backend os eventos e gerar notificacoes locais
  useEffect(() => {
    axios.get('https://projeto-0loe.onrender.com/api/compromissos').then(res => {
      const now = new Date();
      const notifsList = [];
      const eventos = res.data;
      
      const hojeCount = eventos.filter(e => new Date(e.dt_inicio).toLocaleDateString() === now.toLocaleDateString()).length;
      if (hojeCount > 0) {
         notifsList.push({
           id: 'resumo_hoje',
           titulo: `Resumo Diário: Você tem ${hojeCount} compromisso(s) marcado(s) para hoje.`,
           tempoStr: 'Agora Mesmo',
           isLida: false,
           eventoId: null,
           bgColor: 'bg-uvv-yellow'
         });
      }

      eventos.forEach(ev => {
         const inicio = new Date(ev.dt_inicio);
         const hrsDiff = (inicio - now) / (1000 * 60 * 60);

         if (inicio < now && !ev.titulo.toLowerCase().includes('[ok]') && (now - inicio) < 86400000) {
            notifsList.push({
              id: `evt_${ev.id}`,
              eventoId: ev.id,
              titulo: `Em Atraso: "${ev.titulo}" já deveria ter iniciado.`,
              tempoStr: `Atrasado`,
              isLida: false,
              bgColor: 'bg-red-500',
              eventoRaw: ev
            });
         } else if (hrsDiff > 0 && hrsDiff <= 24) {
            notifsList.push({
              id: `evt_${ev.id}`,
              eventoId: ev.id,
              titulo: `Lembrete: "${ev.titulo}" ocorre em aproximadamente ${Math.ceil(hrsDiff)} hora(s).`,
              tempoStr: 'Em Breve',
              isLida: false,
              bgColor: 'bg-yellow-500',
              eventoRaw: ev
            });
         }
      });
      setNotificacoes(notifsList);
    }).catch(console.error);
  }, []);

  const handleNotifClick = (notif) => {
     setNotificacoes(prev => prev.map(n => n.id === notif.id ? {...n, isLida: true} : n));
     setNotifOpen(false);
     setSelectedNotif(notif);
  };

  const lerTodas = () => {
     setNotificacoes(prev => prev.map(n => ({...n, isLida: true})));
     toast.success('Todas notificações marcadas como lidas!', {
        icon: '✅',
        style: {
           borderRadius: '10px',
           background: '#065f46',
           color: '#fff',
        },
     });
     setNotifOpen(false);
  };

  const unreadNotifsCount = notificacoes.filter(n => !n.isLida).length;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden relative">
      
      {/* Modal de Detalhes da Notificação */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setSelectedNotif(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
              
              <div className="flex items-center gap-3 mb-6">
                 <div className={`w-3 h-3 rounded-full ${selectedNotif.bgColor}`}></div>
                 <h3 className="text-xl font-bold text-gray-100">{selectedNotif.eventoRaw ? 'Detalhes do Compromisso' : 'Aviso do Sistema'}</h3>
              </div>

              {selectedNotif.eventoRaw ? (
                 <div className="space-y-5">
                    <div>
                       <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Título do Evento</p>
                       <p className="text-lg font-semibold text-gray-100">{selectedNotif.eventoRaw.titulo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-gray-950/50 p-3 rounded-lg border border-gray-800/50">
                       <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Início</p>
                          <p className="text-sm text-gray-300">
                             {new Date(selectedNotif.eventoRaw.dt_inicio).toLocaleDateString('pt-BR')} às {new Date(selectedNotif.eventoRaw.dt_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                          </p>
                       </div>
                       <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Término</p>
                          <p className="text-sm text-gray-300">
                             {selectedNotif.eventoRaw.dt_fim 
                                ? `${new Date(selectedNotif.eventoRaw.dt_fim).toLocaleDateString('pt-BR')} às ${new Date(selectedNotif.eventoRaw.dt_fim).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}` 
                                : 'Não Estipulado'}
                          </p>
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Aviso Original</p>
                       <p className="text-sm text-red-300 bg-red-900/10 p-2 rounded border border-red-500/20">{selectedNotif.titulo}</p>
                    </div>
                    <div className="pt-4 flex gap-3 border-t border-gray-800">
                       <button 
                         onClick={() => setSelectedNotif(null)}
                         className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition-colors border border-gray-700"
                       >
                         Fechar
                       </button>
                       <button 
                         onClick={() => {
                            setSelectedNotif(null);
                            navigate('/', { state: { editEventId: selectedNotif.eventoId } });
                         }}
                         className="flex-1 bg-uvv-yellow hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg transition-colors shadow-lg"
                       >
                         Modificar
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-4">
                     <p className="text-gray-300 bg-gray-950/50 p-4 rounded-lg border border-gray-800">{selectedNotif.titulo}</p>
                     <button 
                      onClick={() => {
                         setSelectedNotif(null);
                         navigate('/dashboard');
                      }}
                      className="w-full mt-2 bg-uvv-yellow hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg transition-colors shadow-lg"
                    >
                      Ir para Meus Compromissos
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}

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
               {unreadNotifsCount > 0 ? <BellRing size={20} className="animate-[wiggle_1s_ease-in-out_infinite] text-uvv-yellow" /> : <Bell size={20} />}
               {unreadNotifsCount > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
               )}
             </button>

             {/* Dropdown Menu */}
             {isNotifOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-gray-900 border border-gray-800 shadow-2xl rounded-xl z-50 animate-fade-in-up origin-top-right overflow-hidden flex flex-col max-h-[80vh]">
                   <div className="px-4 py-3 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center shrink-0">
                     <h3 className="font-bold text-gray-100 text-sm">Notificações</h3>
                     <span className="bg-uvv-yellow text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{unreadNotifsCount} Novas</span>
                   </div>
                   
                   <div className="overflow-y-auto w-full flex-1 min-h-[50px]">
                      {notificacoes.length === 0 ? (
                         <div className="p-4 text-center text-gray-500 text-sm">Nada por aqui!</div>
                      ) : (
                         notificacoes.map(n => {
                            if (n.id === 'resumo_hoje') {
                               return (
                                 <div 
                                    key={n.id} 
                                    onClick={() => handleNotifClick(n)}
                                    className={`px-4 py-5 border-b border-gray-800/50 hover:bg-uvv-blue/10 transition-colors cursor-pointer flex flex-col items-center justify-center text-center ${n.isLida ? 'opacity-50' : 'bg-gradient-to-b from-gray-900 to-gray-950'}`}
                                 >
                                    <div className="w-10 h-10 mb-2 rounded-full flex items-center justify-center bg-gray-950 border border-uvv-yellow shadow-[0_0_10px_rgba(242,178,0,0.1)]">
                                       <Calendar size={18} className="text-uvv-yellow" />
                                    </div>
                                    <p className={`text-sm leading-snug max-w-[200px] ${n.isLida ? 'text-gray-500' : 'text-gray-100 font-bold'}`}>{n.titulo}</p>
                                    <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">{n.tempoStr}</p>
                                 </div>
                               );
                            }

                            return (
                               <div 
                                  key={n.id} 
                                  onClick={() => handleNotifClick(n)}
                                  className={`px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors cursor-pointer flex items-start gap-3 ${n.isLida ? 'opacity-50' : 'bg-gray-800/20'}`}
                               >
                                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.bgColor}`}></div>
                                  <div>
                                     <p className={`text-sm leading-snug ${n.isLida ? 'text-gray-400' : 'text-gray-100 font-medium'}`}>{n.titulo}</p>
                                     <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-widest">{n.tempoStr}</p>
                                  </div>
                               </div>
                            );
                         })
                      )}
                   </div>

                   {notificacoes.length > 0 && (
                      <div className="px-4 py-2 bg-gray-950/80 border-t border-gray-800 text-center shrink-0">
                         <button onClick={lerTodas} className="text-xs text-blue-400 font-semibold hover:text-blue-300">Marcar todas como lidas</button>
                      </div>
                   )}
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
