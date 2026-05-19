import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const res = await api.get('/cursos');
        setCursos(res.data);
      } catch(err) {
        toast.error('Erro ao buscar cursos.');
      }
    };
    fetchCursos();
  }, []);
  
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith('@uvv.br')) {
      toast.error('Por favor, utilize seu e-mail institucional acadêmico (@uvv.br).');
      return;
    }

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-colors">
        <ThemeToggle className="fixed right-5 top-5" />
        <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800 my-8 text-center p-10 animate-fade-in-up">
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Solicitação Enviada!</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            Sua conta foi criada e está com o status <strong className="text-uvv-yellow font-bold uppercase tracking-wider text-xs">Pendente</strong>.
            <br/><br/>
            O acesso ao sistema da Agenda UVV será liberado assim que a coordenação aprovar o seu cadastro.
          </p>
          <Link to="/login" className="inline-block w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors border border-gray-700">
            Voltar para a tela de Acesso
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <ThemeToggle className="fixed right-5 top-5" />
      <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800 my-8">
        <div className="bg-gray-800 p-8 text-center border-b border-gray-700">
          <h1 className="text-3xl font-bold text-uvv-yellow mb-2">Agenda Institucional</h1>
          <p className="text-gray-400">
            Solicitação de Acesso
          </p>
        </div>
        
        <form onSubmit={handleRegister} className="p-8 pb-10">
          <div className="mb-6 p-4 bg-uvv-yellow/10 border border-uvv-yellow/20 rounded-lg text-sm text-uvv-yellow/90 flex gap-3 items-start">
             <div className="mt-0.5 shrink-0">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             </div>
             <p><strong>Atenção:</strong> O cadastro passará por uma aprovação administrativa prévia antes de ser liberado.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
            <input 
              type="text" 
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="Seu nome"
              disabled={loading}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">E-mail Institucional</label>
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
            <input 
              type="password" 
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="••••••••"
              disabled={loading}
              minLength="6"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Perfil (Cargo)</label>
            <select 
              value={role}
              onChange={e => {
                setRole(e.target.value);
                if (e.target.value !== 'coordenador') setCursoId('');
              }}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent"
              disabled={loading}
            >
              <option value="secretaria">Secretaria</option>
              <option value="coordenador">Coordenador de Curso</option>
            </select>
          </div>
          
          {role === 'coordenador' && (
             <div className="mb-8">
               <label className="block text-sm font-medium text-gray-400 mb-1">Vínculo com Curso</label>
               <select 
                 required
                 value={cursoId}
                 onChange={e => setCursoId(e.target.value)}
                 className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent"
                 disabled={loading}
               >
                 <option value="">Selecione o seu curso</option>
                 {cursos.map(c => (
                   <option key={c.id} value={c.id}>{c.nome}</option>
                 ))}
               </select>
             </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-uvv-yellow hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Enviando...
              </>
            ) : (
              'Solicitar Acesso'
            )}
          </button>

          <div className="text-center pt-6 border-t border-gray-800 mt-6">
            <p className="text-sm text-gray-400">
              Já possui uma conta?
              <Link to="/login" className="ml-2 text-uvv-yellow hover:text-yellow-400 font-medium transition-colors">
                Faça Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
