import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('usuario_logado');

      onLogin(user);
      toast.success(`Bem-vindo, ${user.nome}.`);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        toast.error(err.response.data.error || 'Acesso negado.');
      } else if (err.response && err.response.status === 401) {
        toast.error('E-mail ou senha invalidos.');
      } else {
        toast.error('Ocorreu um erro ao conectar com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f7f8fb] p-4">
      <ThemeToggle className="fixed right-5 top-5 z-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(91,110,225,0.12),transparent_32rem),radial-gradient(circle_at_90%_10%,rgba(141,108,246,0.08),transparent_30rem)]" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[24px] bg-white shadow-[0_24px_80px_rgba(35,42,62,0.10)] ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10 lg:grid-cols-[1fr_430px]">
        <div className="hidden min-h-[620px] flex-col justify-between bg-[#151821] p-10 text-white lg:flex">
          <div>
            <div className="mb-14 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-gray-950">M</div>
              <div>
                <p className="text-sm font-semibold text-white">Meridian</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Academic OS</p>
              </div>
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-white">
              Planejamento academico com a clareza de um workspace moderno.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/62">
              Coordene agendas, aprovacoes e compromissos institucionais em uma operacao limpa, auditavel e facil de acompanhar.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['Cursos', 'Aprovacoes', 'Agenda'].map(item => (
              <div key={item} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-white/52">{item}</p>
                <div className="mt-8 h-1.5 rounded-full bg-white/15">
                  <div className="h-full w-2/3 rounded-full bg-white/70" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-10 lg:hidden">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-sm font-semibold text-white">M</div>
            <p className="text-sm font-semibold text-gray-950 dark:text-white">Meridian</p>
          </div>

          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Acesso institucional</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Entre no workspace</h2>
            <p className="mt-2 text-sm text-gray-500">Use sua conta autorizada pela instituicao.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">E-mail institucional</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-uvv-yellow focus:ring-4 focus:ring-uvv-yellow/10"
                placeholder="nome@instituicao.edu"
                disabled={loading}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-600">Senha</label>
                <Link to="/forgot-password" className="text-xs font-medium text-uvv-yellow transition hover:text-gray-950">Esqueceu a senha?</Link>
              </div>
              <input
                type="password"
                required
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-uvv-yellow focus:ring-4 focus:ring-uvv-yellow/10"
                placeholder="********"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Acessar Meridian <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center dark:border-white/10">
            <p className="text-sm text-gray-500">
              Nao tem uma conta?
              <Link to="/register" className="ml-2 font-medium text-uvv-yellow transition hover:text-gray-950">
                Solicitar acesso
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
