import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
   AlertCircle,
   Bell,
   BellRing,
   Calendar,
   CheckCircle2,
   ChevronRight,
   Clock,
   LayoutDashboard,
   LogOut,
   Menu,
   Plus,
   Tag,
   Users,
   X
} from 'lucide-react';
import api from '../services/api';
import ThemeToggle from './ThemeToggle';

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

   useEffect(() => {
      const handleClickOutside = (event) => {
         if (notifRef.current && !notifRef.current.contains(event.target)) {
            setNotifOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   useEffect(() => {
      setSidebarOpen(false);
   }, [location.pathname, location.search]);

   useEffect(() => {
      const fetchData = async () => {
         try {
            const requests = [
               api.get('/compromissos'),
               api.get('/categorias'),
            ];

            if (user?.role === 'coordenador' || user?.role === 'admin') {
               requests.push(api.get('/compromissos/pendentes'));
            }

            const responses = await Promise.all(requests);
            const evtRes = responses[0];
            const catRes = responses[1];
            const notifsList = [];

            if (responses[2]) {
               const pendentesArr = responses[2].data;
               setPendentesCount(pendentesArr.length);

               if (pendentesArr.length > 0) {
                  notifsList.push({
                     id: 'pendentes_alert',
                     titulo: `Acao necessaria: ha ${pendentesArr.length} compromisso(s) aguardando sua aprovacao.`,
                     tempoStr: 'Pendente',
                     isLida: false,
                     eventoId: null,
                     bgColor: 'bg-uvv-yellow'
                  });
               }
            }

            setCategorias(catRes.data);

            const now = new Date();
            const eventos = evtRes.data;
            let hojeCount = 0;
            let atrasadosCount = 0;
            let semanaCount = 0;
            let nextEvt = null;

            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            eventos.forEach(ev => {
               const inicio = new Date(ev.dt_inicio);
               const hrsDiff = (inicio - now) / (1000 * 60 * 60);
               const isCompleted = ev.titulo.toLowerCase().includes('[ok]');

               if (!isCompleted) {
                  if (inicio.toLocaleDateString() === now.toLocaleDateString()) hojeCount++;
                  if (inicio >= startOfWeek && inicio <= endOfWeek) semanaCount++;
                  if (inicio < now && (now - inicio) < 86400000) atrasadosCount++;

                  if (inicio > now && (!nextEvt || inicio < nextEvt.start)) {
                     nextEvt = { start: inicio, title: ev.titulo };
                  }
               }

               if (inicio < now && !isCompleted && (now - inicio) < 86400000) {
                  notifsList.push({
                     id: `evt_${ev.id}`,
                     eventoId: ev.id,
                     titulo: `Em atraso: "${ev.titulo}" ja deveria ter iniciado.`,
                     tempoStr: 'Atrasado',
                     isLida: false,
                     bgColor: 'bg-red-500',
                     eventoRaw: ev
                  });
               } else if (hrsDiff > 0 && hrsDiff <= 24 && !isCompleted) {
                  notifsList.push({
                     id: `evt_${ev.id}`,
                     eventoId: ev.id,
                     titulo: `Lembrete: "${ev.titulo}" ocorre em aproximadamente ${Math.ceil(hrsDiff)} hora(s).`,
                     tempoStr: 'Em breve',
                     isLida: false,
                     bgColor: 'bg-yellow-500',
                     eventoRaw: ev
                  });
               }
            });

            if (hojeCount > 0) {
               notifsList.unshift({
                  id: 'resumo_hoje',
                  titulo: `Resumo diario: voce tem ${hojeCount} compromisso(s) marcado(s) para hoje.`,
                  tempoStr: 'Agora',
                  isLida: false,
                  eventoId: null,
                  bgColor: 'bg-uvv-yellow'
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
   }, [user?.role]);

   const handleNotifClick = (notif) => {
      setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, isLida: true } : n));
      setNotifOpen(false);
      setSelectedNotif(notif);
   };

   const lerTodas = () => {
      setNotificacoes(prev => prev.map(n => ({ ...n, isLida: true })));
      toast.success('Todas notificacoes marcadas como lidas!');
      setNotifOpen(false);
   };

   const handleCreateGlobal = () => {
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

   const pageMeta = {
      '/': { title: 'Agenda', kicker: 'Calendario institucional', icon: Calendar },
      '/dashboard': { title: 'Meus Compromissos', kicker: 'Sua rotina organizada', icon: LayoutDashboard },
      '/aprovacoes': {
         title: user?.role === 'secretaria' ? 'Aprovacoes' : 'Fila de aprovacao',
         kicker: user?.role === 'secretaria' ? 'Retornos das solicitacoes' : 'Solicitacoes pendentes',
         icon: CheckCircle2
      },
      '/admin/usuarios': { title: 'Usuarios', kicker: 'Gestao administrativa', icon: Users }
   };
   const currentPage = pageMeta[location.pathname] || pageMeta['/'];
   const CurrentIcon = currentPage.icon;
   const unreadNotifsCount = notificacoes.filter(n => !n.isLida).length;

   const navItems = [
      { to: '/', label: 'Agenda', icon: Calendar },
      { to: '/dashboard', label: 'Compromissos', icon: LayoutDashboard },
      ...(user?.role === 'admin' || user?.role === 'coordenador'
         ? [{ to: '/aprovacoes', label: 'Aprovacoes', icon: AlertCircle, count: pendentesCount }]
         : []),
      ...(user?.role === 'secretaria'
         ? [{ to: '/aprovacoes', label: 'Aprovacoes', icon: CheckCircle2 }]
         : []),
      ...(user?.role === 'admin'
         ? [{ to: '/admin/usuarios', label: 'Usuarios', icon: Users }]
         : [])
   ];

   return (
      <div className="flex h-screen overflow-hidden bg-[#f5f7fb] text-gray-900 dark:bg-[#0f1117] dark:text-gray-100">
         {selectedNotif && (
            <div className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white dark:bg-[#171a22] border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                  <button onClick={() => setSelectedNotif(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                     <X size={20} />
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                     <div className={`w-2.5 h-2.5 rounded-full ${selectedNotif.bgColor}`} />
                     <h3 className="text-lg font-semibold text-gray-950 dark:text-white">
                        {selectedNotif.eventoRaw ? 'Detalhes do compromisso' : 'Aviso do sistema'}
                     </h3>
                  </div>

                  {selectedNotif.eventoRaw ? (
                     <div className="space-y-5">
                        <div>
                           <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold mb-1">Titulo</p>
                           <p className="text-base font-semibold text-gray-950 dark:text-white">{selectedNotif.eventoRaw.titulo}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                           <div>
                              <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold mb-1">Inicio</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                 {new Date(selectedNotif.eventoRaw.dt_inicio).toLocaleDateString('pt-BR')} as {new Date(selectedNotif.eventoRaw.dt_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                           <div>
                              <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold mb-1">Termino</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                 {selectedNotif.eventoRaw.dt_fim
                                    ? `${new Date(selectedNotif.eventoRaw.dt_fim).toLocaleDateString('pt-BR')} as ${new Date(selectedNotif.eventoRaw.dt_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                    : 'Nao estipulado'}
                              </p>
                           </div>
                        </div>
                        <p className="text-sm text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-200 p-3 rounded-xl border border-red-100 dark:border-red-500/20">{selectedNotif.titulo}</p>
                        <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-white/10">
                           <button onClick={() => setSelectedNotif(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white font-semibold py-2.5 rounded-xl transition-colors">Fechar</button>
                           {(user?.role === 'admin' || user?.role === 'coordenador') && (
                              <button onClick={() => { setSelectedNotif(null); navigate('/', { state: { editEventId: selectedNotif.eventoId } }); }} className="flex-1 bg-uvv-yellow hover:bg-yellow-400 text-gray-950 font-bold py-2.5 rounded-xl transition-colors">Modificar</button>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">{selectedNotif.titulo}</p>
                        <button onClick={() => {
                           setSelectedNotif(null);
                           navigate(selectedNotif.id === 'pendentes_alert' ? '/aprovacoes' : '/dashboard');
                        }} className="w-full bg-uvv-yellow hover:bg-yellow-400 text-gray-950 font-bold py-2.5 rounded-xl transition-colors">
                           {selectedNotif.id === 'pendentes_alert' ? 'Ir para aprovacoes' : 'Ir para compromissos'}
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}

         {isSidebarOpen && (
            <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-30 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
         )}

         <aside className={`fixed lg:relative z-40 h-full w-[244px] shrink-0 border-r border-gray-200 bg-white/95 backdrop-blur-xl shadow-xl shadow-gray-200/40 transition-transform duration-300 dark:border-white/10 dark:bg-[#13161d]/95 dark:shadow-black/20 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="flex h-full flex-col">
               <div className="px-5 py-5">
                  <div className="flex items-center justify-between">
                     <Link to="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-sm font-black text-uvv-yellow dark:bg-white dark:text-gray-950">UVV</div>
                        <div>
                           <p className="text-sm font800 font-black leading-none tracking-tight text-gray-950 dark:text-white">Agenda</p>
                           <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">Workspace</p>
                        </div>
                     </Link>
                     <button onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                        <X size={18} />
                     </button>
                  </div>
               </div>

               <div className="px-3">
                  <button
                     onClick={handleCreateGlobal}
                     className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
                  >
                     <Plus size={16} />
                     Novo evento
                  </button>

                  <nav className="space-y-1">
                     {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to;
                        return (
                           <Link
                              key={item.to}
                              to={item.to}
                              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive
                                 ? 'bg-amber-50 text-gray-950 ring-1 ring-uvv-yellow/30 dark:bg-uvv-yellow/15 dark:text-white'
                                 : 'text-gray-500 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}
                           >
                              <span className="flex items-center gap-3">
                                 <Icon size={17} className={isActive ? 'text-uvv-yellow' : 'text-gray-400'} />
                                 {item.label}
                              </span>
                              {item.count > 0 && (
                                 <span className="rounded-full bg-uvv-yellow px-2 py-0.5 text-[10px] font-black text-gray-950">{item.count}</span>
                              )}
                           </Link>
                        );
                     })}
                  </nav>
               </div>

               <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4 no-scrollbar">
                  {categorias.length > 0 && (
                     <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                           <Tag size={13} />
                           Categorias
                        </div>
                        <div className="space-y-1">
                           {categorias.map(cat => {
                              const isActive = currentCategory === String(cat.id);
                              return (
                                 <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${isActive ? 'bg-white text-gray-950 shadow-sm dark:bg-white/10 dark:text-white' : 'text-gray-500 hover:bg-white/70 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                 >
                                    <span className="flex min-w-0 items-center gap-2">
                                       <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.cor_hex }} />
                                       <span className="truncate">{cat.nome}</span>
                                    </span>
                                    {isActive && <ChevronRight size={13} className="text-gray-400" />}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                     <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                        <p className="text-lg font-black text-gray-950 dark:text-white">{analytics.semanaCount}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Semana</p>
                     </div>
                     <div className="rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
                        <p className="text-lg font-black text-red-600 dark:text-red-300">{analytics.atrasadosCount}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Atrasos</p>
                     </div>
                  </div>
               </div>

               <div className="border-t border-gray-200 p-3 dark:border-white/10">
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-2 dark:bg-white/5">
                     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-uvv-yellow/20 text-sm font-black text-gray-950 dark:text-uvv-yellow">
                        {user?.nome?.charAt(0) || 'U'}
                     </div>
                     <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{user?.nome}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{user?.role}</p>
                     </div>
                  </div>
                  <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                     <LogOut size={16} />
                     Sair
                  </button>
               </div>
            </div>
         </aside>

         <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="z-20 flex h-[76px] shrink-0 items-center justify-between border-b border-gray-200 bg-[#f5f7fb]/85 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1117]/85 md:px-8">
               <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 lg:hidden">
                     <Menu size={20} />
                  </button>
                  <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm dark:border-white/10 dark:bg-white/5 md:flex">
                     <CurrentIcon size={18} />
                  </div>
                  <div className="min-w-0">
                     <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{currentPage.kicker}</p>
                     <h1 className="truncate text-xl font-semibold tracking-tight text-gray-950 dark:text-white">{currentPage.title}</h1>
                  </div>
                  {currentCategory && (
                     <span className="hidden rounded-full border border-uvv-yellow/40 bg-amber-50 px-2.5 py-1 text-xs font-bold text-gray-800 dark:bg-uvv-yellow/15 dark:text-uvv-yellow md:inline-flex">
                        Filtrado
                     </span>
                  )}
               </div>

               <div className="flex items-center gap-2">
                  <div className="hidden rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300 sm:flex">
                     Hoje: <span className="ml-1 text-gray-950 dark:text-white">{analytics.hojeCount}</span>
                     {analytics.proxHrs && <span className="ml-2 text-uvv-yellow">prox. {analytics.proxHrs}</span>}
                  </div>
                  <ThemeToggle />
                  <div className="relative" ref={notifRef}>
                     <button
                        onClick={() => setNotifOpen(!isNotifOpen)}
                        className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 shadow-sm transition hover:text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
                     >
                        {unreadNotifsCount > 0 ? <BellRing size={20} className="text-uvv-yellow" /> : <Bell size={20} />}
                        {unreadNotifsCount > 0 && (
                           <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 dark:border-[#111827]" />
                        )}
                     </button>

                     {isNotifOpen && (
                        <div className="absolute right-0 top-full z-50 mt-3 flex max-h-[80vh] w-80 origin-top-right animate-fade-in-up flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171a22]">
                           <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
                              <h3 className="text-sm font-bold text-gray-950 dark:text-white">Notificacoes</h3>
                              {unreadNotifsCount > 0 && <span className="rounded-full bg-uvv-yellow px-2 py-1 text-[10px] font-black text-gray-950">{unreadNotifsCount} novas</span>}
                           </div>

                           <div className="min-h-[100px] flex-1 overflow-y-auto no-scrollbar">
                              {notificacoes.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                                    <Bell size={30} className="mb-3 opacity-40" />
                                    <p className="text-sm font-medium">Tudo em dia.</p>
                                 </div>
                              ) : (
                                 notificacoes.map(n => (
                                    <button key={n.id} onClick={() => handleNotifClick(n)} className={`flex w-full items-start gap-3 border-b border-gray-100 px-5 py-4 text-left transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 ${n.isLida ? 'opacity-50' : ''}`}>
                                       <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.bgColor}`} />
                                       <span>
                                          <span className="block text-sm font-medium leading-snug text-gray-700 dark:text-gray-200">{n.titulo}</span>
                                          <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">{n.tempoStr}</span>
                                       </span>
                                    </button>
                                 ))
                              )}
                           </div>

                           {notificacoes.length > 0 && (
                              <div className="shrink-0 border-t border-gray-100 p-3 text-center dark:border-white/10">
                                 <button onClick={lerTodas} className="text-xs font-bold text-gray-500 transition hover:text-gray-950 dark:hover:text-white">Marcar todas como lidas</button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
               <div className="mx-auto w-full max-w-[1440px]">
                  <Outlet />
               </div>
            </div>
         </main>
      </div>
   );
}
