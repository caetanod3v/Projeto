import React, { useRef, useState, useEffect } from 'react';
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
import { CalendarDays, Clock, Copy, Plus, Tag, Trash2, X } from 'lucide-react';

// Helper de contraste
function getContrastYIQ(hexcolor) {
  if (!hexcolor) return '#ffffff';
  hexcolor = hexcolor.replace("#", "");
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
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
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [calendarView, setCalendarView] = useState('dayGridMonth');

  // Resumo Inteligente Stats
  const [stats, setStats] = useState({ hoje: 0, proxHrs: null });
  const [googleCalendar, setGoogleCalendar] = useState({
    connected: false,
    configured: true,
    loading: user?.role === 'coordenador',
    busy: false,
  });

  // Tooltip
  const [tooltip, setTooltip] = useState({ open: false, x: 0, y: 0, title: '', timeStr: '', cursoStr: '', catColor: '' });

  // Formulário
  const [titulo, setTitulo] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [form, setForm] = useState({ coordenador_id: '' });
  const [categoriaId, setCategoriaId] = useState('');
  const [horaInicio, setHoraInicio] = useState('12:00');
  const [horaFim, setHoraFim] = useState('13:00');
  const [repeticao, setRepeticao] = useState('nenhuma');

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoriaFilter = searchParams.get('categoria');

  const fetchGoogleCalendarStatus = async () => {
    if (user?.role !== 'coordenador') return;

    try {
      const res = await api.get('/google-calendar/status');
      setGoogleCalendar(prev => ({
        ...prev,
        connected: Boolean(res.data.connected),
        configured: res.data.configured !== false,
        loading: false,
      }));
    } catch (err) {
      setGoogleCalendar(prev => ({ ...prev, loading: false, configured: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoriaFilter]);

  useEffect(() => {
    fetchGoogleCalendarStatus();
  }, [user?.role]);

  useEffect(() => {
    const googleCalendarResult = searchParams.get('googleCalendar');
    if (!googleCalendarResult) return;

    if (googleCalendarResult === 'connected') {
      toast.success('Google Calendar conectado.');
      fetchGoogleCalendarStatus();
    } else {
      toast.error('Nao foi possivel conectar o Google Calendar.');
    }

    const params = new URLSearchParams(searchParams);
    params.delete('googleCalendar');
    const query = params.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [searchParams, location.pathname, navigate]);

  const abrirModalCriacao = (dateStr) => {
    setSelectedDate(dateStr);
    setTitulo('');
    setCursoId('');
    setForm({ coordenador_id: '' });
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
        setForm({ coordenador_id: ev.extendedProps.coordenador_id || '' });
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
      const [eventsRes, curRes, catRes, coordRes] = await Promise.all([
        api.get('/compromissos'),
        api.get('/cursos'),
        api.get('/categorias'),
        api.get('/coordenadores'),
      ]);

      setCursos(curRes.data);
      setCategorias(catRes.data);
      setCoordenadores(coordRes.data);

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
            coordenador_id: ev.coordenador_id,
            cursoStr: cursosMap[ev.curso_id] || 'Geral',
            categoria_id: ev.categoria_id,
            repeticao: ev.repeticao,
            catObj: cat,
            tColor: getContrastYIQ(cat.cor_hex),
            isCompleted
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
      toast.error('Sem permissao para criar compromissos.');
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
    setForm({ coordenador_id: event.extendedProps.coordenador_id || '' });
    setCategoriaId(event.extendedProps.categoria_id || '');
    setRepeticao(event.extendedProps.repeticao || 'nenhuma');
    setModalOpen(true);
  };

  const handleCoordenadorChange = (value) => {
    setForm(prev => ({ ...prev, coordenador_id: value }));
    const coordenador = coordenadores.find(c => String(c.id) === String(value));
    if (coordenador?.curso_id) {
      setCursoId(String(coordenador.curso_id));
    }
  };

  const handleSave = async () => {
    if (!titulo) return toast.error('Insira um titulo para o compromisso');
    if (!editingId && user?.role === 'secretaria' && !form.coordenador_id) {
      return toast.error('Selecione o coordenador responsavel.');
    }

    const toastId = toast.loading('Salvando compromisso...');
    const inicioISO = new Date(`${selectedDate}T${horaInicio}:00`).toISOString();
    const fimISO = new Date(`${selectedDate}T${horaFim}:00`).toISOString();

    const payload = {
      titulo, dt_inicio: inicioISO, dt_fim: fimISO, curso_id: cursoId, categoria_id: categoriaId, repeticao,
      coordenador_id: form.coordenador_id,
      usuario_role: user?.role
    };

    try {
      if (editingId) {
        await api.put(`/compromissos/${editingId}`, payload);
        toast.success('Compromisso salvo com sucesso!', { id: toastId });
      } else {
        await api.post(`/compromissos`, payload);
        if (user?.role === 'secretaria') {
          toast.success('Compromisso enviado para aprovacao do coordenador.', { id: toastId });
        } else {
          toast.success('Compromisso criado com sucesso!', { id: toastId });
        }
      }
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
        titulo: titulo + ' (Copia)', dt_inicio: inicioISO, dt_fim: fimISO, curso_id: cursoId, categoria_id: categoriaId, repeticao,
        coordenador_id: form.coordenador_id,
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
      toast.success('Excluido com sucesso.', { id: toastId });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Erro ao excluir evento.', { id: toastId });
    }
  };

  // Customização de Renderização de Evento Premium SaaS
  const renderEventContent = (eventInfo) => {
    const start = eventInfo.event.start;
    const { catObj, isCompleted } = eventInfo.event.extendedProps;

    const now = new Date();
    const isUrgent = (start > now) && ((start - now) < 86400000);

    let baseBg = hexToRgba(catObj.cor_hex, 0.095);
    let borderStyle = `1px solid transparent`;

    if (isCompleted) {
      baseBg = `rgba(107,114,128,0.08)`;
      borderStyle = `1px solid transparent`;
    } else if (isUrgent) {
      borderStyle = `1px solid rgba(91,110,225,0.18)`;
    }

    return (
      <div
        className="group relative flex h-full w-full cursor-pointer flex-row items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-sm"
        style={{ background: baseBg, border: borderStyle }}
      >
        {/* Mobile Dot */}
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0 md:hidden"
          style={{ backgroundColor: isCompleted ? '#6b7280' : catObj.cor_hex }}
        />

        {/* Desktop Content */}
        <div className="hidden md:flex items-center gap-2 flex-1 min-w-0 z-10">
          <span className="whitespace-nowrap text-[9px] font-semibold tracking-wide opacity-90" style={{ color: isCompleted ? '#9ca3af' : catObj.cor_hex }}>
            {format(start, 'HH:mm')}
          </span>
          <span className={`truncate text-[10px] font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800 group-hover:text-gray-950'}`}>
            {eventInfo.event.title}
          </span>
        </div>

        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-30"></div>
      </div>
    );
  };

  const canEdit = user?.role === 'admin' || user?.role === 'coordenador';
  const isFormDisabled = editingId ? !canEdit : false;
  const isSecretaria = user?.role === 'secretaria';
  const upcomingEvents = events
    .filter(ev => new Date(ev.start) >= new Date() && !ev.extendedProps.isCompleted)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 5);
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
  const canCreate = user?.role === 'admin' || user?.role === 'coordenador' || user?.role === 'secretaria';
  const calendarApi = () => calendarRef.current?.getApi();
  const changeCalendarView = (view) => {
    calendarApi()?.changeView(view);
    setCalendarView(view);
  };

  const handleGoogleCalendarConnect = async () => {
    setGoogleCalendar(prev => ({ ...prev, busy: true }));
    try {
      const res = await api.get('/google-calendar/auth');
      window.location.href = res.data.authUrl;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Nao foi possivel iniciar conexao com Google Calendar.');
      setGoogleCalendar(prev => ({ ...prev, busy: false }));
    }
  };

  const handleGoogleCalendarDisconnect = async () => {
    setGoogleCalendar(prev => ({ ...prev, busy: true }));
    try {
      await api.delete('/google-calendar/disconnect');
      setGoogleCalendar(prev => ({ ...prev, connected: false, busy: false }));
      toast.success('Google Calendar desconectado.');
    } catch (err) {
      toast.error('Nao foi possivel desconectar o Google Calendar.');
      setGoogleCalendar(prev => ({ ...prev, busy: false }));
    }
  };

  return (
    <div className="min-h-full animate-fade-in text-gray-900 dark:text-gray-100">
      <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">Calendario academico</h2>
          <p className="mt-1 text-xs text-gray-500">
            {stats.proxHrs ? `Proximo evento em ${stats.proxHrs}.` : 'Nenhum evento imediato.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200/60 dark:bg-white/5 dark:ring-white/10">
            {[
              ['dayGridMonth', 'Mes'],
              ['timeGridWeek', 'Semana'],
              ['timeGridDay', 'Dia'],
              ['listWeek', 'Lista'],
            ].map(([view, label]) => (
              <button
                key={view}
                onClick={() => changeCalendarView(view)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${calendarView === view ? 'bg-gray-950 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-950 dark:hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {canCreate && (
            <button
              onClick={() => {
                const d = new Date();
                abrirModalCriacao(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800"
            >
              <Plus size={14} />
              Novo evento
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_286px]">
        <div className="relative z-0 overflow-hidden rounded-[18px] bg-white p-3 shadow-sm ring-1 ring-gray-200/50 dark:bg-[#191d28] dark:ring-white/10 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => calendarApi()?.prev()} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-950 dark:bg-white/5 dark:hover:bg-white/10">{'<'}</button>
              <button onClick={() => calendarApi()?.next()} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-950 dark:bg-white/5 dark:hover:bg-white/10">{'>'}</button>
              <button onClick={() => calendarApi()?.today()} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-950 dark:bg-white/5 dark:hover:bg-white/10">Hoje</button>
            </div>
            <h3 className="text-sm font-semibold capitalize tracking-tight text-gray-950 dark:text-white">{calendarTitle}</h3>
          </div>

        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[18px] bg-white/80 backdrop-blur-sm dark:bg-[#0f1117]/80">
            <div className="flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-uvv-yellow"></div>
              <span className="text-xs font-medium tracking-wide text-gray-500">Carregando calendario...</span>
            </div>
          </div>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          buttonText={{
            today: 'Hoje',
            month: 'Mes',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista'
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="calc(100vh - 188px)"
          locale={ptBR}
          dayMaxEvents={2}
          moreLinkText={(n) => `+${n} eventos`}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventContent={renderEventContent}
          datesSet={(arg) => {
            setCalendarTitle(arg.view.title);
            setCalendarView(arg.view.type);
          }}

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
        </div>

        <aside className="grid content-start gap-3">
          {user?.role === 'coordenador' && (
            <div className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-gray-200/50 dark:bg-[#191d28] dark:ring-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-950 dark:text-white">Google Calendar</p>
                  <p className="mt-1 text-[11px] leading-5 text-gray-500">
                    {googleCalendar.loading
                      ? 'Verificando conexao...'
                      : googleCalendar.connected
                        ? 'Conectado para envio automatico.'
                        : 'Envie compromissos aprovados para seu calendario.'}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${googleCalendar.connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-300'}`}>
                  {googleCalendar.connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              <button
                type="button"
                disabled={googleCalendar.loading || googleCalendar.busy || !googleCalendar.configured}
                onClick={googleCalendar.connected ? handleGoogleCalendarDisconnect : handleGoogleCalendarConnect}
                className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${googleCalendar.connected ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10' : 'bg-gray-950 text-white hover:-translate-y-0.5 hover:bg-gray-800'}`}
              >
                {googleCalendar.configured
                  ? googleCalendar.busy
                    ? 'Aguarde...'
                    : googleCalendar.connected
                      ? 'Desconectar'
                      : 'Conectar Google Calendar'
                  : 'Configurar credenciais Google'}
              </button>
            </div>
          )}

          <div className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-gray-200/50 dark:bg-[#191d28] dark:ring-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Hoje</p>
            <h3 className="mt-1 text-sm font-semibold capitalize text-gray-950 dark:text-white">{todayLabel}</h3>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
                <CalendarDays size={14} className="mb-2 text-emerald-600" />
                <p className="text-lg font-semibold tabular-nums text-gray-950 dark:text-white">{stats.hoje}</p>
                <p className="text-[10px] font-medium text-gray-500">Hoje</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
                <Clock size={14} className="mb-2 text-uvv-yellow" />
                <p className="text-lg font-semibold tabular-nums text-gray-950 dark:text-white">{stats.proxHrs || '--'}</p>
                <p className="text-[10px] font-medium text-gray-500">Prox.</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
                <Tag size={14} className="mb-2 text-indigo-500" />
                <p className="text-lg font-semibold tabular-nums text-gray-950 dark:text-white">{categorias.length}</p>
                <p className="text-[10px] font-medium text-gray-500">Tags</p>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] bg-white p-3 shadow-sm ring-1 ring-gray-200/50 dark:bg-[#191d28] dark:ring-white/10">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-gray-950 dark:text-white">Proximos</p>
              <span className="text-[11px] text-gray-400">{upcomingEvents.length}</span>
            </div>
            <div className="space-y-1.5">
              {upcomingEvents.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/5">Sem proximos compromissos.</div>
              ) : (
                upcomingEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => handleEventClick({ event: { ...ev, start: new Date(ev.start), end: ev.end ? new Date(ev.end) : null, id: ev.id, title: ev.title, extendedProps: ev.extendedProps } })}
                    className="flex w-full items-start gap-2 rounded-xl p-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ev.extendedProps.catObj.cor_hex }} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-gray-950 dark:text-white">{ev.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                        {format(new Date(ev.start), 'dd/MM HH:mm')} - {ev.extendedProps.cursoStr}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {categorias.length > 0 && (
            <div className="rounded-[18px] bg-white p-3 shadow-sm ring-1 ring-gray-200/50 dark:bg-[#191d28] dark:ring-white/10">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-gray-950 dark:text-white">Categorias</p>
                {categoriaFilter && (
                  <button onClick={() => navigate(location.pathname)} className="text-[11px] font-medium text-uvv-yellow">Limpar</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categorias.slice(0, 12).map(cat => {
                  const active = categoriaFilter === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        if (active) params.delete('categoria');
                        else params.set('categoria', cat.id);
                        navigate(`${location.pathname}?${params.toString()}`);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition ${active ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10'}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.cor_hex }} />
                      {cat.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </section>

        {/* Tooltip Premium Glassmorphism */}
        {tooltip.open && (
          <div
            className="pointer-events-none fixed z-[80] min-w-56 -translate-x-1/2 -translate-y-full transform rounded-xl bg-gray-950 px-5 py-4 text-white shadow-2xl ring-1 ring-white/10"
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200/80 dark:bg-[#191d28] dark:ring-white/10 md:p-7">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold tracking-tight text-gray-950 dark:text-white">{editingId ? (canEdit ? 'Editar evento' : 'Detalhes do evento') : 'Novo evento'}</h3>
                {editingId && canEdit && (
                  <div className="flex gap-2">
                    <button onClick={handleDuplicate} title="Duplicar" className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"><Copy size={16} /></button>
                    <button onClick={handleDelete} title="Excluir" className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"><Trash2 size={16} /></button>
                  </div>
                )}
                <button onClick={() => setModalOpen(false)} title="Fechar" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-white/5">
                  <X size={17} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Titulo</label>
                  <input value={titulo} disabled={isFormDisabled} onChange={e => setTitulo(e.target.value)} type="text" className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-all outline-none disabled:opacity-50" placeholder="Ex: Reuniao pedagogica" />
                </div>

                {!editingId && isSecretaria && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Coordenador responsavel</label>
                    <select
                      value={form.coordenador_id}
                      disabled={isFormDisabled}
                      required
                      onChange={e => handleCoordenadorChange(e.target.value)}
                      className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50"
                    >
                      <option value="">Selecione o coordenador</option>
                      {coordenadores.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome} - {c.curso?.nome || 'Curso nao vinculado'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Inicio</label>
                    <input type="time" disabled={isFormDisabled} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Fim</label>
                    <input type="time" disabled={isFormDisabled} value={horaFim} onChange={e => setHoraFim(e.target.value)} className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50" />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Curso</label>
                    <select value={cursoId} disabled={isFormDisabled} onChange={e => setCursoId(e.target.value)} className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50">
                      <option value="">Geral</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Categoria</label>
                    <select value={categoriaId} disabled={isFormDisabled} onChange={e => setCategoriaId(e.target.value)} className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50">
                      <option value="">Nenhuma</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Repeticao</label>
                  <select value={repeticao} disabled={isFormDisabled} onChange={e => setRepeticao(e.target.value)} className="w-full border border-gray-200 bg-white text-gray-950 p-3 rounded-xl focus:ring-2 focus:ring-uvv-yellow transition-all outline-none disabled:opacity-50">
                    <option value="nenhuma">Nenhuma (evento unico)</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>

                <div className="mt-8 flex gap-3 pt-2">
                  <button onClick={() => setModalOpen(false)} className={`rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white ${!isFormDisabled ? 'flex-1' : 'w-full'}`}>Cancelar</button>
                  {!isFormDisabled && <button onClick={handleSave} className="flex-1 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800">Salvar</button>}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
