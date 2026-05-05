import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import api from '../services/api';
import { format, isToday, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';

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

// Conversor HEX para RGBA
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
  
  // Resumo Inteligente Stats
  const [stats, setStats] = useState({ hoje: 0, proxHrs: null });

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
  const [searchParams] = useSearchParams();
  const categoriaFilter = searchParams.get('categoria');

  useEffect(() => {
    fetchData();
  }, [categoriaFilter]);

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

  useEffect(() => {
    if (location.state?.openCreateModal) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      abrirModalCriacao(`${y}-${m}-${d}`);
      navigate('/', { replace: true, state: {} });
    } else if (location.state?.editEventId && events.length > 0) {
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

        navigate('/', { replace: true, state: {} });
      }
    }
  }, [location.state, events, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [eventsRes, curRes, catRes] = await Promise.all([
        api.get('/compromissos'),
        api.get('/cursos'),
        api.get('/categorias')
      ]);

      setCursos(curRes.data);
      setCategorias(catRes.data);

      const cursosMap = {};
      curRes.data.forEach(c => cursosMap[c.id] = c.nome);

      let hojeCount = 0;
      let nextEvt = null;
      const now = new Date();

      let rawEvents = eventsRes.data;
      if (categoriaFilter) {
         rawEvents = rawEvents.filter(ev => String(ev.categoria_id) === String(categoriaFilter));
      }

      const formattedEvents = rawEvents.map(ev => {
        const dtInicio = new Date(ev.dt_inicio);
        const isCompleted = ev.titulo.toLowerCase().includes('[ok]');
        
        if (isToday(dtInicio) && !isCompleted) {
           hojeCount++;
        }

        if (dtInicio > now && !isCompleted) {
           if (!nextEvt || dtInicio < nextEvt.start) {
              nextEvt = { start: dtInicio, title: ev.titulo };
           }
        }

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
             tColor: getContrastYIQ(cat.cor_hex),
             isCompleted,
             aprovado: ev.aprovado !== false // se undefined, assume true (mocks velhos)
          }
        };
      });
      
      let proxHrs = null;
      if (nextEvt) {
         const hrs = differenceInHours(nextEvt.start, now);
         proxHrs = hrs > 0 ? `${hrs}h` : 'menos de 1h';
      }

      setStats({ hoje: hojeCount, proxHrs });
      setEvents(formattedEvents);
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao buscar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (arg) => {
    if (user?.role !== 'admin' && user?.role !== 'coordenador' && user?.role !== 'secretaria') {
       toast('Sem permissão para criar compromissos.', { icon: '🔒' });
       return;
    }
    abrirModalCriacao(arg.dateStr);
  };

  const handleEventClick = (arg) => {
    const event = arg.event;
    setEditingId(event.id);
    setTitulo(event.title);
    
    const start = event.start;
    const end = event.end || new Date(start.getTime() + 3600000);
    
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
    
    const toastId = toast.loading('Salvando compromisso...');
    const inicioISO = new Date(`${selectedDate}T${horaInicio}:00`).toISOString();
    const fimISO = new Date(`${selectedDate}T${horaFim}:00`).toISOString();

    const payload = {
      titulo, dt_inicio: inicioISO, dt_fim: fimISO, curso_id: cursoId, categoria_id: categoriaId, repeticao,
      usuario_role: user?.role
    };

    try {
      if (editingId) {
        await api.put(`/compromissos/${editingId}`, payload);
      } else {
        await api.post(`/compromissos`, payload);
      }
      toast.success('Compromisso salvo com sucesso!', { id: toastId });
      setModalOpen(false);
      fetchData(); 
    } catch (err) {
       toast.error('Falha ao salvar evento.', { id: toastId });
    }
  };

  const handleDuplicate = async () => {
      const toastId = toast.loading('Duplicando compromisso...');
      try {
        const inicioISO = new Date(`${selectedDate}T${horaInicio}:00`).toISOString();
        const fimISO = new Date(`${selectedDate}T${horaFim}:00`).toISOString();
        const payload = {
          titulo: titulo + ' (Cópia)', dt_inicio: inicioISO, dt_fim: fimISO, curso_id: cursoId, categoria_id: categoriaId, repeticao,
          usuario_role: user?.role
        };
        await api.post(`/compromissos`, payload);
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
       await api.delete(`/compromissos/${editingId}`);
       toast.success('Excluído com sucesso.', { id: toastId });
       setModalOpen(false);
       fetchData();
    } catch(err) {
       toast.error('Erro ao excluir evento.', { id: toastId });
    }
  };

  // Customização de Renderização de Evento Premium SaaS
  const renderEventContent = (eventInfo) => {
     const start = eventInfo.event.start;
     const { catObj, isCompleted, aprovado } = eventInfo.event.extendedProps;
     
     const now = new Date();
     const isUrgent = (start > now) && ((start - now) < 86400000);
     
     // Base style
     let baseBg = `linear-gradient(90deg, ${hexToRgba(catObj.cor_hex, 0.4)} 0%, ${hexToRgba(catObj.cor_hex, 0.1)} 100%)`;
     let borderStyle = `1px solid ${hexToRgba(catObj.cor_hex, 0.2)}`;
     
     if (isCompleted) {
        baseBg = `rgba(255,255,255,0.05)`;
        borderStyle = `1px solid rgba(255,255,255,0.1)`;
     } else if (!aprovado) {
        borderStyle = `1px dashed rgba(242,178,0,0.8)`;
        baseBg = `rgba(242,178,0,0.05)`;
     } else if (isUrgent) {
        borderStyle = `1px solid rgba(242,178,0,0.5)`;
     }

     const displayTitle = !aprovado ? `[Pendente] ${eventInfo.event.title}` : eventInfo.event.title;

     return (
        <div 
           className="w-full h-full flex flex-row items-center gap-2 px-2 py-0.5 rounded-md cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-lg relative overflow-hidden group"
           style={{ background: baseBg, border: borderStyle }}
        >
           {/* Mobile Dot */}
           <div 
             className="w-1.5 h-1.5 rounded-full shrink-0 md:hidden"
             style={{ backgroundColor: isCompleted ? '#6b7280' : catObj.cor_hex }} 
           />
           
           {/* Desktop Content */}
           <div className="hidden md:flex items-center gap-2 flex-1 min-w-0 z-10">
             <span className="text-[10px] font-bold tracking-wider whitespace-nowrap opacity-90" style={{ color: isCompleted ? '#9ca3af' : catObj.cor_hex }}>
                {format(start, 'HH:mm')}
             </span>
             <span className={`text-[11px] font-bold truncate ${isCompleted ? 'text-gray-500 line-through' : (!aprovado ? 'text-uvv-yellow' : 'text-gray-100 group-hover:text-white')}`}>
                {displayTitle}
             </span>
           </div>

           {/* Subtle glow effect on hover */}
           <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-200"></div>
        </div>
     );
  };

  const canEdit = user?.role === 'admin' || user?.role === 'coordenador';
  const isFormDisabled = editingId ? !canEdit : false;

  return (
    <div className="min-h-full animate-fade-in text-gray-100 font-sans p-4 md:p-8">
      
      {/* Bloco Inteligente */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827]/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-uvv-yellow/10 rounded-xl flex items-center justify-center border border-uvv-yellow/20">
              <CalendarIcon size={24} className="text-uvv-yellow" />
           </div>
           <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">Visão Geral <Sparkles size={16} className="text-uvv-yellow" /></h2>
              <p className="text-sm text-gray-400 font-medium mt-0.5">
                 Você tem <span className="text-gray-200 font-bold">{stats.hoje} compromissos</span> hoje.
                 {stats.proxHrs && ` O próximo começa em ${stats.proxHrs}.`}
              </p>
           </div>
        </div>
      </div>

      {/* Container FullCalendar (Glassmorphism) */}
      <div className="bg-[#111827]/60 backdrop-blur-xl border border-white/5 p-4 md:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative z-0">
        
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-[#0B1220]/80 backdrop-blur-sm flex items-center justify-center rounded-3xl">
             <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-[#1f2937] border-t-uvv-yellow rounded-full animate-spin"></div>
                <span className="text-gray-300 font-semibold tracking-wide">Desenhando calendário...</span>
             </div>
          </div>
        )}

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
          height="75vh"
          locale={ptBR}
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} eventos`}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventContent={renderEventContent}
          
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

        {/* Tooltip Premium Glassmorphism */}
        {tooltip.open && (
          <div 
             className="fixed z-[100] bg-[#111827]/95 backdrop-blur-xl text-white px-5 py-4 rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full min-w-56 border border-white/10" 
             style={{ left: tooltip.x, top: tooltip.y - 12, transition: 'opacity 0.2s ease, transform 0.2s ease' }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: tooltip.catColor, color: tooltip.catColor }}></div>
                 <span className="text-gray-300 text-xs font-bold tracking-wider uppercase">{tooltip.timeStr}</span>
              </div>
              <div className="text-gray-50 text-sm font-extrabold leading-tight">{tooltip.title}</div>
              <div className="text-gray-400 text-xs font-medium tracking-wide border-t border-gray-800 pt-2 mt-1">{tooltip.cursoStr}</div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#111827]/95"></div>
          </div>
        )}

        {/* Modal de Criação / Edição (Mantendo design limpo) */}
        {modalOpen && (
          <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-md flex items-center justify-center z-[200]">
            <div className="bg-[#111827] border border-white/10 shadow-2xl p-6 md:p-8 rounded-2xl w-full max-w-md animate-fade-in-up">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-extrabold text-white">{editingId ? (canEdit ? 'Editar Evento' : 'Detalhes do Evento') : 'Novo Evento'}</h3>
                 {editingId && canEdit && (
                   <div className="flex gap-2">
                     <button onClick={handleDuplicate} className="text-sm px-3 py-1.5 bg-blue-500/10 text-blue-400 font-bold rounded-lg hover:bg-blue-500/20 transition-all">Duplicar</button>
                     <button onClick={handleDelete} className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all">Excluir</button>
                   </div>
                 )}
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Título</label>
                  <input value={titulo} disabled={isFormDisabled} onChange={e=>setTitulo(e.target.value)} type="text" className="w-full border border-gray-800 bg-[#0B1220] text-gray-100 p-3 rounded-xl shadow-inner focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-all outline-none disabled:opacity-50" placeholder="Ex: Reunião Pedagógica" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Início</label>
                    <input type="time" disabled={isFormDisabled} value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} className="w-full border border-gray-800 bg-[#0B1220] text-gray-100 p-3 rounded-xl shadow-inner focus:ring-2 focus:ring-uvv-yellow transition-all outline-none style-color-scheme-dark disabled:opacity-50" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fim</label>
                    <input type="time" disabled={isFormDisabled} value={horaFim} onChange={e=>setHoraFim(e.target.value)} className="w-full border border-gray-800 bg-[#0B1220] text-gray-100 p-3 rounded-xl shadow-inner focus:ring-2 focus:ring-uvv-yellow transition-all outline-none style-color-scheme-dark disabled:opacity-50" />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Curso</label>
                    <select value={cursoId} disabled={isFormDisabled} onChange={e=>setCursoId(e.target.value)} className="w-full border border-gray-800 bg-[#0B1220] text-gray-100 p-3 rounded-xl shadow-inner focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50">
                      <option value="">Geral</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Categoria</label>
                    <select value={categoriaId} disabled={isFormDisabled} onChange={e=>setCategoriaId(e.target.value)} className="w-full border border-gray-800 bg-[#0B1220] text-gray-100 p-3 rounded-xl shadow-inner focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50">
                       <option value="">Nenhuma</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Repetição</label>
                  <select value={repeticao} disabled={isFormDisabled} onChange={e=>setRepeticao(e.target.value)} className="w-full border border-gray-800 bg-[#0B1220] text-gray-100 p-3 rounded-xl shadow-inner focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50">
                    <option value="nenhuma">Nenhuma (Evento Único)</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
                
                <div className="flex gap-4 mt-8 pt-6 border-t border-gray-800">
                  <button onClick={() => setModalOpen(false)} className={`px-4 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition-all ${!isFormDisabled ? 'flex-1' : 'w-full'}`}>Cancelar</button>
                  {!isFormDisabled && <button onClick={handleSave} className="flex-1 px-4 py-3 bg-uvv-yellow text-[#111827] font-black rounded-xl hover:bg-yellow-500 shadow-[0_0_15px_rgba(242,178,0,0.3)] transition-all transform hover:-translate-y-0.5">Salvar</button>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
