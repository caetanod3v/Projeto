import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f8fb] p-4 text-center">
        <ThemeToggle className="fixed right-5 top-5" />
        <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Link invalido</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">O link de recuperacao nao possui um token valido.</p>
        <Link to="/login" className="mt-6 rounded-xl bg-gray-950 px-6 py-3 text-sm font-semibold text-white">Voltar para login</Link>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, nova_senha: novaSenha });
      toast.success('Senha redefinida com sucesso.');
      navigate('/login');
    } catch (err) {
      if (err.response && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Erro ao redefinir senha. O token pode estar expirado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f7f8fb] p-4">
      <ThemeToggle className="fixed right-5 top-5 z-20" />
      <section className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_80px_rgba(35,42,62,0.10)] ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10 sm:p-9">
        <div className="mb-8">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-sm font-semibold text-white">M</div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Seguranca</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Criar nova senha</h1>
          <p className="mt-2 text-sm text-gray-500">Defina uma senha para voltar ao workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-600">Nova senha</label>
            <input
              type="password"
              required
              minLength="6"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition"
              placeholder="********"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Salvar senha'}
          </button>
        </form>
      </section>
    </main>
  );
}
