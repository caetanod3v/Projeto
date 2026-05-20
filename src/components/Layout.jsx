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
   LayoutDashboard,
   LogOut,
   Menu,
   Plus,
   Tag,
   UserCircle,
   Users,
   X
} from 'lucide-react';
import api from '../services/api';
import FluxusWordmark from './FluxusWordmark';
import ThemeToggle from './ThemeToggle';

const notificationToneByType = {
   atraso: 'bg-red-500',
   lembrete: 'bg-uvv-yellow',
   aprovacao: 'bg-emerald-500',
   calendar: 'bg-blue-500',
   info: 'bg-uvv-yellow'
};

const formatNotificationTime = (createdAt) => {
   if (!createdAt) return 'Agora';

   const created = new Date(createdAt);
   const diffMs = Date.now() - created.getTime();
   const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

   if (diffMinutes < 1) return 'Agora';
   if (diffMinutes < 60) return `${diffMinutes}min`;

   const diffHours = Math.floor(diffMinutes / 60);
   if (diffHours < 24) return `${diffHours}h`;

   const diffDays = Math.floor(diffHours / 24);
   if (diffDays < 7) return `${diffDays}d`;

   return created.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const normalizeNotification = (notification) => ({
   ...notification,
   isLida: Boolean(notification.lida ?? notification.isLida),
   tempoStr: notification.tempoStr || formatNotificationTime(notification.created_at),
   bgColor: notification.bgColor || notificationToneByType[notification.tipo] || notificationToneByType.info,
   eventoId: notification.referencia_tipo === 'compromisso' ? notification.referencia_id : null
});

export default function Layout({ user, onLogout }) {
   const location = useLocation();
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const currentCategory = searchParams.get('categoria');

   const [isSidebarOpen, setSidebarOpen] = useState(false);
   const [isNotifOpen, setNotifOpen] = useState(false);
   const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
   const [notificacoes, setNotificacoes] = useState([]);
   const [isNotifsLoading, setNotifsLoading] = useState(false);
   const [selectedNotif, setSelectedNotif] = useState(null);
   const notifRef = useRef(null);

   const [categorias, setCategorias] = useState([]);
   const [isCategoriesOpen, setCategoriesOpen] = useState(false);
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
         setNotifsLoading(true);
         try {
            const requests = [
               api.get('/compromissos'),
               api.get('/categorias'),
               api.get('/notificacoes'),
            ];

            if (user?.role === 'coordenador' || user?.role === 'admin') {
               requests.push(api.get('/compromissos/pendentes'));
            }

            const responses = await Promise.all(requests);
            const evtRes = responses[0];
            const catRes = responses[1];
            const notifRes = responses[2];

            if (responses[3]) {
               const pendentesArr = responses[3].data;
               setPendentesCount(pendentesArr.length);
            } else {
               setPendentesCount(0);
            }

            setCategorias(catRes.data);
            setNotificacoes(notifRes.data.map(normalizeNotification));

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
            });

            let proxHrs = null;
            if (nextEvt) {
               const hrs = (nextEvt.start - now) / (1000 * 60 * 60);
               proxHrs = hrs > 1 ? `${Math.floor(hrs)}h` : 'menos de 1h';
            }

            setAnalytics({ hojeCount, proxHrs, semanaCount, atrasadosCount });
         } catch (err) {
            console.error(err);
         } finally {
            setNotifsLoading(false);
         }
      };
      fetchData();
   }, [user?.id, user?.role]);

   const handleNotifClick = async (notif) => {
      if (!notif.isLida) {
         setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, isLida: true, lida: true } : n));
         try {
            await api.patch(`/notificacoes/${notif.id}/lida`);
         } catch (err) {
            console.error(err);
            toast.error('Nao foi possivel marcar a notificacao como lida.');
         }
      }

      setNotifOpen(false);
      setSelectedNotif({ ...notif, isLida: true, lida: true });
   };

   const lerTodas = async () => {
      try {
         await api.patch('/notificacoes/lidas');
         setNotificacoes(prev => prev.map(n => ({ ...n, isLida: true, lida: true })));
         toast.success('Notificacoes marcadas como lidas.');
         setNotifOpen(false);
      } catch (err) {
         console.error(err);
         toast.error('Nao foi possivel atualizar as notificacoes.');
      }
   };

   const removerNotificacao = async (id) => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      try {
         await api.delete(`/notificacoes/${id}`);
      } catch (err) {
         console.error(err);
         toast.error('Nao foi possivel remover a notificacao.');
      }
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
      '/': { title: 'Calendario', kicker: 'Planejamento academico', icon: Calendar },
      '/dashboard': { title: 'Compromissos', kicker: 'Rotina operacional', icon: LayoutDashboard },
      '/aprovacoes': {
         title: user?.role === 'secretaria' ? 'Aprovacoes' : 'Fila de aprovacao',
         kicker: user?.role === 'secretaria' ? 'Retornos das solicitacoes' : 'Governanca de agenda',
         icon: CheckCircle2
      },
      '/perfil': { title: 'Perfil', kicker: 'Configuracoes da conta', icon: UserCircle },
      '/admin/usuarios': { title: 'Usuarios', kicker: 'Controle institucional', icon: Users }
   };
   const currentPage = pageMeta[location.pathname] || pageMeta['/'];
   const CurrentIcon = currentPage.icon;
   const unreadNotifsCount = notificacoes.filter(n => !n.isLida).length;

   const navItems = [
      { to: '/', label: 'Calendario', icon: Calendar },
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

   const unreadNotifications = notificacoes.filter(n => !n.isLida);
   const readNotifications = notificacoes.filter(n => n.isLida);
   const selectedActionPath = selectedNotif?.tipo === 'aprovacao' ? '/aprovacoes' : '/dashboard';
   const selectedActionLabel = selectedNotif?.tipo === 'aprovacao' ? 'Ir para aprovacoes' : 'Ir para compromissos';

   const renderNotificationItem = (n) => (
      <div
         key={n.id}
         className={`group mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-start gap-2 rounded-xl p-3 transition duration-200 ${n.isLida
            ? 'bg-white ring-1 ring-slate-200/80 hover:bg-slate-50 dark:bg-[#141824]/80 dark:ring-white/[0.055] dark:hover:bg-[#181d2a]'
            : 'bg-[#f8fafc] ring-1 ring-slate-200/90 shadow-[0_8px_22px_rgba(15,23,42,0.045)] hover:bg-white hover:ring-slate-300/80 dark:bg-[#1c2231] dark:ring-white/[0.075] dark:shadow-none dark:hover:bg-[#202738]'}`}
      >
         <button onClick={() => handleNotifClick(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.bgColor} ${n.isLida ? 'opacity-45 dark:opacity-50' : 'shadow-[0_0_0_3px_rgba(91,110,225,0.12)] dark:shadow-[0_0_0_3px_rgba(148,163,184,0.10)]'}`} />
            <span className="min-w-0">
               <span className={`block text-sm leading-snug ${n.isLida ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-50'}`}>{n.titulo}</span>
               {n.mensagem && n.mensagem !== n.titulo && (
                  <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{n.mensagem}</span>
               )}
               <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">{n.tempoStr}</span>
            </span>
         </button>
         <button
            type="button"
            onClick={() => removerNotificacao(n.id)}
            className="rounded-lg p-1.5 text-gray-400 opacity-60 transition hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Remover notificacao"
         >
            <X size={13} />
         </button>
      </div>
   );

   return (
      <div className="flex h-screen overflow-hidden bg-[#f7f8fb] text-gray-900">
         {selectedNotif && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm animate-fade-in">
               <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#191d28]">
                  <button onClick={() => setSelectedNotif(null)} className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-white/5">
                     <X size={18} />
                  </button>

                  <div className="mb-6 flex items-center gap-3">
                     <div className={`h-2.5 w-2.5 rounded-full ${selectedNotif.bgColor}`} />
                     <h3 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">
                        {selectedNotif.eventoRaw ? 'Detalhes do compromisso' : 'Aviso do sistema'}
                     </h3>
                  </div>

                  {selectedNotif.eventoRaw ? (
                     <div className="space-y-5">
                        <div>
                           <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Titulo</p>
                           <p className="text-base font-semibold text-gray-950 dark:text-white">{selectedNotif.eventoRaw.titulo}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                           <div>
                              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Inicio</p>
                              <p className="text-sm text-gray-600">
                                 {new Date(selectedNotif.eventoRaw.dt_inicio).toLocaleDateString('pt-BR')} as {new Date(selectedNotif.eventoRaw.dt_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                           <div>
                              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Termino</p>
                              <p className="text-sm text-gray-600">
                                 {selectedNotif.eventoRaw.dt_fim
                                    ? `${new Date(selectedNotif.eventoRaw.dt_fim).toLocaleDateString('pt-BR')} as ${new Date(selectedNotif.eventoRaw.dt_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                    : 'Nao estipulado'}
                              </p>
                           </div>
                        </div>
                        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">{selectedNotif.titulo}</p>
                        <div className="flex gap-3 pt-2">
                           <button onClick={() => setSelectedNotif(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white">Fechar</button>
                           {(user?.role === 'admin' || user?.role === 'coordenador') && (
                              <button onClick={() => { setSelectedNotif(null); navigate('/', { state: { editEventId: selectedNotif.eventoId } }); }} className="flex-1 rounded-xl bg-gray-950 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">Modificar</button>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
                           <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedNotif.titulo}</p>
                           {selectedNotif.mensagem && selectedNotif.mensagem !== selectedNotif.titulo && (
                              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{selectedNotif.mensagem}</p>
                           )}
                        </div>
                        <button onClick={() => {
                           setSelectedNotif(null);
                           navigate(selectedActionPath);
                        }} className="w-full rounded-xl bg-gray-950 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">
                           {selectedActionLabel}
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}

         {isSidebarOpen && (
            <div className="fixed inset-0 z-30 bg-gray-950/35 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
         )}

         {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm animate-fade-in">
               <div className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl ring-1 ring-gray-200/70 animate-fade-in-up dark:bg-[#191d28] dark:ring-white/10">
                  <div className="mb-5 flex items-start gap-3">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                        <LogOut size={18} />
                     </div>
                     <div>
                        <h3 className="text-base font-semibold tracking-tight text-gray-950 dark:text-white">Deseja realmente sair?</h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-300">Voce sera desconectado da sua conta.</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button
                        type="button"
                        onClick={() => setLogoutModalOpen(false)}
                        className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                     >
                        Cancelar
                     </button>
                     <button
                        type="button"
                        onClick={onLogout}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 dark:bg-red-500/15 dark:text-red-100 dark:ring-1 dark:ring-red-400/20 dark:hover:bg-red-500/22"
                     >
                        Sair da conta
                     </button>
                  </div>
               </div>
            </div>
         )}

         <aside className={`fixed z-40 h-full w-[196px] shrink-0 bg-white/80 backdrop-blur-xl transition-transform duration-300 dark:bg-[#191d28]/82 lg:relative ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <div className="flex h-full flex-col">
               <div className="px-4 pb-4 pt-7">
                  <div className="flex items-center justify-center">
                     <Link to="/" className="flex items-center justify-center">
                        <FluxusWordmark className="fluxus-wordmark--sidebar" />
                     </Link>
                     <button onClick={() => setSidebarOpen(false)} className="absolute right-3 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 lg:hidden">
                        <X size={18} />
                     </button>
                  </div>
               </div>

               <div className="mt-3 px-2.5">
                  <button
                     onClick={handleCreateGlobal}
                     className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800"
                  >
                     <Plus size={14} />
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
                              className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition ${isActive
                                 ? 'bg-[#f7f8fc] text-gray-950 shadow-[0_1px_2px_rgba(20,24,36,0.06)] ring-1 ring-gray-200/85 dark:bg-white/10 dark:text-white dark:ring-0'
                                 : 'text-gray-700 hover:bg-[#f8fafc] hover:text-gray-950 hover:shadow-[0_1px_2px_rgba(20,24,36,0.045)] focus-visible:bg-white focus-visible:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvv-yellow/20 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white dark:hover:shadow-none dark:focus-visible:bg-white/5 dark:focus-visible:text-white dark:focus-visible:ring-white/10'}`}
                           >
                              <span className="flex items-center gap-2.5">
                                 <Icon size={15} className={isActive ? 'text-uvv-yellow' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-white'} />
                                 {item.label}
                              </span>
                              {item.count > 0 && (
                                 <span className="rounded-full bg-uvv-yellow px-2 py-0.5 text-[10px] font-semibold text-white">{item.count}</span>
                              )}
                           </Link>
                        );
                     })}
                  </nav>
               </div>

               <div className="mt-4 flex-1 overflow-y-auto px-2.5 pb-3 no-scrollbar">
                  {categorias.length > 0 && (
                     <div className="p-1">
                        <button
                           type="button"
                           onClick={() => setCategoriesOpen(open => !open)}
                           aria-expanded={isCategoriesOpen}
                           className={`group flex w-full items-center justify-between rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvv-yellow/20 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200 dark:hover:shadow-none dark:focus-visible:bg-white/5 dark:focus-visible:text-gray-200 dark:focus-visible:ring-white/10 ${currentCategory
                              ? 'bg-[#f7f8fc] text-gray-700 shadow-[0_1px_2px_rgba(20,24,36,0.05)] ring-1 ring-gray-200/75 dark:bg-transparent dark:text-gray-400 dark:shadow-none dark:ring-0'
                              : 'text-gray-500 hover:bg-[#f8fafc] hover:text-gray-700 hover:shadow-[0_1px_2px_rgba(20,24,36,0.04)]'}`}
                        >
                           <span className="flex items-center gap-2">
                              <Tag size={12} className="text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
                              Categorias
                           </span>
                           <ChevronRight size={13} className={`transition-transform duration-200 ${isCategoriesOpen ? 'rotate-90 text-gray-500 dark:text-gray-200' : ''}`} />
                        </button>

                        {isCategoriesOpen && (
                           <div className="mt-1 space-y-1">
                              {categorias.map(cat => {
                                 const isActive = currentCategory === String(cat.id);
                                 return (
                                    <button
                                       key={cat.id}
                                       onClick={() => toggleCategory(cat.id)}
                                       className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${isActive ? 'bg-[#f7f8fc] text-gray-950 shadow-[0_1px_2px_rgba(20,24,36,0.06)] ring-1 ring-gray-200/80 dark:bg-white/10 dark:text-white dark:ring-0' : 'text-gray-600 hover:bg-[#f8fafc] hover:text-gray-950 hover:shadow-[0_1px_2px_rgba(20,24,36,0.04)] focus-visible:bg-white focus-visible:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvv-yellow/20 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white dark:hover:shadow-none dark:focus-visible:bg-white/5 dark:focus-visible:text-white dark:focus-visible:ring-white/10'}`}
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
                        )}
                     </div>
                  )}
               </div>

               <div className="p-2.5">
                  <Link to="/perfil" className="mb-3 flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvv-yellow/20 dark:hover:bg-white/5 dark:focus-visible:ring-white/10">
                     <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-uvv-yellow/15 text-xs font-semibold text-uvv-yellow">
                        {user?.avatar_url ? (
                           <img src={user.avatar_url} alt="" className="h-full w-full rounded-lg object-cover" />
                        ) : (
                           user?.nome?.charAt(0) || 'U'
                        )}
                     </div>
                     <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-950 dark:text-white">{user?.nome}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">{user?.role}</p>
                     </div>
                  </Link>
                  <button onClick={() => setLogoutModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                     <LogOut size={14} />
                     Sair
                  </button>
               </div>
            </div>
         </aside>

         <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="z-20 flex h-[58px] shrink-0 items-center justify-between bg-[#f7f8fb]/78 px-4 backdrop-blur-xl dark:bg-[#11141d]/78 md:px-6">
               <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setSidebarOpen(true)} className="rounded-xl bg-white p-2 text-gray-500 shadow-sm ring-1 ring-gray-200/70 transition hover:text-gray-950 dark:bg-white/5 dark:ring-white/10 lg:hidden">
                     <Menu size={20} />
                  </button>
                  <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm dark:bg-white/5 md:flex">
                     <CurrentIcon size={16} />
                  </div>
                  <div className="min-w-0">
                     <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{currentPage.kicker}</p>
                     <h1 className="truncate text-base font-semibold tracking-tight text-gray-950 dark:text-white">{currentPage.title}</h1>
                  </div>
                  {currentCategory && (
                     <span className="hidden rounded-full bg-uvv-yellow/10 px-2.5 py-1 text-xs font-semibold text-uvv-yellow md:inline-flex">
                        Filtrado
                     </span>
                  )}
               </div>

               <div className="flex items-center gap-2">
                  <div className="hidden rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 shadow-sm dark:bg-white/5 sm:flex">
                     Hoje: <span className="ml-1 text-gray-950 dark:text-white">{analytics.hojeCount}</span>
                     {analytics.proxHrs && <span className="ml-2 text-uvv-yellow">prox. {analytics.proxHrs}</span>}
                  </div>
                  <ThemeToggle />
                  <div className="relative" ref={notifRef}>
                     <button
                        onClick={() => setNotifOpen(!isNotifOpen)}
                        className="relative rounded-lg bg-white p-2 text-gray-500 shadow-sm transition hover:text-gray-950 dark:bg-white/5"
                     >
                        {unreadNotifsCount > 0 ? <BellRing size={20} className="text-uvv-yellow" /> : <Bell size={20} />}
                        {unreadNotifsCount > 0 && (
                           <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 dark:border-[#11141d]" />
                        )}
                     </button>

                     {isNotifOpen && (
                        <div className="absolute right-0 top-full z-50 mt-3 flex max-h-[80vh] w-80 origin-top-right animate-fade-in-up flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/80 dark:bg-[#101521] dark:ring-white/10">
                           <div className="flex shrink-0 items-center justify-between border-b border-slate-300/75 bg-white px-5 py-4 dark:border-white/[0.06] dark:bg-[#101521]">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notificacoes</h3>
                              {unreadNotifsCount > 0 && (
                                 <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold text-[#3730a3] shadow-[0_1px_2px_rgba(67,56,202,0.10)] ring-1 ring-[#c7d2fe] dark:bg-[#232b3f] dark:text-slate-50 dark:shadow-none dark:ring-white/10">
                                    {unreadNotifsCount} novas
                                 </span>
                              )}
                           </div>

                           <div className="thin-scrollbar min-h-[100px] flex-1 overflow-y-auto py-3">
                              {isNotifsLoading ? (
                                 <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                                    <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-uvv-yellow dark:border-white/10 dark:border-t-uvv-yellow" />
                                    <p className="text-sm font-medium">Carregando notificacoes...</p>
                                 </div>
                              ) : notificacoes.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                                    <Bell size={28} className="mb-3 opacity-40" />
                                    <p className="text-sm font-medium">Tudo em dia.</p>
                                 </div>
                              ) : (
                                 <div>
                                    {unreadNotifications.length > 0 && (
                                       <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-500">
                                          Nao lidas
                                       </div>
                                    )}
                                    {unreadNotifications.map(renderNotificationItem)}

                                    {readNotifications.length > 0 && (
                                       <div className="px-5 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-500">
                                          Lidas
                                       </div>
                                    )}
                                    {readNotifications.map(renderNotificationItem)}
                                 </div>
                              )}
                           </div>

                           {notificacoes.length > 0 && (
                              <div className="shrink-0 border-t border-slate-300/70 bg-white p-3 text-center dark:border-white/[0.06] dark:bg-[#0f1420]">
                                 <button onClick={lerTodas} className="text-xs font-semibold text-gray-600 transition hover:text-gray-950 dark:text-slate-400 dark:hover:text-white">Marcar todas como lidas</button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
               <div className="mx-auto w-full max-w-[1500px]">
                  <Outlet />
               </div>
            </div>
         </main>
      </div>
   );
}
