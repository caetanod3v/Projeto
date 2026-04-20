import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  
  const handleMockLogin = (e) => {
    e.preventDefault();
    // Simulate auth logic
    let role = 'coordenador';
    if (email.includes('sec')) role = 'secretaria';
    if (email.includes('admin')) role = 'admin';

    onLogin({ id: 1, nome: email.split('@')[0], email, role });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="bg-gray-800 p-8 text-center border-b border-gray-700">
          <h1 className="text-3xl font-bold text-uvv-yellow mb-2">Agenda UVV</h1>
          <p className="text-gray-400">Sistema de Gestão de Compromissos</p>
        </div>
        
        <form onSubmit={handleMockLogin} className="p-8 pb-10 space-y-6">
          <div>
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
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-uvv-yellow focus:border-transparent transition-shadow"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-uvv-yellow hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-colors mt-2"
          >
            Acessar Agenda
          </button>
          
          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Mock login: use "admin@", "sec@" ou qualquer para ver papéis diferentes.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
