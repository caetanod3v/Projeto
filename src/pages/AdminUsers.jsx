import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Check, X, Shield, Users, RefreshCw } from 'lucide-react';

export default function AdminUsers() {
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [usrRes, curRes] = await Promise.all([
        api.get('/users'),
        api.get('/cursos')
      ]);
      setUsuarios(usrRes.data);
      setCursos(curRes.data);
    } catch (err) {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAprovar = async (id) => {
    try {
      await api.patch(`/users/${id}/aprovar`);
      toast.success('Usuário aprovado!');
      loadData();
    } catch (err) {
      toast.error('Erro ao aprovar usuário.');
    }
  };

  const handleBloquear = async (id) => {
    if (!window.confirm('Tem certeza que deseja bloquear este usuário?')) return;
    try {
      await api.patch(`/users/${id}/bloquear`);
      toast.success('Usuário bloqueado!');
      loadData();
    } catch (err) {
      toast.error('Erro ao bloquear usuário.');
    }
  };

  const handleRoleChange = async (id, role, curso_id) => {
    try {
      await api.put(`/users/${id}`, { role, curso_id: role === 'coordenador' ? parseInt(curso_id) : null });
      toast.success('Usuário atualizado!');
      loadData();
    } catch (err) {
      toast.error('Erro ao atualizar usuário.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <RefreshCw size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
          <Shield size={24} className="text-uvv-yellow" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gestão Institucional</h1>
          <p className="text-sm text-gray-400 mt-1">Aprovação e gerenciamento de contas de usuários</p>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-xs uppercase tracking-widest text-gray-500 font-bold">Usuário</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest text-gray-500 font-bold">Cargo & Vínculo</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest text-gray-500 font-bold">Status</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest text-gray-500 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center border border-gray-700">
                        <Users size={16} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-100">{u.nome}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value, u.curso_id)}
                      className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 text-white mb-2 block outline-none focus:border-uvv-yellow"
                    >
                      <option value="admin">Admin</option>
                      <option value="coordenador">Coordenador</option>
                      <option value="secretaria">Secretaria</option>
                    </select>
                    
                    {u.role === 'coordenador' && (
                      <select 
                        value={u.curso_id || ''}
                        onChange={(e) => handleRoleChange(u.id, u.role, e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 text-white block outline-none focus:border-uvv-yellow"
                      >
                        <option value="">Sem Curso (Global)</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.status === 'pendente' && <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold rounded-full">Pendente</span>}
                    {u.status === 'ativo' && <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold rounded-full">Ativo</span>}
                    {u.status === 'bloqueado' && <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full">Bloqueado</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status !== 'ativo' && (
                        <button 
                          onClick={() => handleAprovar(u.id)}
                          className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Aprovar Usuário"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      {u.status !== 'bloqueado' && u.role !== 'admin' && (
                        <button 
                          onClick={() => handleBloquear(u.id)}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Bloquear Usuário"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 text-sm">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
