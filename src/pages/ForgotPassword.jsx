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
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f7f8fb] p-4">
      <ThemeToggle className="fixed right-5 top-5 z-20" />
      <section className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_80px_rgba(35,42,62,0.10)] ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10 sm:p-9">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Check size={28} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">E-mail enviado</h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Verifique sua caixa de entrada para redefinir a senha.
            </p>
            <Link to="/login" className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
              Voltar para login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-sm font-semibold text-white">M</div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Recuperacao</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Redefinir senha</h1>
              <p className="mt-2 text-sm text-gray-500">Enviaremos as instrucoes para o e-mail cadastrado.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">E-mail institucional</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition"
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

              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950">
                <ArrowLeft size={14} /> Voltar
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
