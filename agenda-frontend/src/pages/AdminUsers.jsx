import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Check, X, Shield, Users } from 'lucide-react';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function AdminUsers() {
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usrRes, curRes] = await Promise.all([
        api.get('/users'),
        api.get('/cursos')
      ]);
      setUsuarios(usrRes.data);
      setCursos(curRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Nao foi possivel carregar os usuarios.');
      toast.error('Erro ao carregar usuarios.');
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
      toast.success('Usuario aprovado.');
      loadData();
    } catch (err) {
      toast.error('Erro ao aprovar usuario.');
    }
  };

  const handleBloquear = async (id) => {
    if (!window.confirm('Tem certeza que deseja bloquear este usuario?')) return;
    try {
      await api.patch(`/users/${id}/bloquear`);
      toast.success('Usuario bloqueado.');
      loadData();
    } catch (err) {
      toast.error('Erro ao bloquear usuario.');
    }
  };

  const handleRoleChange = async (id, role, curso_id) => {
    try {
      await api.put(`/users/${id}`, { role, curso_id: role === 'coordenador' ? parseInt(curso_id) : null });
      toast.success('Usuario atualizado.');
      loadData();
    } catch (err) {
      toast.error('Erro ao atualizar usuario.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
          <LoadingSkeleton variant="card" />
        </section>
        <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
          <LoadingSkeleton variant="list" rows={4} />
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <ErrorState
          variant="fullpage"
          title="Nao foi possivel carregar usuarios"
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-uvv-yellow/10 text-uvv-yellow">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Administracao</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Usuarios institucionais</h1>
            <p className="mt-1 text-sm text-gray-500">Aprovacao e gerenciamento de contas autorizadas.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Cargo e vinculo</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {usuarios.map(u => (
                <tr key={u.id} className="transition hover:bg-gray-50/80 dark:hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-950 dark:text-white">{u.nome}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value, u.curso_id)}
                      className="mb-2 block rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-uvv-yellow"
                    >
                      <option value="admin">Admin</option>
                      <option value="coordenador">Coordenador</option>
                      <option value="secretaria">Secretaria</option>
                      <option value="professor">Professor</option>
                      <option value="aluno">Aluno</option>
                    </select>

                    {u.role === 'coordenador' && (
                      <select
                        value={u.curso_id || ''}
                        onChange={(e) => handleRoleChange(u.id, u.role, e.target.value)}
                        className="block rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-uvv-yellow"
                      >
                        <option value="">Sem curso global</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.status === 'pendente' && <span className="rounded-full bg-uvv-yellow/10 px-3 py-1 text-xs font-semibold text-uvv-yellow">Pendente</span>}
                    {u.status === 'ativo' && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ativo</span>}
                    {u.status === 'bloqueado' && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">Bloqueado</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status !== 'ativo' && (
                        <button
                          onClick={() => handleAprovar(u.id)}
                          className="rounded-lg bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                          title="Aprovar usuario"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      {u.status !== 'bloqueado' && u.role !== 'admin' && (
                        <button
                          onClick={() => handleBloquear(u.id)}
                          className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                          title="Bloquear usuario"
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
                  <td colSpan="4" className="px-6 py-12 text-center text-sm text-gray-500">
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
