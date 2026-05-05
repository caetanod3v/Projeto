import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Download, Search, CheckCircle2, Trash2, Edit, Calendar as CalendarIcon, Clock, AlertTriangle, Users, CalendarDays, CalendarX, Sparkles, XCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { isToday, isTomorrow, differenceInHours, differenceInDays, formatDistanceToNow, format, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper para contraste de texto na Badge
function getContrastYIQ(hexcolor) {
   if (!hexcolor) return '#ffffff';
   hexcolor = hexcolor.replace("#", "");
   const r = parseInt(hexcolor.substr(0, 2), 16);
   const g = parseInt(hexcolor.substr(2, 2), 16);
   const b = parseInt(hexcolor.substr(4, 2), 16);
   const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
   return (yiq >= 128) ? '#111827' : '#ffffff';
}

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(55, 65, 81, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
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
   const [pendentes, setPendentes] = useState([]);
   const [stats, setStats] = useState({ total: 0, hojeCount: 0, atrasadosCount: 0, proximoEvt: null });
   const [searchTerm, setSearchTerm] = useState('');
   const [filterChip, setFilterChip] = useState('Todos');
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      fetchData();
   }, [categoriaFilter]);

   const fetchData = async () => {
      try {
         const [evRes, curRes, catRes, pendRes] = await Promise.all([
            api.get('/compromissos'),
            api.get('/cursos'),
            api.get('/categorias'),
            api.get('/compromissos/pendentes')
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
         let mapped = rawEvents.map(ev => {
            const inicio = new Date(ev.dt_inicio);
            const fim = ev.dt_fim ? new Date(ev.dt_fim) : new Date(inicio.getTime() + 3600000);

            // Identificar Status do evento
            let isOverdue = false;
            let isCompleted = ev.titulo.toLowerCase().includes('[ok]'); // mock

            if (!isCompleted && fim < now) {
               isOverdue = true;
            }

            // Definir Grupo da Data
            let group = 'Próximos Dias';
            if (isCompleted) group = 'Completos / Passados';
            else if (isOverdue) group = 'Atrasados';
            else if (isToday(inicio)) group = 'Hoje';
            else if (isTomorrow(inicio)) group = 'Amanhã';
            else if (inicio < now) group = 'Completos / Passados';

            // Urgência (apenas eventos futuros)
            const hrsDiff = differenceInHours(inicio, now);
            const daysDiff = differenceInDays(inicio, now);

            let urgency = 'none';
            if (!isOverdue && !isCompleted && inicio > now) {
               if (hrsDiff <= 24) urgency = 'high';
               else if (daysDiff <= 3) urgency = 'medium';
            }

            // Tempo Relativo
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
         });

         // Ordenar: Eventos mais distantes do futuro ficam no topo, eventos mais próximos perto de hoje
         mapped.sort((a, b) => b.inicio - a.inicio);

         // Descobrir Exatamente o "Próximo" evento (o mais perto de acontecer)
         const futureEvts = mapped.filter(e => !e.isOverdue && !e.isCompleted && e.inicio > now);
         const nextEvt = futureEvts.length > 0 ? futureEvts[futureEvts.length - 1] : null;

         if (nextEvt) {
            const idx = mapped.findIndex(e => e.id === nextEvt.id);
            if (idx !== -1) mapped[idx].isNext = true;
         }

         const hojeCount = mapped.filter(e => isToday(e.inicio) && !e.isOverdue && !e.isCompleted).length;
         const atrasadosCount = mapped.filter(e => e.isOverdue).length;

         const formattedPendentes = pendRes.data.map(ev => {
            const inicio = new Date(ev.dt_inicio);
            const fim = ev.dt_fim ? new Date(ev.dt_fim) : new Date(inicio.getTime() + 3600000);
            return {
               ...ev,
               inicio, fim,
               durationStr: formatDuration(inicio, fim),
               catObj: catMap[ev.categoria_id] || { nome: 'Geral', cor_hex: '#374151' },
               cursoStr: cursosMap[ev.curso_id] || 'Geral'
            };
         });
         
         setPendentes(formattedPendentes);
         setStats({ total: mapped.length, hojeCount, atrasadosCount, proximoEvt: nextEvt });
         setEventos(mapped);

      } catch (err) {
         console.error(err);
         toast.error("Ocorreu um erro ao listar os dados.");
      } finally {
         setIsLoading(false);
      }
   };

   const chips = ['Todos', 'Hoje', 'Essa Semana', 'Atrasados', 'Futuros'];

   // Aplicação dos Filtros
   const filtered = eventos.filter(ev => {
      // Busca Textual
      if (searchTerm && !ev.titulo.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      // Filtros do Chip
      const now = new Date();
      if (filterChip === 'Hoje' && (!isToday(ev.inicio) || ev.isCompleted)) return false;
      if (filterChip === 'Essa Semana' && !isSameWeek(ev.inicio, now, { weekStartsOn: 0 })) return false;
      if (filterChip === 'Atrasados' && !ev.isOverdue) return false;
      if (filterChip === 'Futuros' && (ev.isOverdue || ev.isCompleted || ev.inicio < now)) return false;
      return true;
   });

   // Separar em Grupos Base para o Layout
   const grouped = {
      'Hoje': [],
      'Amanhã': [],
      'Próximos Dias': [],
      'Atrasados': [],
      'Completos / Passados': []
   };

   filtered.forEach(e => {
      if (grouped[e.group]) grouped[e.group].push(e);
   });

   const handleAction = async (ev, action) => {
      let payload = {};
      const tid = toast.loading('Processando...');
      try {
         if (action === 'delete') {
            if (!window.confirm("Deseja realmente remover?")) { toast.dismiss(tid); return; }
            await api.delete(`/compromissos/${ev.id}`);
            toast.success("Compromisso removido.", { id: tid });
         } else if (action === 'complete') {
            payload = { titulo: ev.titulo + ' [OK]' };
            await api.put(`/compromissos/${ev.id}`, payload);
            toast.success("Maravilha! Você concluiu um compromisso.", { id: tid });
         } else if (action === 'approve') {
            await api.patch(`/compromissos/${ev.id}/aprovar`);
            toast.success("Compromisso aprovado com sucesso!", { id: tid });
         } else if (action === 'reject') {
            await api.patch(`/compromissos/${ev.id}/recusar`);
            toast.success("Compromisso recusado.", { id: tid });
         }
         fetchData();
      } catch(e) {
         toast.error("Falha ao processar ação.", { id: tid });
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
      const blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'relatorio_agenda_uvv.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download iniciado!', { id: tid });
   };

   return (
      <div className="min-h-full bg-[#0B1220] p-4 md:p-8 rounded-2xl animate-fade-in text-gray-100 font-sans shadow-2xl">
         
         {/* Bloco Inteligente */}
         <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
               <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                  Meus Compromissos 
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10 text-gray-300">
                     SaaS View
                  </span>
               </h1>
               <p className="text-gray-400 mt-2 text-sm md:text-base font-medium flex items-center gap-2">
                  <Sparkles size={16} className="text-uvv-yellow" />
                  {stats.hojeCount > 0 
                     ? `Você tem ${stats.hojeCount} compromisso(s) pendente(s) hoje.` 
                     : "Você não tem compromissos pendentes para hoje!"}
                  {stats.proximoEvt && (
                     <span className="hidden md:inline">
                        O próximo começa em {formatDistanceToNow(stats.proximoEvt.inicio, { locale: ptBR })}.
                     </span>
                  )}
               </p>
            </div>
            <button onClick={handleExportCSV} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111827]/80 hover:bg-[#1f2937] border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-bold transition-all shadow-sm">
               <Download size={16} /> Relatório
            </button>
         </div>

         {/* Mini Dashboard KPIs */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            
            {/* KPI: Hoje */}
            <div className="bg-[#111827]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.01] transition-transform duration-300">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                     <CalendarDays size={24} className="text-emerald-400" />
                  </div>
                  <div>
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Para Hoje</p>
                     <p className="text-3xl font-black text-white">{stats.hojeCount}</p>
                  </div>
               </div>
            </div>

            {/* KPI: Atrasados */}
            <div className="bg-[#111827]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.01] transition-transform duration-300 relative overflow-hidden">
               {stats.atrasadosCount > 0 && (
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
               )}
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                     <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <div>
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Atrasados</p>
                     <p className="text-3xl font-black text-white">{stats.atrasadosCount}</p>
                  </div>
               </div>
            </div>

            {/* KPI: Próximo Evento */}
            <div 
               className="col-span-1 border rounded-2xl p-6 shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
               style={{
                  background: 'linear-gradient(145deg, #0f172a, #0b1220)',
                  borderColor: stats.proximoEvt ? 'rgba(242, 178, 0, 0.4)' : 'rgba(255,255,255,0.05)'
               }}
            >
               {stats.proximoEvt && <div className="absolute inset-0 bg-uvv-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}
               <div className="relative z-10 flex flex-col justify-center h-full">
                  <div className="flex items-center gap-2 mb-2">
                     <Clock size={16} className={stats.proximoEvt ? "text-uvv-yellow" : "text-gray-600"} />
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Próximo na Agenda</p>
                  </div>
                  {stats.proximoEvt ? (
                     <>
                        <h3 className="text-lg font-bold text-white truncate mb-1">{stats.proximoEvt.titulo}</h3>
                        <p className="text-sm font-medium text-uvv-yellow/90">{stats.proximoEvt.relTime}</p>
                     </>
                  ) : (
                     <p className="text-gray-500 italic mt-1">Nenhum evento agendado.</p>
                  )}
               </div>
            </div>
         </div>

         {/* Área Principal (Filtros e Timeline) */}
         <div className="bg-[#0F172A] border border-gray-800/50 rounded-2xl shadow-2xl p-6 md:p-10 relative">
            
            {/* Ferramentas */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
               
               {/* Chips */}
               <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                  {chips.map(c => (
                     <button
                        key={c}
                        onClick={() => setFilterChip(c)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap 
                        ${filterChip === c 
                           ? 'bg-uvv-yellow text-gray-900 shadow-[0_0_15px_rgba(242,178,0,0.3)]' 
                           : 'bg-[#111827] border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'}`}
                     >
                        {c}
                     </button>
                  ))}
               </div>

               {/* Busca */}
               <div className="relative w-full md:w-80 group">
                  <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-uvv-yellow transition-colors" />
                  <input
                     type="text"
                     placeholder="Buscar por título..."
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className="w-full bg-[#0B1220] border border-gray-800 text-gray-100 text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-uvv-yellow/50 focus:border-uvv-yellow/50 transition-all placeholder-gray-600 shadow-inner"
                  />
               </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
               <div className="absolute inset-0 z-10 bg-[#0F172A]/80 backdrop-blur-sm flex py-32 justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-10 h-10 border-4 border-[#0B1220] border-t-uvv-yellow rounded-full animate-spin"></div>
                     <span className="text-gray-400 font-semibold tracking-wide">Carregando timeline...</span>
                  </div>
               </div>
            )}

            {/* Seção de Aprovações Pendentes */}
            {!isLoading && pendentes.length > 0 && (user?.role === 'coordenador' || user?.role === 'admin') && (
               <div className="mb-12">
                  <h2 className="text-xl font-black text-uvv-yellow mb-6 uppercase tracking-widest flex items-center gap-3">
                     <AlertCircle size={24} />
                     Aprovações Pendentes ({pendentes.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {pendentes.map(ev => (
                        <div key={ev.id} className="relative group bg-[#111827] border border-uvv-yellow/30 rounded-2xl p-5 hover:border-uvv-yellow transition-all duration-300 shadow-lg">
                           <div className="flex justify-between items-start mb-2">
                              <h5 className="text-lg font-bold text-gray-100">{ev.titulo}</h5>
                              <span className="bg-uvv-yellow/20 text-uvv-yellow text-[10px] font-black px-2 py-0.5 rounded-full border border-uvv-yellow/30 uppercase tracking-widest">
                                 Pendente
                              </span>
                           </div>
                           {ev.descricao && <p className="text-sm text-gray-400 mb-4 line-clamp-2">{ev.descricao}</p>}
                           
                           <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mb-6">
                              <div className="flex items-center gap-1.5"><CalendarIcon size={14} className="text-uvv-yellow" /> {format(ev.inicio, 'dd/MM/yyyy')}</div>
                              <div className="flex items-center gap-1.5"><Clock size={14} className="text-uvv-yellow" /> {ev.durationStr}</div>
                              <div className="flex items-center gap-1.5"><Users size={14} className="text-uvv-yellow" /> {ev.cursoStr}</div>
                           </div>

                           <div className="flex gap-3 w-full">
                              <button onClick={() => handleAction(ev, 'approve')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2">
                                 <CheckCircle2 size={16} /> Aprovar
                              </button>
                              <button onClick={() => handleAction(ev, 'reject')} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2">
                                 <XCircle size={16} /> Recusar
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Timeline View */}
            <div className="space-y-14 relative">
               
               {!isLoading && Object.keys(grouped).map(groupName => {
                  const items = grouped[groupName];
                  if (items.length === 0) return null;

                  return (
                     <div key={groupName} className="relative z-0">
                        
                        {/* Seção Header */}
                        <div className="flex items-center gap-4 mb-6">
                           <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">{groupName}</h4>
                           <div className="flex-1 h-px bg-gradient-to-r from-gray-700/50 to-transparent"></div>
                           <span className="text-xs text-gray-500 font-bold bg-[#111827] px-3 py-1 rounded-full border border-gray-800">{items.length}</span>
                        </div>

                        {/* Eventos da Seção */}
                        <div className="relative border-l-2 border-gray-800/80 ml-2 md:ml-4 space-y-8 pb-4">
                           {items.map(ev => {
                              
                              let dotColor = "bg-gray-600";
                              let borderGlow = "border-transparent";
                              let cardBg = "bg-[#111827]/40 hover:bg-[#111827]/80";

                              if (ev.isNext) {
                                 dotColor = "bg-uvv-yellow shadow-[0_0_10px_rgba(242,178,0,0.8)]";
                                 borderGlow = "border-uvv-yellow/40 shadow-[0_0_20px_rgba(242,178,0,0.05)]";
                                 cardBg = "bg-gradient-to-r from-uvv-yellow/5 to-transparent";
                              } else if (ev.urgency === 'high') {
                                 dotColor = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
                                 borderGlow = "border-red-500/20";
                              } else if (ev.urgency === 'medium') {
                                 dotColor = "bg-yellow-600";
                              }

                              return (
                                 <div key={ev.id} className="relative pl-6 md:pl-10 group">
                                    
                                    {/* Bolinha da Timeline */}
                                    <div className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full border-2 border-[#0F172A] ${dotColor} transition-transform duration-300 group-hover:scale-125 z-10`}></div>

                                    {/* Card do Evento */}
                                    <div className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border ${borderGlow} ${cardBg} backdrop-blur-sm transition-all duration-300 transform group-hover:-translate-y-1 group-hover:shadow-xl`}>
                                       
                                       <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                                          
                                          {/* Tempo */}
                                          <div className="flex flex-col min-w-[130px]">
                                             <span className={`text-sm font-bold ${ev.isOverdue ? 'text-red-400' : (ev.isNext ? 'text-uvv-yellow' : 'text-gray-300')}`}>
                                                {ev.relTime}
                                             </span>
                                             <span className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
                                                <Clock size={12} /> {ev.durationStr}
                                             </span>
                                          </div>

                                          {/* Título & Subdetalhes */}
                                          <div className="flex flex-col border-l border-gray-800/50 pl-0 md:pl-6 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0">
                                             <div className="flex items-center gap-3 mb-1.5">
                                                <h5 className={`text-lg font-bold ${ev.isCompleted ? 'text-gray-600 line-through' : 'text-gray-100'} group-hover:text-white transition-colors`}>
                                                   {ev.titulo}
                                                </h5>
                                                {ev.isNext && (
                                                   <span className="bg-uvv-yellow/20 text-uvv-yellow text-[10px] font-black px-2 py-0.5 rounded-full border border-uvv-yellow/30 uppercase tracking-widest shadow-sm">
                                                      Em breve
                                                   </span>
                                                )}
                                             </div>
                                             <p className="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-2">
                                                <Users size={12} /> {ev.cursoStr}
                                             </p>
                                          </div>

                                       </div>

                                       {/* Ações & Badges Direita */}
                                       <div className="flex flex-row-reverse md:flex-row items-center justify-between md:justify-end gap-5 mt-4 md:mt-0 w-full md:w-auto">
                                          
                                          {/* Hover Actions (Desktop Only para não poluir mobile) */}
                                          {(user?.role === 'admin' || user?.role === 'coordenador') && (
                                             <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:translate-x-4 md:group-hover:translate-x-0">
                                                <button onClick={() => handleAction(ev, 'complete')} title="Concluir" className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all"><CheckCircle2 size={18} /></button>
                                                <button onClick={() => navigate('/', { state: { editEventId: ev.id } })} title="Editar" className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"><Edit size={18} /></button>
                                                <button onClick={() => handleAction(ev, 'delete')} title="Excluir" className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                                             </div>
                                          )}

                                          {/* Glass Badge */}
                                          <div 
                                             style={{ backgroundColor: hexToRgba(ev.catObj.cor_hex, 0.15), borderColor: hexToRgba(ev.catObj.cor_hex, 0.3), color: ev.catObj.cor_hex }}
                                             className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border backdrop-blur-md shadow-sm whitespace-nowrap"
                                          >
                                             {ev.catObj.nome}
                                          </div>

                                       </div>

                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  );
               })}

               {/* Empty State */}
               {!isLoading && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                     <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mb-6">
                        <CalendarX size={32} className="text-gray-600" />
                     </div>
                     <h4 className="text-xl font-bold text-gray-300 mb-2">Nada Encontrado</h4>
                     <p className="text-sm text-gray-500 max-w-sm">Nenhum compromisso corresponde aos filtros atuais. Verifique sua busca ou crie um novo evento.</p>
                  </div>
               )}

            </div>
         </div>
      </div>
   );
}
