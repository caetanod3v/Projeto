import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
        toast.error('Erro ao solicitar redefinição.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="bg-gray-800 p-8 text-center border-b border-gray-700">
          <h1 className="text-2xl font-bold text-uvv-yellow mb-2">Recuperar Senha</h1>
          <p className="text-gray-400 text-sm">
            Enviaremos as instruções para seu e-mail
          </p>
        </div>
        
        <div className="p-8 pb-10">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-100 mb-2">E-mail Enviado!</h3>
              <p className="text-gray-400 text-sm mb-6">
                Verifique a caixa de entrada (ou Ethereal no terminal) para redefinir sua senha.
              </p>
              <Link to="/login" className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors border border-gray-700">
                Voltar para Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
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
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-uvv-yellow hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 mb-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Link de Recuperação'}
              </button>

              <div className="text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft size={14} /> Voltar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
