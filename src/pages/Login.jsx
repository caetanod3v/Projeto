import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
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
      toast.success(`Bem-vindo, ${user.nome}!`);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        toast.error(err.response.data.error || 'Acesso negado.');
      } else if (err.response && err.response.status === 401) {
        toast.error('E-mail ou senha inválidos.');
      } else {
        toast.error('Ocorreu um erro ao conectar com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <ThemeToggle className="fixed right-5 top-5" />
      <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="bg-gray-800 p-8 text-center border-b border-gray-700">
          <h1 className="text-3xl font-bold text-uvv-yellow mb-2 transition-all">Agenda UVV</h1>
          <p className="text-gray-400 transition-all duration-300">
            Sistema de Gestão de Compromissos
          </p>
        </div>

        <form onSubmit={handleAuth} className="p-8 pb-10">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">E-mail Institucional</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="seu.nome@uvv.br"
              disabled={loading}
            />
          </div>
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-400">Senha</label>
              <Link to="/forgot-password" className="text-xs text-uvv-yellow hover:text-yellow-400 transition-colors">Esqueceu a senha?</Link>
            </div>
            <input
              type="password"
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-uvv-yellow hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Entrando...
              </>
            ) : (
              'Acessar Agenda'
            )}
          </button>

          <div className="text-center pt-6 border-t border-gray-800 mt-8">
            <p className="text-sm text-gray-400">
              Não tem uma conta?
              <Link to="/register" className="ml-2 text-uvv-yellow hover:text-yellow-400 font-medium transition-colors">
                Cadastre-se
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
