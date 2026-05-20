import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CalendarDays, CalendarX, CheckCircle2, Clock, Download, Edit, Search, Trash2, Users } from 'lucide-react';
import { differenceInDays, differenceInHours, format, formatDistanceToNow, isSameWeek, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';

function hexToRgba(hex, alpha) {
   if (!hex) return `rgba(55, 65, 81, ${alpha})`;
   const r = parseInt(hex.slice(1, 3), 16);
   const g = parseInt(hex.slice(3, 5), 16);
   const b = parseInt(hex.slice(5, 7), 16);
   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatDuration(start, end) {
   const hrs = Math.abs(differenceInHours(end, start));
   const m = format(start, 'HH:mm');
   if (hrs >= 1) {
      const e = format(end, 'HH:mm');
      return `${m} - ${e} (${hrs}h)`;
   }
   return m;
}

export default function Dashboard({ user }) {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const categoriaFilter = searchParams.get('categoria');

   const [eventos, setEventos] = useState([]);
   const [stats, setStats] = useState({ total: 0, hojeCount: 0, atrasadosCount: 0, proximoEvt: null });
   const [searchTerm, setSearchTerm] = useState('');
   const [filterChip, setFilterChip] = useState('Todos');
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      fetchData();
   }, [categoriaFilter]);

   const fetchData = async () => {
      setIsLoading(true);
      try {
         const [evRes, curRes, catRes] = await Promise.all([
            api.get('/compromissos'),
            api.get('/cursos'),
            api.get('/categorias'),
         ]);

         const cursosMap = {};
         curRes.data.forEach(c => cursosMap[c.id] = c.nome);

         const catMap = {};
         catRes.data.forEach(c => catMap[c.id] = { nome: c.nome, cor_hex: c.cor_hex });

         let rawEvents = evRes.data;
         if (categoriaFilter) {
            rawEvents = rawEvents.filter(ev => String(ev.categoria_id) === String(categoriaFilter));
         }

         const now = new Date();
         const mapped = rawEvents.map(ev => {
            const inicio = new Date(ev.dt_inicio);
            const fim = ev.dt_fim ? new Date(ev.dt_fim) : new Date(inicio.getTime() + 3600000);
            const isCompleted = ev.titulo.toLowerCase().includes('[ok]');
            const isOverdue = !isCompleted && fim < now;

            let group = 'Próximos dias';
            if (isCompleted) group = 'Completos / passados';
            else if (isOverdue) group = 'Atrasados';
            else if (isToday(inicio)) group = 'Hoje';
            else if (isTomorrow(inicio)) group = 'Amanhã';
            else if (inicio < now) group = 'Completos / passados';

            const hrsDiff = differenceInHours(inicio, now);
            const daysDiff = differenceInDays(inicio, now);
            let urgency = 'none';
            if (!isOverdue && !isCompleted && inicio > now) {
               if (hrsDiff <= 24) urgency = 'high';
               else if (daysDiff <= 3) urgency = 'medium';
            }

            let relTime = formatDistanceToNow(inicio, { addSuffix: true, locale: ptBR });
            if (isToday(inicio)) relTime = `Hoje, ${format(inicio, 'HH:mm')}`;
            else if (isTomorrow(inicio)) relTime = `Amanhã, ${format(inicio, 'HH:mm')}`;

            return {
               ...ev,
               inicio,
               fim,
               isOverdue,
               isCompleted,
               group,
               urgency,
               relTime,
               durationStr: formatDuration(inicio, fim),
               catObj: catMap[ev.categoria_id] || { nome: 'Geral', cor_hex: '#374151' },
               cursoStr: cursosMap[ev.curso_id] || 'Geral'
            };
         }).sort((a, b) => b.inicio - a.inicio);

         const futureEvts = mapped.filter(e => !e.isOverdue && !e.isCompleted && e.inicio > now);
         const nextEvt = futureEvts.length > 0 ? futureEvts[futureEvts.length - 1] : null;

         if (nextEvt) {
            const idx = mapped.findIndex(e => e.id === nextEvt.id);
            if (idx !== -1) mapped[idx].isNext = true;
         }

         const hojeCount = mapped.filter(e => isToday(e.inicio) && !e.isOverdue && !e.isCompleted).length;
         const atrasadosCount = mapped.filter(e => e.isOverdue).length;

         setStats({ total: mapped.length, hojeCount, atrasadosCount, proximoEvt: nextEvt });
         setEventos(mapped);
      } catch (err) {
         console.error(err);
         toast.error('Ocorreu um erro ao listar os dados.');
      } finally {
         setIsLoading(false);
      }
   };

   const chips = ['Todos', 'Hoje', 'Essa Semana', 'Atrasados', 'Futuros'];

   const filtered = eventos.filter(ev => {
      if (searchTerm && !ev.titulo.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      const now = new Date();
      if (filterChip === 'Hoje' && (!isToday(ev.inicio) || ev.isCompleted)) return false;
      if (filterChip === 'Essa Semana' && !isSameWeek(ev.inicio, now, { weekStartsOn: 0 })) return false;
      if (filterChip === 'Atrasados' && !ev.isOverdue) return false;
      if (filterChip === 'Futuros' && (ev.isOverdue || ev.isCompleted || ev.inicio < now)) return false;
      return true;
   });

   const grouped = {
      Hoje: [],
      Amanhã: [],
      'Próximos dias': [],
      Atrasados: [],
      'Completos / passados': []
   };

   filtered.forEach(e => {
      if (grouped[e.group]) grouped[e.group].push(e);
   });

   const handleAction = async (ev, action) => {
      const tid = toast.loading('Processando...');
      try {
         if (action === 'delete') {
            await api.delete(`/compromissos/${ev.id}`);
            toast.success('Compromisso excluído.', { id: tid });
            fetchData();
         } else if (action === 'complete') {
            const payload = { ...ev, status: 'concluido' };
            await api.put(`/compromissos/${ev.id}`, payload);
            toast.success('Compromisso concluído.', { id: tid });
            fetchData();
         }
      } catch (e) {
         console.error(e);
         toast.error(e.response?.data?.error || 'Ocorreu um erro na ação.', { id: tid });
      }
   };

   const handleExportCSV = () => {
      if (filtered.length === 0) return toast.error('Nenhum evento na lista para exportar.');
      const tid = toast.loading('Gerando relatório...');
      const headers = ['Título', 'Data Inicio', 'Data Fim', 'Categoria', 'Curso', 'Status'];
      const rows = filtered.map(ev => {
         const titulo = `"${ev.titulo.replace(/"/g, '""')}"`;
         const dtInicio = format(ev.inicio, 'dd/MM/yyyy HH:mm');
         const dtFim = format(ev.fim, 'dd/MM/yyyy HH:mm');
         const cat = `"${ev.catObj.nome}"`;
         const curso = `"${ev.cursoStr}"`;
         const status = ev.isCompleted ? 'Concluido' : (ev.isOverdue ? 'Atrasado' : 'Pendente');
         return [titulo, dtInicio, dtFim, cat, curso, status].join(';');
      });
      const csvContent = [headers.join(';'), ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'relatorio_meridian.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download iniciado!', { id: tid });
   };

   return (
      <div className="min-h-full animate-fade-in text-gray-900 dark:text-gray-100">
         <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
               <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                     <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Operacao</p>
                     <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Meus compromissos</h1>
                     <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {stats.hojeCount > 0 ? `Você tem ${stats.hojeCount} compromisso(s) hoje.` : 'Nenhum compromisso pendente para hoje.'}
                     </p>
                  </div>
                  <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">
                     <Download size={16} /> Relatório
                  </button>
               </div>

               <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                     <CalendarDays size={19} className="mb-3 text-emerald-600 dark:text-emerald-300" />
                     <p className="text-2xl font-black text-gray-950 dark:text-white">{stats.hojeCount}</p>
                     <p className="text-xs font-semibold text-gray-500">Hoje</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                     <AlertTriangle size={19} className="mb-3 text-red-500" />
                     <p className="text-2xl font-black text-gray-950 dark:text-white">{stats.atrasadosCount}</p>
                     <p className="text-xs font-semibold text-gray-500">Atrasados</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                     <Clock size={19} className="mb-3 text-uvv-yellow" />
                     <p className="truncate text-lg font-black text-gray-950 dark:text-white">{stats.proximoEvt ? stats.proximoEvt.relTime : '--'}</p>
                     <p className="text-xs font-semibold text-gray-500">Próximo</p>
                  </div>
               </div>
            </div>

            <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
               <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Próximo na agenda</p>
               {stats.proximoEvt ? (
                  <div className="mt-4 rounded-2xl border p-4" style={{ backgroundColor: hexToRgba(stats.proximoEvt.catObj.cor_hex, 0.08), borderColor: hexToRgba(stats.proximoEvt.catObj.cor_hex, 0.2) }}>
                     <p className="text-base font-semibold text-gray-950 dark:text-white">{stats.proximoEvt.titulo}</p>
                     <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">{stats.proximoEvt.relTime}</p>
                     <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-400">{stats.proximoEvt.cursoStr}</p>
                  </div>
               ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-white/10 dark:bg-white/5">Nenhum evento agendado.</div>
               )}
            </aside>
         </section>

         <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10 md:p-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
               <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {chips.map(c => (
                     <button
                        key={c}
                        onClick={() => setFilterChip(c)}
                        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${filterChip === c
                           ? 'bg-gray-950 text-white'
                           : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'}`}
                     >
                        {c}
                     </button>
                  ))}
               </div>

               <div className="relative w-full lg:w-80">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                     type="text"
                     placeholder="Buscar por título..."
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-950 outline-none transition focus:border-uvv-yellow focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
               </div>
            </div>

            {isLoading && (
               <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-uvv-yellow rounded-full animate-spin mb-4" />
                  <span className="text-gray-400 font-semibold tracking-wide">Carregando compromissos...</span>
               </div>
            )}

            {!isLoading && filtered.length === 0 && (
               <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5 dark:bg-white/5">
                     <CalendarX size={30} className="text-gray-400" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-950 dark:text-white mb-2">Nada encontrado</h4>
                  <p className="text-sm text-gray-500 max-w-sm">Nenhum compromisso corresponde aos filtros atuais.</p>
               </div>
            )}

            {!isLoading && filtered.length > 0 && (
               <div className="space-y-7">
                  {Object.keys(grouped).map(groupName => {
                     const items = grouped[groupName];
                     if (items.length === 0) return null;

                     return (
                        <div key={groupName}>
                           <div className="mb-3 flex items-center gap-3">
                              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{groupName}</h4>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-white/10">{items.length}</span>
                           </div>

                           <div className="space-y-2">
                              {items.map(ev => (
                                 <article key={ev.id} className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 lg:grid-cols-[150px_1fr_auto] lg:items-center">
                                    <div>
                                       <p className={`text-sm font-bold ${ev.isOverdue ? 'text-red-600 dark:text-red-300' : ev.isNext ? 'text-uvv-yellow' : 'text-gray-600 dark:text-gray-300'}`}>{ev.relTime}</p>
                                       <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-500"><Clock size={12} /> {ev.durationStr}</p>
                                    </div>

                                    <div className="min-w-0">
                                       <div className="mb-1 flex flex-wrap items-center gap-2">
                                          <h5 className={`text-base font-semibold ${ev.isCompleted ? 'text-gray-400 line-through' : 'text-gray-950 dark:text-white'}`}>{ev.titulo}</h5>
                                          {ev.isNext && <span className="rounded-full border border-uvv-yellow/30 bg-uvv-yellow/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-uvv-yellow">Em breve</span>}
                                       </div>
                                       <p className="flex items-center gap-2 text-xs font-medium text-gray-500"><Users size={13} /> {ev.cursoStr}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                                       <span
                                          style={{ backgroundColor: hexToRgba(ev.catObj.cor_hex, 0.12), borderColor: hexToRgba(ev.catObj.cor_hex, 0.25), color: ev.catObj.cor_hex }}
                                          className="rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest"
                                       >
                                          {ev.catObj.nome}
                                       </span>

                                       {(user?.role === 'admin' || user?.role === 'coordenador') && (
                                          <div className="flex gap-1">
                                             <button onClick={() => handleAction(ev, 'complete')} title="Concluir" className="rounded-xl p-2 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"><CheckCircle2 size={18} /></button>
                                             <button onClick={() => navigate('/', { state: { editEventId: ev.id } })} title="Editar" className="rounded-xl p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><Edit size={18} /></button>
                                             <button onClick={() => handleAction(ev, 'delete')} title="Excluir" className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 size={18} /></button>
                                          </div>
                                       )}
                                    </div>
                                 </article>
                              ))}
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </section>
      </div>
   );
}
