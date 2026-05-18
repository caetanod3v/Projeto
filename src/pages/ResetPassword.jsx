import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);
  
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl text-white font-bold mb-4">Link inválido</h2>
        <p className="text-gray-400 mb-6">O link de recuperação não possui um token válido.</p>
        <Link to="/login" className="bg-uvv-yellow text-gray-900 px-6 py-2 rounded-lg font-bold">Voltar para Login</Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, nova_senha: novaSenha });
      toast.success('Senha redefinida com sucesso!');
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="bg-gray-800 p-8 text-center border-b border-gray-700">
          <h1 className="text-2xl font-bold text-uvv-yellow mb-2">Redefinir Senha</h1>
          <p className="text-gray-400 text-sm">
            Crie uma nova senha para sua conta
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 pb-10">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-2">Nova Senha</label>
            <input 
              type="password" 
              required
              minLength="6"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
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
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
