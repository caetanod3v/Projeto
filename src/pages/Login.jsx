import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const handleMockAuth = (e) => {
    e.preventDefault();
    // Simulate auth logic
    let role = 'coordenador';
    if (email.includes('sec')) role = 'secretaria';
    if (email.includes('admin')) role = 'admin';

    const userName = isRegistering && nome.trim() !== '' ? nome : email.split('@')[0];
    
    onLogin({ id: Math.floor(Math.random() * 1000), nome: userName, email, role });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="bg-gray-800 p-8 text-center border-b border-gray-700">
          <h1 className="text-3xl font-bold text-uvv-yellow mb-2 transition-all">Agenda UVV</h1>
          <p className="text-gray-400 transition-all duration-300">
            {isRegistering ? 'Crie sua conta para acessar' : 'Sistema de Gestão de Compromissos'}
          </p>
        </div>
        
        <form onSubmit={handleMockAuth} className="p-8 pb-10">
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isRegistering ? 'max-h-24 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nome Completo</label>
            <input 
              type="text" 
              required={isRegistering}
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="Seu nome completo"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">E-mail Institucional</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="seu.nome@uvv.br"
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
            <input 
              type="password" 
              required
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-uvv-yellow hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5"
          >
            {isRegistering ? 'Criar Conta' : 'Acessar Agenda'}
          </button>

          <div className="text-center pt-6 border-t border-gray-800 mt-8">
            <p className="text-sm text-gray-400">
              {isRegistering ? 'Já possui uma conta?' : 'Não tem uma conta?'}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setNome('');
                }}
                className="ml-2 text-uvv-yellow hover:text-yellow-400 font-medium transition-colors focus:outline-none"
              >
                {isRegistering ? 'Faça login' : 'Cadastre-se'}
              </button>
            </p>
          </div>
          
        </form>
      </div>
    </div>
  );
}
