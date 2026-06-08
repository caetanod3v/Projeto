import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Check, X, Shield, Users } from 'lucide-react';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function AdminUsers() {
  const [usuarios, setUsuarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    matricula: '',
    senha: '',
    role: 'aluno',
    curso_id: '',
    status: 'ativo',
  });
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
      setError(err.response?.data?.message || err.response?.data?.error || 'Nao foi possivel carregar os usuarios.');
      toast.error('Erro ao carregar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    try {
      await api.post('/users', {
        ...novoUsuario,
        email: novoUsuario.role === 'aluno' ? null : novoUsuario.email,
        matricula: novoUsuario.role === 'aluno' ? novoUsuario.matricula : null,
        curso_id: novoUsuario.role === 'coordenador' && novoUsuario.curso_id ? parseInt(novoUsuario.curso_id) : null,
      });
      toast.success('Usuario criado.');
      setNovoUsuario({ nome: '', email: '', matricula: '', senha: '', role: 'aluno', curso_id: '', status: 'ativo' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Erro ao criar usuario.');
    }
  };

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

  const handleRoleChange = async (usuario, role, curso_id = usuario.curso_id, matricula = usuario.matricula, email = usuario.email) => {
    try {
      let nextMatricula = matricula;
      let nextEmail = email;

      if (role === 'aluno' && !nextMatricula) {
        nextMatricula = window.prompt('Informe a matricula do aluno:') || '';
      }

      if (role !== 'aluno' && !nextEmail) {
        nextEmail = window.prompt('Informe o e-mail institucional:') || '';
      }

      await api.put(`/users/${usuario.id}`, {
        role,
        email: role === 'aluno' ? null : nextEmail,
        matricula: role === 'aluno' ? nextMatricula : null,
        curso_id: role === 'coordenador' && curso_id ? parseInt(curso_id) : null
      });
      toast.success('Usuario atualizado.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Erro ao atualizar usuario.');
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

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
        <form onSubmit={handleCreateUser} className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Nome</span>
            <input value={novoUsuario.nome} onChange={(e) => setNovoUsuario(prev => ({ ...prev, nome: e.target.value }))} required className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-uvv-yellow" placeholder="Nome completo" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Perfil</span>
            <select value={novoUsuario.role} onChange={(e) => setNovoUsuario(prev => ({ ...prev, role: e.target.value, email: e.target.value === 'aluno' ? '' : prev.email, matricula: e.target.value === 'aluno' ? prev.matricula : '', curso_id: e.target.value === 'coordenador' ? prev.curso_id : '' }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-uvv-yellow">
              <option value="aluno">Aluno</option>
              <option value="professor">Professor</option>
              <option value="coordenador">Coordenador</option>
              <option value="secretaria">Secretaria</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {novoUsuario.role === 'aluno' ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Matricula</span>
              <input value={novoUsuario.matricula} onChange={(e) => setNovoUsuario(prev => ({ ...prev, matricula: e.target.value }))} required className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-uvv-yellow" placeholder="Matricula" />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">E-mail</span>
              <input type="email" value={novoUsuario.email} onChange={(e) => setNovoUsuario(prev => ({ ...prev, email: e.target.value }))} required className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-uvv-yellow" placeholder="nome@instituicao.edu" />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Senha</span>
            <input type="password" value={novoUsuario.senha} onChange={(e) => setNovoUsuario(prev => ({ ...prev, senha: e.target.value }))} required minLength="6" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-uvv-yellow" placeholder="******" />
          </label>
          {novoUsuario.role === 'coordenador' ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Curso</span>
              <select value={novoUsuario.curso_id} onChange={(e) => setNovoUsuario(prev => ({ ...prev, curso_id: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-uvv-yellow">
                <option value="">Sem curso</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
          ) : <div />}
          <button type="submit" className="rounded-lg bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800">Criar</button>
        </form>
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
                        <p className="text-xs text-gray-500">{u.role === 'aluno' ? (u.matricula || 'Matricula nao informada') : (u.email || 'E-mail nao informado')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
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
                        onChange={(e) => handleRoleChange(u, u.role, e.target.value)}
                        className="block rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-uvv-yellow"
                      >
                        <option value="">Sem curso global</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    )}

                    {u.role === 'aluno' && (
                      <input
                        value={u.matricula || ''}
                        onChange={(e) => setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, matricula: e.target.value } : item))}
                        onBlur={(e) => handleRoleChange(u, u.role, u.curso_id, e.target.value)}
                        placeholder="Matricula"
                        className="block rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-uvv-yellow"
                      />
                    )}

                    {u.role !== 'aluno' && (
                      <input
                        value={u.email || ''}
                        onChange={(e) => setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, email: e.target.value } : item))}
                        onBlur={(e) => handleRoleChange(u, u.role, u.curso_id, null, e.target.value)}
                        placeholder="E-mail institucional"
                        className="block rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-uvv-yellow"
                      />
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
