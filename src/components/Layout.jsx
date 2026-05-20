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
import FluxusWordmark from './FluxusWordmark';
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
                     titulo: `Acao necessaria: ha ${pendentesArr.length} compromisso(s) aguardando aprovacao.`,
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
                     bgColor: 'bg-uvv-yellow',
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
      toast.success('Notificacoes marcadas como lidas.');
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
      '/': { title: 'Calendario', kicker: 'Planejamento academico', icon: Calendar },
      '/dashboard': { title: 'Compromissos', kicker: 'Rotina operacional', icon: LayoutDashboard },
      '/aprovacoes': {
         title: user?.role === 'secretaria' ? 'Aprovacoes' : 'Fila de aprovacao',
         kicker: user?.role === 'secretaria' ? 'Retornos das solicitacoes' : 'Governanca de agenda',
         icon: CheckCircle2
      },
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
                              <button onClick={() => { setSelectedNotif(null); navigate('/', { state: { editEventId: selectedNotif.eventoId } }); }} className="flex-1 rounded-xl bg-gray-950 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950">Modificar</button>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <p className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600 dark:bg-white/5 dark:text-gray-300">{selectedNotif.titulo}</p>
                        <button onClick={() => {
                           setSelectedNotif(null);
                           navigate(selectedNotif.id === 'pendentes_alert' ? '/aprovacoes' : '/dashboard');
                        }} className="w-full rounded-xl bg-gray-950 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950">
                           {selectedNotif.id === 'pendentes_alert' ? 'Ir para aprovacoes' : 'Ir para compromissos'}
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}

         {isSidebarOpen && (
            <div className="fixed inset-0 z-30 bg-gray-950/35 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
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
                     className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-gray-950"
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
                              className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${isActive
                                 ? 'bg-white text-gray-950 shadow-sm dark:bg-white/10 dark:text-white'
                                 : 'text-gray-500 hover:bg-white/60 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}
                           >
                              <span className="flex items-center gap-2.5">
                                 <Icon size={15} className={isActive ? 'text-uvv-yellow' : 'text-gray-400'} />
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
                           className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 transition hover:bg-white/60 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                        >
                           <span className="flex items-center gap-2">
                              <Tag size={12} />
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
                                       className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition ${isActive ? 'bg-white text-gray-950 shadow-sm dark:bg-white/10 dark:text-white' : 'text-gray-500 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-white/5'}`}
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
                  <div className="mb-1.5 flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/60 dark:hover:bg-white/5">
                     <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-uvv-yellow/15 text-xs font-semibold text-uvv-yellow">
                        {user?.nome?.charAt(0) || 'U'}
                     </div>
                     <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-950 dark:text-white">{user?.nome}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">{user?.role}</p>
                     </div>
                  </div>
                  <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
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
                        <div className="absolute right-0 top-full z-50 mt-3 flex max-h-[80vh] w-80 origin-top-right animate-fade-in-up flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/80 dark:bg-[#191d28] dark:ring-white/10">
                           <div className="flex shrink-0 items-center justify-between px-5 py-4">
                              <h3 className="text-sm font-semibold text-gray-950 dark:text-white">Notificacoes</h3>
                              {unreadNotifsCount > 0 && <span className="rounded-full bg-uvv-yellow px-2 py-1 text-[10px] font-semibold text-white">{unreadNotifsCount} novas</span>}
                           </div>

                           <div className="min-h-[100px] flex-1 overflow-y-auto no-scrollbar">
                              {notificacoes.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                                    <Bell size={28} className="mb-3 opacity-40" />
                                    <p className="text-sm font-medium">Tudo em dia.</p>
                                 </div>
                              ) : (
                                 notificacoes.map(n => (
                                    <button key={n.id} onClick={() => handleNotifClick(n)} className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 ${n.isLida ? 'opacity-55' : ''}`}>
                                       <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.bgColor}`} />
                                       <span>
                                          <span className="block text-sm font-medium leading-snug text-gray-700 dark:text-gray-200">{n.titulo}</span>
                                          <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">{n.tempoStr}</span>
                                       </span>
                                    </button>
                                 ))
                              )}
                           </div>

                           {notificacoes.length > 0 && (
                              <div className="shrink-0 border-t border-gray-100 p-3 text-center dark:border-white/10">
                                 <button onClick={lerTodas} className="text-xs font-semibold text-gray-500 transition hover:text-gray-950 dark:hover:text-white">Marcar todas como lidas</button>
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
