import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('secretaria');
  const [cursoId, setCursoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const res = await api.get('/cursos');
        setCursos(res.data);
      } catch (err) {
        toast.error('Erro ao buscar cursos.');
      }
    };
    fetchCursos();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nome,
        email,
        senha,
        role,
        curso_id: cursoId ? parseInt(cursoId) : null
      });
      setSubmitted(true);
    } catch (err) {
      if (err.response && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Ocorreu um erro ao conectar com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="auth-screen relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
        <ThemeToggle className="fixed right-5 top-5 z-20" />
        <div className="auth-card w-full max-w-md rounded-[24px] p-9 text-center ring-1 ring-gray-200/70 dark:ring-white/10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Check size={30} />
          </div>
          <h2 className="auth-title text-2xl font-semibold tracking-tight">Solicitacao enviada</h2>
          <p className="auth-muted mt-3 text-sm leading-6">
            Sua conta esta com status pendente. O acesso ao Fluxus sera liberado apos aprovacao administrativa.
          </p>
          <Link to="/login" className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
            Voltar para acesso
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-screen relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
      <ThemeToggle className="fixed right-5 top-5 z-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(91,110,225,0.08),transparent_32rem),radial-gradient(circle_at_90%_10%,rgba(141,108,246,0.06),transparent_30rem)]" />

      <section className="auth-card relative w-full max-w-md rounded-[24px] p-6 ring-1 ring-gray-200/70 dark:ring-white/10 sm:p-9">
        <div className="mb-8">
          <p className="auth-brand mb-5">Fluxus</p>
          <p className="auth-eyebrow text-[11px] font-semibold uppercase tracking-[0.22em]">Novo workspace</p>
          <h1 className="auth-title mt-2 text-2xl font-semibold tracking-tight">Solicitar acesso</h1>
          <p className="auth-muted mt-2 text-sm">A conta passa por aprovacao antes de entrar em operacao.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="auth-label mb-1.5 block text-sm font-medium">Nome completo</label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="auth-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
              placeholder="Seu nome"
              disabled={loading}
            />
          </div>

          <div>
            <label className="auth-label mb-1.5 block text-sm font-medium">E-mail institucional</label>
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
            <label className="auth-label mb-1.5 block text-sm font-medium">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="auth-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
              placeholder="********"
              disabled={loading}
              minLength="6"
            />
          </div>

          <div>
            <label className="auth-label mb-1.5 block text-sm font-medium">Perfil</label>
            <select
              value={role}
              onChange={e => {
                setRole(e.target.value);
                if (e.target.value !== 'coordenador') setCursoId('');
              }}
              className="auth-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
              disabled={loading}
            >
              <option value="secretaria">Secretaria</option>
              <option value="coordenador">Coordenador de curso</option>
            </select>
          </div>

          {role === 'coordenador' && (
            <div>
              <label className="auth-label mb-1.5 block text-sm font-medium">Vinculo com curso</label>
              <select
                required
                value={cursoId}
                onChange={e => setCursoId(e.target.value)}
                className="auth-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                disabled={loading}
              >
                <option value="">Selecione o curso</option>
                {cursos.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar solicitacao'}
          </button>
        </form>

        <div className="auth-divider mt-7 border-t pt-6 text-center">
          <p className="auth-muted text-sm">
            Ja possui uma conta?
            <Link to="/login" className="auth-link ml-2 font-medium transition">
              Fazer login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
