import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock3, Loader2, Send, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import FluxusWordmark from '../components/FluxusWordmark';
import ErrorState from '../components/ui/ErrorState';

const previewItems = [
  { icon: Send, label: 'Solicitacao enviada para Coordenacao', meta: 'Secretaria academica', tone: 'blue' },
  { icon: CheckCircle2, label: 'Compromisso aprovado', meta: 'Coordenador de curso', tone: 'green' },
  { icon: UserCheck, label: 'Retorno disponivel para Secretaria', meta: 'Resposta registrada', tone: 'purple' },
  { icon: CalendarCheck, label: 'Agenda sincronizada', meta: 'Calendario institucional', tone: 'slate' }
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('usuario_logado');

      onLogin(user);
      toast.success(`Bem-vindo, ${user.nome}.`);
    } catch (err) {
      let message = 'Ocorreu um erro ao conectar com o servidor.';
      if (err.response && err.response.status === 403) {
        message = err.response.data.error || 'Acesso negado.';
      } else if (err.response && err.response.status === 401) {
        message = 'E-mail ou senha invalidos.';
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
      <FluxusWordmark />
      <ThemeToggle className="fixed right-5 top-5 z-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(91,110,225,0.08),transparent_32rem),radial-gradient(circle_at_90%_10%,rgba(141,108,246,0.06),transparent_30rem)]" />

      <section className="auth-card relative grid w-full max-w-5xl overflow-hidden rounded-[24px] ring-1 ring-gray-200/70 dark:ring-white/10 lg:grid-cols-[1fr_430px]">
        <div className="hidden min-h-[620px] flex-col justify-between bg-[#151821] p-10 text-white lg:flex">
          <div>
            <div className="mb-14 h-8" aria-hidden="true" />
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-white">
              Planejamento academico com a clareza de um workspace moderno.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/74">
              Coordene agendas, aprovacoes e compromissos institucionais em uma operacao limpa, auditavel e facil de acompanhar.
            </p>
          </div>

          <div className="auth-preview">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Fluxus em tempo real</p>
                <p className="mt-1 text-[11px] text-white/58">Fluxo de agenda e aprovacoes</p>
              </div>
              <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/76 ring-1 ring-white/10">3 em analise</span>
            </div>

            <div className="auth-preview-calendar">
              <div className="auth-preview-day auth-float-1">
                <span>09:00</span>
                <strong>Aula inaugural</strong>
              </div>
              <div className="auth-preview-day auth-float-2 is-live">
                <span>11:30</span>
                <strong>Banca confirmada</strong>
              </div>
              <div className="auth-preview-day auth-float-3">
                <span>15:00</span>
                <strong>Reuniao de curso</strong>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {previewItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="auth-preview-card auth-timeline-item" style={{ '--delay': `${index * 1.2}s` }}>
                    <div className={`auth-preview-icon auth-preview-icon-${item.tone}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p>{item.label}</p>
                      <span>{item.meta}</span>
                    </div>
                    <Clock3 size={13} className="text-white/42" />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-white/[0.055] p-3 ring-1 ring-white/10">
              <div className="mb-2 flex items-center justify-between text-[11px] text-white/58">
                <span>Status semanal</span>
                <span>Sincronizado</span>
              </div>
              <div className="auth-progress-track flex h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="auth-preview-progress h-full rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-10 h-5 lg:hidden" aria-hidden="true" />

          <div className="mb-8">
            <p className="auth-eyebrow text-[11px] font-semibold uppercase tracking-[0.22em]">Acesso institucional</p>
            <h2 className="auth-title mt-2 text-2xl font-semibold tracking-tight">Entre no workspace</h2>
            <p className="auth-muted mt-2 text-sm">Use sua conta autorizada pela instituicao.</p>
          </div>

          {error && (
            <ErrorState variant="toast" title="Falha no acesso" message={error} />
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="auth-label mb-2 block text-sm font-medium">E-mail institucional</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="auth-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                placeholder="nome@instituicao.edu"
                disabled={loading}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="auth-label block text-sm font-medium">Senha</label>
                <Link to="/forgot-password" className="auth-link text-xs font-medium transition">Esqueceu a senha?</Link>
              </div>
              <input
                type="password"
                required
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="auth-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                placeholder="********"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Acessar Fluxus <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="auth-divider mt-8 border-t pt-6 text-center">
            <p className="auth-muted text-sm">
              Nao tem uma conta?
              <Link to="/register" className="auth-link ml-2 font-medium transition">
                Solicitar acesso
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
