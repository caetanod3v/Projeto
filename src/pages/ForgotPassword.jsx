import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      if (err.response && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Erro ao solicitar redefinicao.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
      <ThemeToggle className="fixed right-5 top-5 z-20" />
      <section className="auth-card w-full max-w-md rounded-[24px] p-6 ring-1 ring-gray-200/70 dark:ring-white/10 sm:p-9">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Check size={28} />
            </div>
            <h1 className="auth-title text-2xl font-semibold tracking-tight">E-mail enviado</h1>
            <p className="auth-muted mt-3 text-sm leading-6">
              Verifique sua caixa de entrada para redefinir a senha.
            </p>
            <Link to="/login" className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
              Voltar para login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="auth-brand mb-5">Fluxus</p>
              <p className="auth-eyebrow text-[11px] font-semibold uppercase tracking-[0.22em]">Recuperacao</p>
              <h1 className="auth-title mt-2 text-2xl font-semibold tracking-tight">Redefinir senha</h1>
              <p className="auth-muted mt-2 text-sm">Enviaremos as instrucoes para o e-mail cadastrado.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar link'}
              </button>

              <Link to="/login" className="auth-link inline-flex items-center gap-2 text-sm font-medium transition">
                <ArrowLeft size={14} /> Voltar
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
