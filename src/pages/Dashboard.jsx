import React, { useState, useEffect } from 'react';
import { Download, Search, CheckCircle2, Trash2, Edit, Calendar as CalendarIcon, Clock, AlertTriangle, Users, CalendarDays } from 'lucide-react';
import axios from 'axios';
import { isToday, isTomorrow, differenceInHours, differenceInDays, formatDistanceToNow, format, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper para contraste de texto na Badge
function getContrastYIQ(hexcolor){
  if (!hexcolor) return '#ffffff';
  hexcolor = hexcolor.replace("#", "");
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#111827' : '#ffffff';
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
  const [eventos, setEventos] = useState([]);
  const [stats, setStats] = useState({ total: 0, hojeCount: 0, atrasadosCount: 0, proximoEvt: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChip, setFilterChip] = useState('Todos'); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [evRes, curRes, catRes] = await Promise.all([
        axios.get('http://localhost:3000/api/compromissos'),
        axios.get('http://localhost:3000/api/cursos'),
        axios.get('http://localhost:3000/api/categorias')
      ]);

      const cursosMap = {};
      curRes.data.forEach(c => cursosMap[c.id] = c.nome);
      
      const catMap = {};
      catRes.data.forEach(c => catMap[c.id] = { nome: c.nome, cor_hex: c.cor_hex });

      const now = new Date();
      let mapped = evRes.data.map(ev => {
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
        if (isToday(inicio)) relTime = `Hoje às ${format(inicio, 'HH:mm')}`;
        else if (isTomorrow(inicio)) relTime = `Amanhã às ${format(inicio, 'HH:mm')}`;

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
      mapped.sort((a,b) => b.inicio - a.inicio);

      // Descobrir Exatamente o "Próximo" evento (o mais perto de acontecer, que agora fica no fim da lista do futuro)
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

  // Separar em Grupos Base para o Layout na ordem em que devem aparecer
  const grouped = {
      'Hoje': [],
      'Amanhã': [],
      'Próximos Dias': [],
      'Atrasados': [],
      'Completos / Passados': []
  };

  filtered.forEach(e => {
     if(grouped[e.group]) grouped[e.group].push(e);
  });

  const handleAction = async (ev, action) => {
     // Funcionalidade Mock - interage visualmente com o evento
     let payload = {};
     if (action === 'delete') {
         if(!window.confirm("Deseja realmente remover?")) return;
         await axios.delete(`http://localhost:3000/api/compromissos/${ev.id}`);
     } else if (action === 'complete') {
         payload = { titulo: ev.titulo + ' [OK]' }; 
         await axios.put(`http://localhost:3000/api/compromissos/${ev.id}`, payload);
     }
     fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Micro Resumo Inteligente (SaaS Vibe) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="col-span-1 lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex gap-8">
               <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-1">Total Hoje</p>
                  <p className="text-3xl font-bold text-gray-100">{stats.hojeCount}</p>
               </div>
               <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-1">Atrasados</p>
                  <p className="text-3xl font-bold text-red-400">{stats.atrasadosCount}</p>
               </div>
            </div>
            {stats.proximoEvt && (
               <div className="hidden md:block text-right border-l border-gray-700 pl-6">
                  <p className="text-xs font-semibold text-uvv-yellow uppercase tracking-widest mb-1 flex items-center justify-end gap-1"><Clock size={12}/> Próximo</p>
                  <p className="text-base font-bold text-gray-100 truncate w-48">{stats.proximoEvt.titulo}</p>
                  <p className="text-xs text-gray-400">{stats.proximoEvt.durationStr}</p>
               </div>
            )}
         </div>

         {/* Actions Widget Lateral */}
         <div className="col-span-1 bg-gradient-to-br from-uvv-blue to-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-center shadow-lg relative overflow-hidden group hover:border-gray-700 transition-colors">
            <h3 className="text-[14px] font-bold text-gray-100 mb-4 z-10 flex items-center gap-2">
              <Download size={16} className="text-uvv-yellow" /> Download Relatório Central
            </h3>
            <button className="z-10 w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-lg text-sm transition-all border border-white/5">
               Exportar Resumo CSV
            </button>
            {/* Efeito abstrato de fundo */}
            <CalendarIcon size={120} className="absolute -right-8 -bottom-8 text-white/[0.02] transform -rotate-12 group-hover:scale-110 transition-transform duration-500" />
         </div>
      </div>

      {/* Painel Principal de Listas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden">
        
        {/* Superior: Ferramentas (Busca e Filtros Chips) */}
        <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
           
           {/* Filtros em Pílulas (SaaS Chips) */}
           <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 overflow-x-auto max-w-full no-scrollbar">
              {chips.map(c => (
                 <button 
                   key={c}
                   onClick={() => setFilterChip(c)}
                   className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${filterChip === c ? 'bg-gray-800 text-uvv-yellow shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                 >
                    {c}
                 </button>
              ))}
           </div>

           {/* Input Moderno */}
           <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Procurar evento..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-gray-950 border border-gray-800 text-gray-100 text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-uvv-yellow focus:border-uvv-yellow outline-none transition-all placeholder-gray-600 shadow-inner" 
              />
           </div>
        </div>

        {/* Listas Agrupadas Dinâmicas */}
        <div className="p-2 md:p-6 space-y-8 bg-gray-950/20">
           {Object.keys(grouped).map(groupName => {
              const items = grouped[groupName];
              if (items.length === 0) return null; // Ignora visualmente os vazios

              let groupIcon = <CalendarDays size={18} className="text-gray-500" />;
              if (groupName === 'Hoje') groupIcon = <Clock size={18} className="text-green-500 animate-pulse" />;
              if (groupName === 'Atrasados') groupIcon = <AlertTriangle size={18} className="text-red-500" />;

              return (
                <div key={groupName} className="animate-fade-in-up">
                   
                   {/* Divider de Título da Seção */}
                   <div className="flex items-center gap-3 mb-4 pl-2">
                       {groupIcon}
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em]">{groupName}</h4>
                       <div className="flex-1 h-px bg-gradient-to-r from-gray-800 to-transparent ml-2"></div>
                       <span className="text-xs text-gray-600 font-bold bg-gray-900 px-2 rounded-full border border-gray-800">{items.length}</span>
                   </div>

                   {/* Cards dos Compromissos */}
                   <div className="space-y-2">
                      {items.map(ev => {
                         // Classes dinâmicas baseadas na urgência (<24h / <3 dias) e 'PRÓXIMO'
                         let cardBorderClass = "border-gray-800/80";
                         let pulseEffect = "";

                         if (ev.isNext) {
                            cardBorderClass = "border-uvv-yellow bg-gray-800/50 shadow-[0_0_15px_rgba(242,178,0,0.06)]";
                         } else if (ev.urgency === 'high') {
                            cardBorderClass = "border-l-4 border-l-red-500/60 border-t-transparent border-b-transparent border-r-transparent bg-gray-900";
                            pulseEffect = "animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]";
                         } else if (ev.urgency === 'medium') {
                            cardBorderClass = "border-l-4 border-l-yellow-600/50 border-t-transparent border-b-transparent border-r-transparent bg-gray-900";
                         } else {
                            cardBorderClass = "border border-gray-800 bg-gray-900";
                         }

                         return (
                           <div key={ev.id} className={`group relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl hover:bg-gray-800 transition-all duration-200 overflow-hidden ${cardBorderClass} ${pulseEffect}`}>
                              
                              <div className="flex flex-col md:flex-row md:items-center gap-4">
                                 {/* Time Block Dinâmico */}
                                 <div className="flex flex-col items-start min-w-[140px]">
                                    <span className={`text-sm font-bold truncate ${ev.isOverdue ? 'text-red-400' : (ev.isNext ? 'text-uvv-yellow' : 'text-gray-300')}`}>
                                       {ev.relTime}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium tracking-wide mt-0.5">{ev.durationStr}</span>
                                 </div>

                                 {/* Titulo e Detalhes */}
                                 <div className="flex flex-col border-l-2 border-gray-800 pl-4">
                                     <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h5 className={`text-base font-semibold ${ev.isCompleted ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-100'} transition-colors group-hover:text-white`}>
                                           {ev.titulo}
                                        </h5>
                                        {ev.isNext && (
                                           <span className="bg-uvv-yellow text-[9px] text-gray-900 font-extrabold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">PRÓXIMO</span>
                                        )}
                                     </div>
                                     <p className="text-xs text-gray-400 font-medium">{ev.cursoStr}</p>
                                 </div>
                              </div>

                              {/* Badges e Ações Hover do canto direito */}
                              <div className="flex items-center gap-4 mt-3 md:mt-0 max-w-full overflow-hidden">
                                 
                                 {/* Tag Colorida do Tipo de Evento */}
                                 <span 
                                    style={{ backgroundColor: ev.catObj.cor_hex, color: ev.tColor }} 
                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-white/5 whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity"
                                 >
                                    {ev.catObj.nome}
                                 </span>
                                 
                                 {/* Hover Actions -> Só aparecem quando paira o mouse (ou toque no tel) */}
                                 <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:translate-x-4 md:group-hover:translate-x-0 flex gap-2 shrink-0">
                                    <button 
                                      title="Concluir" 
                                      onClick={() => handleAction(ev, 'complete')}
                                      className="p-2 text-gray-400 hover:text-green-400 bg-gray-950 rounded-lg border border-gray-800 hover:border-green-500/50 transition-colors shadow-sm"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button 
                                       title="Editar"
                                       className="p-2 text-gray-400 hover:text-blue-400 bg-gray-950 rounded-lg border border-gray-800 hover:border-blue-500/50 transition-colors shadow-sm"
                                    >
                                       <Edit size={16} />
                                    </button>
                                    <button 
                                       title="Excluir"
                                       onClick={() => handleAction(ev, 'delete')}
                                       className="p-2 text-gray-400 hover:text-red-400 bg-gray-950 rounded-lg border border-gray-800 hover:border-red-500/50 transition-colors shadow-sm"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>

                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>
              );
           })}
           
           {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-900 border border-dashed border-gray-800 rounded-xl">
                 <CalendarDays size={48} className="text-gray-700 mb-4" />
                 <h4 className="text-gray-400 font-semibold mb-1">Nada por aqui</h4>
                 <p className="text-sm text-gray-500">Nenhum compromisso condizente com as regras e filtros atuais.</p>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}
