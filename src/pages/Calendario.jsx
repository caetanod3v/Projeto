import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper de contraste
function getContrastYIQ(hexcolor){
  if (!hexcolor) return '#ffffff';
  hexcolor = hexcolor.replace("#", "");
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#111827' : '#ffffff';
}

// Conversor HEX para RGBA (para backgrounds semi-transparentes)
function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(55, 65, 81, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Calendario({ user }) {
  const [events, setEvents] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tooltip
  const [tooltip, setTooltip] = useState({ open: false, x: 0, y: 0, title: '', timeStr: '', cursoStr: '', catColor: '' });

  // Formulário
  const [titulo, setTitulo] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [horaInicio, setHoraInicio] = useState('12:00');
  const [horaFim, setHoraFim] = useState('13:00');
  const [repeticao, setRepeticao] = useState('nenhuma');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Escuta se ocorreu um redirecionamento vindo do dashboard com ordem pra editar
    if (location.state?.editEventId && events.length > 0) {
      const ev = events.find(e => e.id == location.state.editEventId);
      if (ev) {
        setEditingId(ev.id);
        setTitulo(ev.title);
        
        const startDateObj = new Date(ev.start);
        const endDateObj = ev.end ? new Date(ev.end) : new Date(startDateObj.getTime() + 3600000);
        
        const y = startDateObj.getFullYear();
        const m = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const d = String(startDateObj.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${d}`);

        setHoraInicio(format(startDateObj, 'HH:mm'));
        setHoraFim(format(endDateObj, 'HH:mm'));
        
        setCursoId(ev.extendedProps.curso_id || '');
        setCategoriaId(ev.extendedProps.categoria_id || '');
        setRepeticao(ev.extendedProps.repeticao || 'nenhuma');
        setModalOpen(true);

        // Limpa o state p/ não reabrir o form a cada render
        navigate('/', { replace: true, state: {} });
      }
    }
  }, [location.state, events, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [eventsRes, curRes, catRes] = await Promise.all([
        axios.get('https://projeto-0loe.onrender.com/api/compromissos'),
        axios.get('https://projeto-0loe.onrender.com/api/cursos'),
        axios.get('https://projeto-0loe.onrender.com/api/categorias')
      ]);

      setCursos(curRes.data);
      setCategorias(catRes.data);

      const cursosMap = {};
      curRes.data.forEach(c => cursosMap[c.id] = c.nome);

      const formattedEvents = eventsRes.data.map(ev => {
        const cat = catRes.data.find(c => c.id == ev.categoria_id) || { nome: 'Geral', cor_hex: '#374151' };
        return {
          id: ev.id,
          title: ev.titulo,
          start: ev.dt_inicio,
          end: ev.dt_fim,
          extendedProps: {
             curso_id: ev.curso_id,
             cursoStr: cursosMap[ev.curso_id] || 'Geral',
             categoria_id: ev.categoria_id,
             repeticao: ev.repeticao,
             catObj: cat,
             tColor: getContrastYIQ(cat.cor_hex)
          }
        };
      });
      setEvents(formattedEvents);
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao buscar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalCriacao = (dateStr) => {
    setSelectedDate(dateStr);
    setTitulo('');
    setCursoId('');
    setCategoriaId('');
    setHoraInicio('12:00');
    setHoraFim('13:00');
    setRepeticao('nenhuma');
    setEditingId(null);
    setModalOpen(true);
  };

  const handleDateClick = (arg) => {
    abrirModalCriacao(arg.dateStr);
  };

  const handleEventClick = (arg) => {
    const event = arg.event;
    setEditingId(event.id);
    setTitulo(event.title);
    
    const start = event.start;
    const end = event.end || new Date(start.getTime() + 3600000);
    
    // YYYY-MM-DD local logic robusta
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);

    setHoraInicio(format(start, 'HH:mm'));
    setHoraFim(format(end, 'HH:mm'));
    
    setCursoId(event.extendedProps.curso_id || '');
    setCategoriaId(event.extendedProps.categoria_id || '');
    setRepeticao(event.extendedProps.repeticao || 'nenhuma');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if(!titulo) return toast.error('Insira um título para o compromisso');
    
    // Toast Loading 
    const toastId = toast.loading('Salvando compromisso...');

    const inicioISO = new Date(`${selectedDate}T${horaInicio}:00`).toISOString();
    const fimISO = new Date(`${selectedDate}T${horaFim}:00`).toISOString();

    const payload = {
      titulo, dt_inicio: inicioISO, dt_fim: fimISO, curso_id: cursoId, categoria_id: categoriaId, repeticao
    };

    try {
      if (editingId) {
        await axios.put(`https://projeto-0loe.onrender.com/api/compromissos/${editingId}`, payload);
      } else {
        await axios.post(`https://projeto-0loe.onrender.com/api/compromissos`, payload);
      }
      toast.success('Compromisso salvo com sucesso!', { id: toastId });
      setModalOpen(false);
      fetchData(); 
    } catch (err) {
       console.error(err);
       toast.error('Falha ao salvar evento.', { id: toastId });
    }
  };

  const handleDuplicate = async () => {
      const toastId = toast.loading('Duplicando compromisso...');
      try {
        const inicioISO = new Date(`${selectedDate}T${horaInicio}:00`).toISOString();
        const fimISO = new Date(`${selectedDate}T${horaFim}:00`).toISOString();
        const payload = {
          titulo: titulo + ' (Cópia)', dt_inicio: inicioISO, dt_fim: fimISO, curso_id: cursoId, categoria_id: categoriaId, repeticao
        };
        await axios.post(`https://projeto-0loe.onrender.com/api/compromissos`, payload);
        toast.success('Compromisso duplicado!', { id: toastId });
        setModalOpen(false);
        fetchData();
      } catch (err) {
        toast.error('Erro ao duplicar.', { id: toastId });
      }
  };

  const handleDelete = async () => {
    if (!window.confirm("Excluir este compromisso?")) return;
    const toastId = toast.loading('Excluindo...');
    try {
       await axios.delete(`https://projeto-0loe.onrender.com/api/compromissos/${editingId}`);
       toast.success('Excluído com sucesso.', { id: toastId });
       setModalOpen(false);
       fetchData();
    } catch(err) {
       toast.error('Erro ao excluir evento.', { id: toastId });
    }
  };

  // Customização de Renderização de Evento (Visão Mês e Múltiplos Formatos)
  const renderEventContent = (eventInfo) => {
     const start = eventInfo.event.start;
     const end = eventInfo.event.end || start;
     const { catObj, tColor } = eventInfo.event.extendedProps;
     
     const now = new Date();
     // Check URGENCIA -> < 24h a partir de agora
     const isUrgent = (start > now) && ((start - now) < 86400000);
     const isTodayEvent = start.toLocaleDateString() === now.toLocaleDateString();
     
     // Dinamismo de border
     const borderClass = isTodayEvent ? 'border border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.2)]' 
                        : isUrgent ? 'border border-yellow-500/50' 
                        : 'border border-transparent hover:border-gray-600';

     return (
        <div 
           className={`w-full h-full flex flex-row items-center gap-1.5 px-2 py-0.5 rounded-md cursor-pointer transition-all hover:brightness-110 ${borderClass}`}
           style={{ backgroundColor: hexToRgba(catObj.cor_hex, 0.25) }}
        >
           {/* Mobile: Apenas o Dot | Desktop: Dot ou Tempo */}
           <div 
             className="w-1.5 h-1.5 rounded-full shrink-0 md:hidden"
             style={{ backgroundColor: catObj.cor_hex }} 
           />
           
           {/* Desktop: Renderização Completa */}
           <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0">
             <span className="text-[10px] font-semibold tracking-wider whitespace-nowrap" style={{ color: catObj.cor_hex }}>
                {format(start, 'HH:mm')}
             </span>
             <span className="text-[11px] font-bold text-gray-100 truncate">
                {eventInfo.event.title}
             </span>
           </div>
        </div>
     );
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800 animate-fade-in relative z-0">
      
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
           <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-uvv-blue border-t-uvv-yellow rounded-full animate-spin"></div>
              <span className="text-gray-300 font-medium">Carregando Calendário...</span>
           </div>
        </div>
      )}

      {/* Container FullCalendar */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="80vh"
        locale={ptBR}
        dayMaxEvents={3} // Limita a visualização do dia para 3 eventos
        moreLinkText={(n) => `+${n} mais`} // Customiza '+2 mais'
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventContent={renderEventContent}
        
        // Tooltip Avançado com eventos do Mouse
        eventMouseEnter={(info) => {
          const rect = info.el.getBoundingClientRect();
          const start = info.event.start;
          const end = info.event.end || start;
          const timeFormat = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
          
          setTooltip({
            open: true,
            x: rect.left + (rect.width / 2),
            y: rect.top,
            title: info.event.title,
            timeStr: timeFormat,
            cursoStr: info.event.extendedProps.cursoStr,
            catColor: info.event.extendedProps.catObj.cor_hex
          });
          info.el.removeAttribute('title');
        }}
        eventMouseLeave={() => setTooltip(prev => ({ ...prev, open: false }))}
      />

      {/* Tooltip Glassmorphism flutuante */}
      {tooltip.open && (
        <div 
           className="fixed z-[100] bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full min-w-48 border border-gray-700/50" 
           style={{ left: tooltip.x, top: tooltip.y - 12, transition: 'opacity 0.15s ease' }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tooltip.catColor }}></div>
               <span className="text-gray-300 text-xs font-semibold tracking-wider">{tooltip.timeStr}</span>
            </div>
            <div className="text-gray-100 text-sm font-bold leading-tight">{tooltip.title}</div>
            <div className="text-gray-400 text-xs font-medium">{tooltip.cursoStr}</div>
          </div>
          {/* Arrow / Seta do balão */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-800/90"></div>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 shadow-2xl p-6 rounded-xl w-full max-w-md animate-fade-in-up">
            <div className="flex justify-between items-center mb-5">
               <h3 className="text-xl font-bold text-uvv-yellow">{editingId ? 'Editar Compromisso' : 'Novo Compromisso'}</h3>
               {editingId && (
                 <div className="flex gap-2">
                   <button onClick={handleDuplicate} className="text-sm px-3 py-1.5 bg-blue-500/10 text-blue-400 font-semibold rounded hover:bg-blue-500/20 transition-colors">Duplicar</button>
                   <button onClick={handleDelete} className="text-sm px-3 py-1.5 bg-red-500/10 text-red-500 font-semibold rounded hover:bg-red-500 hover:text-white transition-colors">Excluir</button>
                 </div>
               )}
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Título</label>
                <input value={titulo} onChange={e=>setTitulo(e.target.value)} type="text" className="w-full border border-gray-700 bg-gray-800 text-gray-100 p-2.5 rounded-lg shadow-sm focus:ring-1 focus:ring-uvv-yellow focus:border-transparent transition-all outline-none" placeholder="Ex: Avaliação" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Hora Inicial</label>
                  <input type="time" value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} className="w-full border border-gray-700 bg-gray-800 text-gray-100 p-2.5 rounded-lg shadow-sm focus:ring-1 focus:ring-uvv-yellow transition-all outline-none style-color-scheme-dark" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Hora Final</label>
                  <input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} className="w-full border border-gray-700 bg-gray-800 text-gray-100 p-2.5 rounded-lg shadow-sm focus:ring-1 focus:ring-uvv-yellow transition-all outline-none style-color-scheme-dark" />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Curso</label>
                  <select value={cursoId} onChange={e=>setCursoId(e.target.value)} className="w-full border border-gray-700 bg-gray-800 text-gray-100 p-2.5 rounded-lg shadow-sm focus:ring-1 focus:ring-uvv-yellow transition-all outline-none">
                    <option value="">Geral</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Categoria</label>
                  <select value={categoriaId} onChange={e=>setCategoriaId(e.target.value)} className="w-full border border-gray-700 bg-gray-800 text-gray-100 p-2.5 rounded-lg shadow-sm focus:ring-1 focus:ring-uvv-yellow transition-all outline-none">
                     <option value="">Nenhuma</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Repetição</label>
                <select value={repeticao} onChange={e=>setRepeticao(e.target.value)} className="w-full border border-gray-700 bg-gray-800 text-gray-100 p-2.5 rounded-lg shadow-sm focus:ring-1 focus:ring-uvv-yellow transition-all outline-none">
                  <option value="nenhuma">Nenhuma (Evento Único)</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-800">
                <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-uvv-yellow text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
