import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Calendar, LayoutDashboard, LogOut, Menu, X, Bell, BellRing, Plus, Tag, Clock, AlertCircle } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentCategory = searchParams.get('categoria');

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const notifRef = useRef(null);

  const [categorias, setCategorias] = useState([]);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [analytics, setAnalytics] = useState({
     hojeCount: 0,
     proxHrs: null,
     semanaCount: 0,
     atrasadosCount: 0
  });

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
  }, [location.pathname, location.search]);

  // Buscar do backend os eventos, gerar notificações locais e montar Analytics
  useEffect(() => {
    const fetchData = async () => {
      try {
         const requests = [
            api.get('/compromissos'),
            api.get('/categorias')
         ];

         if (user?.role === 'coordenador' || user?.role === 'admin') {
            requests.push(api.get('/compromissos/pendentes'));
         }

         const responses = await Promise.all(requests);
         const evtRes = responses[0];
         const catRes = responses[1];
         
         if (responses[2]) {
            setPendentesCount(responses[2].data.length);
         }

         setCategorias(catRes.data);

         const now = new Date();
         const notifsList = [];
         const eventos = evtRes.data;
         
         let hojeCount = 0;
         let atrasadosCount = 0;
         let semanaCount = 0;
         let nextEvt = null;

         const startOfWeek = new Date(now);
         startOfWeek.setDate(now.getDate() - now.getDay());
         startOfWeek.setHours(0,0,0,0);
         const endOfWeek = new Date(startOfWeek);
         endOfWeek.setDate(startOfWeek.getDate() + 6);
         endOfWeek.setHours(23,59,59,999);

         eventos.forEach(ev => {
            const inicio = new Date(ev.dt_inicio);
            const hrsDiff = (inicio - now) / (1000 * 60 * 60);
            const isCompleted = ev.titulo.toLowerCase().includes('[ok]');

            // Contadores
            if (!isCompleted) {
               if (inicio.toLocaleDateString() === now.toLocaleDateString()) hojeCount++;
               if (inicio >= startOfWeek && inicio <= endOfWeek) semanaCount++;
               if (inicio < now && (now - inicio) < 86400000) atrasadosCount++;
               
               if (inicio > now) {
                  if (!nextEvt || inicio < nextEvt.start) {
                     nextEvt = { start: inicio, title: ev.titulo };
                  }
               }
            }

            // Notificações
            if (inicio < now && !isCompleted && (now - inicio) < 86400000) {
               notifsList.push({
                 id: `evt_${ev.id}`, eventoId: ev.id, titulo: `Em Atraso: "${ev.titulo}" já deveria ter iniciado.`,
                 tempoStr: `Atrasado`, isLida: false, bgColor: 'bg-red-500', eventoRaw: ev
               });
            } else if (hrsDiff > 0 && hrsDiff <= 24 && !isCompleted) {
               notifsList.push({
                 id: `evt_${ev.id}`, eventoId: ev.id, titulo: `Lembrete: "${ev.titulo}" ocorre em aproximadamente ${Math.ceil(hrsDiff)} hora(s).`,
                 tempoStr: 'Em Breve', isLida: false, bgColor: 'bg-yellow-500', eventoRaw: ev
               });
            }
         });

         if (hojeCount > 0) {
            notifsList.unshift({
              id: 'resumo_hoje',
              titulo: `Resumo Diário: Você tem ${hojeCount} compromisso(s) marcado(s) para hoje.`,
              tempoStr: 'Agora Mesmo', isLida: false, eventoId: null, bgColor: 'bg-uvv-yellow'
            });
         }

         let proxHrs = null;
         if (nextEvt) {
            const hrs = (nextEvt.start - now) / (1000 * 60 * 60);
            proxHrs = hrs > 1 ? `${Math.floor(hrs)}h` : 'menos de 1h';
         }

         setNotificacoes(notifsList);
         setAnalytics({ hojeCount, proxHrs, semanaCount, atrasadosCount });

      } catch (err) {
         console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleNotifClick = (notif) => {
     setNotificacoes(prev => prev.map(n => n.id === notif.id ? {...n, isLida: true} : n));
     setNotifOpen(false);
     setSelectedNotif(notif);
  };

  const lerTodas = () => {
     setNotificacoes(prev => prev.map(n => ({...n, isLida: true})));
     toast.success('Todas notificações marcadas como lidas!', { icon: '✅', style: { borderRadius: '10px', background: '#065f46', color: '#fff' }});
     setNotifOpen(false);
  };

  const handleCreateGlobal = () => {
     // Redireciona para o calendário enviando state para abrir modal
     navigate('/', { state: { openCreateModal: true } });
  };

  const toggleCategory = (id) => {
     const params = new URLSearchParams(searchParams);
     if (currentCategory === String(id)) {
        params.delete('categoria');
     } else {
        params.set('categoria', id);
     }
     navigate(`${location.pathname}?${params.toString()}`);
  };

  const unreadNotifsCount = notificacoes.filter(n => !n.isLida).length;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden relative">
      
      {/* Modal de Notificação */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
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
                       <button onClick={() => setSelectedNotif(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition-colors border border-gray-700">Fechar</button>
                       {(user?.role === 'admin' || user?.role === 'coordenador') && (
                         <button onClick={() => { setSelectedNotif(null); navigate('/', { state: { editEventId: selectedNotif.eventoId } }); }} className="flex-1 bg-uvv-yellow hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg transition-colors shadow-lg">Modificar</button>
                       )}
                    </div>
                 </div>
              ) : (
                 <div className="space-y-4">
                     <p className="text-gray-300 bg-gray-950/50 p-4 rounded-lg border border-gray-800">{selectedNotif.titulo}</p>
                     <button onClick={() => { setSelectedNotif(null); navigate('/dashboard'); }} className="w-full mt-2 bg-uvv-yellow hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg transition-colors shadow-lg">Ir para Meus Compromissos</button>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar (SaaS Refactor) */}
      <aside className={`fixed md:relative flex flex-col w-72 h-full bg-gradient-to-b from-[#0B1220] to-[#111827] text-gray-300 border-r border-white/5 shadow-2xl z-40 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 overflow-y-auto no-scrollbar`}>
        
        {/* Cabeçalho */}
        <div className="p-6 shrink-0 relative">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">Agenda<span className="text-uvv-yellow">UVV</span></h1>
              <div className="flex items-center gap-2 mt-2">
                 <div className="w-8 h-8 rounded-full bg-uvv-yellow/10 border border-uvv-yellow/20 flex items-center justify-center text-uvv-yellow font-bold uppercase">{user?.nome?.charAt(0) || 'U'}</div>
                 <div className="flex flex-col">
                    <p className="text-sm text-gray-200 font-medium leading-none truncate max-w-[120px]">{user?.nome}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">{user?.role}</p>
                 </div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-md"><X size={20} /></button>
          </div>
        </div>

        {/* Resumo Inteligente */}
        <div className="px-6 mb-4 shrink-0">
           <div className="bg-white/5 border border-white/5 rounded-xl p-4 shadow-inner">
              <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500 mb-2">Hoje</p>
              <p className="text-sm font-medium text-gray-200">
                 Você tem <span className="text-white font-bold">{analytics.hojeCount}</span> compromissos.
              </p>
              {analytics.proxHrs && (
                 <p className="text-xs text-uvv-yellow mt-1 font-medium flex items-center gap-1.5"><Clock size={12}/> Próximo em {analytics.proxHrs}</p>
              )}
           </div>
        </div>

        {/* Quick Actions */}
        {(user?.role === 'admin' || user?.role === 'coordenador') && (
           <div className="px-6 mb-6 shrink-0">
             <button onClick={handleCreateGlobal} className="w-full bg-uvv-yellow hover:bg-yellow-500 text-[#111827] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-[0_0_15px_rgba(242,178,0,0.2)]">
                <Plus size={18} strokeWidth={3} />
                Novo Compromisso
             </button>
           </div>
        )}

        <div className="flex-1 px-4 space-y-6">
           {/* Seção: Navegação */}
           <div>
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Menu Principal</p>
              <nav className="space-y-1">
                 <Link to="/" className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${location.pathname === '/' ? 'bg-white/10 text-white font-semibold shadow-sm border-l-[3px] border-uvv-yellow' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'}`}>
                    <Calendar size={18} className={location.pathname === '/' ? 'text-uvv-yellow' : 'group-hover:text-gray-300'} />
                    Calendário Geral
                 </Link>
                 <Link to="/dashboard" className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${location.pathname === '/dashboard' ? 'bg-white/10 text-white font-semibold shadow-sm border-l-[3px] border-uvv-yellow' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'}`}>
                    <LayoutDashboard size={18} className={location.pathname === '/dashboard' ? 'text-uvv-yellow' : 'group-hover:text-gray-300'} />
                    Meus Compromissos
                 </Link>
                 {(user?.role === 'admin' || user?.role === 'coordenador') && (
                    <Link to="/aprovacoes" className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${location.pathname === '/aprovacoes' ? 'bg-white/10 text-white font-semibold shadow-sm border-l-[3px] border-uvv-yellow' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'}`}>
                       <div className="flex items-center gap-3">
                          <AlertCircle size={18} className={location.pathname === '/aprovacoes' ? 'text-uvv-yellow' : 'group-hover:text-gray-300'} />
                          Aprovações
                       </div>
                       {pendentesCount > 0 && (
                          <span className="bg-uvv-yellow text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                             {pendentesCount}
                          </span>
                       )}
                    </Link>
                 )}
              </nav>
           </div>

           {/* Seção: Filtro de Categorias */}
           {categorias.length > 0 && (
              <div>
                 <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Filtrar por Categoria</p>
                 <nav className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                    {categorias.map(cat => {
                       const isActive = currentCategory === String(cat.id);
                       return (
                          <button 
                             key={cat.id} 
                             onClick={() => toggleCategory(cat.id)}
                             className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${isActive ? 'bg-white/10 text-white font-bold border-l-[3px]' : 'text-gray-400 hover:bg-white/5 border-l-[3px] border-transparent'}`}
                             style={{ borderLeftColor: isActive ? cat.cor_hex : 'transparent' }}
                          >
                             <div className="flex items-center gap-2 truncate">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.cor_hex }}></div>
                                <span className="truncate">{cat.nome}</span>
                             </div>
                             {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white ml-2"></div>}
                          </button>
                       )
                    })}
                 </nav>
              </div>
           )}

           {/* Seção: Analytics Simples */}
           <div>
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Analytics</p>
              <div className="grid grid-cols-2 gap-2 px-2">
                 <div className="bg-white/5 border border-white/5 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-100">{analytics.semanaCount}</p>
                    <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">Na Semana</p>
                 </div>
                 <div className="bg-red-500/10 border border-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-red-400">{analytics.atrasadosCount}</p>
                    <p className="text-[9px] uppercase tracking-widest text-red-500/80 mt-1">Atrasados</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Rodapé (Logout) */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400/80 hover:text-red-400 transition-colors font-semibold text-sm">
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0B1220] relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-uvv-blue/5 blur-[150px] pointer-events-none z-0 rounded-full"></div>
        
        <header className="bg-transparent px-4 md:px-8 py-5 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
               <Menu size={20} />
             </button>
             <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight truncate flex items-center gap-2">
               {location.pathname === '/' ? 'Calendário' : 'Meus Compromissos'}
               {currentCategory && <span className="bg-uvv-yellow/20 text-uvv-yellow text-xs px-2 py-0.5 rounded-full border border-uvv-yellow/30 align-middle">Filtrado</span>}
             </h2>
          </div>

          {/* Notificações Widget */}
          <div className="relative" ref={notifRef}>
             <button 
               onClick={() => setNotifOpen(!isNotifOpen)} 
               className="p-2.5 relative text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all shadow-sm"
             >
               {unreadNotifsCount > 0 ? <BellRing size={20} className="animate-[wiggle_1s_ease-in-out_infinite] text-uvv-yellow" /> : <Bell size={20} />}
               {unreadNotifsCount > 0 && (
                 <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-gray-900 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
               )}
             </button>

             {/* Dropdown Menu */}
             {isNotifOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-[#111827]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl z-50 animate-fade-in-up origin-top-right overflow-hidden flex flex-col max-h-[80vh]">
                   <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
                     <h3 className="font-bold text-white text-sm">Notificações</h3>
                     {unreadNotifsCount > 0 && <span className="bg-uvv-yellow text-[#111827] text-[10px] font-black px-2 py-1 rounded-md">{unreadNotifsCount} Novas</span>}
                   </div>
                   
                   <div className="overflow-y-auto w-full flex-1 min-h-[100px] no-scrollbar">
                      {notificacoes.length === 0 ? (
                         <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                            <Bell size={32} className="opacity-20 mb-3" />
                            <p className="text-sm font-medium">Você está em dia!</p>
                         </div>
                      ) : (
                         notificacoes.map(n => {
                            if (n.id === 'resumo_hoje') {
                               return (
                                 <div key={n.id} onClick={() => handleNotifClick(n)} className={`px-5 py-6 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex flex-col items-center justify-center text-center ${n.isLida ? 'opacity-50' : 'bg-gradient-to-b from-[#111827] to-[#0B1220]'}`}>
                                    <div className="w-12 h-12 mb-3 rounded-2xl flex items-center justify-center bg-uvv-yellow/10 border border-uvv-yellow/20 shadow-inner">
                                       <Calendar size={22} className="text-uvv-yellow" />
                                    </div>
                                    <p className={`text-sm leading-snug max-w-[220px] ${n.isLida ? 'text-gray-500' : 'text-gray-100 font-bold'}`}>{n.titulo}</p>
                                    <p className="text-[10px] text-uvv-yellow/80 font-bold mt-2 uppercase tracking-widest">{n.tempoStr}</p>
                                 </div>
                               );
                            }
                            return (
                               <div key={n.id} onClick={() => handleNotifClick(n)} className={`px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex items-start gap-3 ${n.isLida ? 'opacity-40' : 'bg-white/[0.02]'}`}>
                                  <div className={`w-2.5 h-2.5 mt-1.5 rounded-full shrink-0 shadow-sm ${n.bgColor}`}></div>
                                  <div>
                                     <p className={`text-sm leading-snug ${n.isLida ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>{n.titulo}</p>
                                     <p className="text-[10px] text-gray-500 font-bold mt-1.5 uppercase tracking-widest">{n.tempoStr}</p>
                                  </div>
                               </div>
                            );
                         })
                      )}
                   </div>

                   {notificacoes.length > 0 && (
                      <div className="p-3 bg-black/20 border-t border-white/5 text-center shrink-0">
                         <button onClick={lerTodas} className="text-xs text-gray-400 font-bold hover:text-white transition-colors">Marcar todas como lidas</button>
                      </div>
                   )}
                </div>
             )}
          </div>
        </header>

        <div className="p-4 md:p-8 md:pt-2 relative z-10 w-full max-w-7xl mx-auto flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
