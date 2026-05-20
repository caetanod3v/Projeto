import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Camera, Check, KeyRound, Loader2, Mail, Shield, Trash2, UserRound } from 'lucide-react';
import api from '../services/api';

const roleLabels = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  secretaria: 'Secretaria',
};

const formatDate = (value) => {
  if (!value) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

export default function Perfil({ user, onUserUpdate }) {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(user);
  const [name, setName] = useState(user?.nome || '');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/perfil');
        setProfile(res.data);
        setName(res.data.nome || '');
        onUserUpdate?.(res.data);
      } catch (err) {
        toast.error('Erro ao carregar perfil.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const syncProfile = (nextProfile) => {
    setProfile(nextProfile);
    setName(nextProfile.nome || '');
    onUserUpdate?.(nextProfile);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/perfil', { nome: name });
      syncProfile(res.data);
      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Use uma imagem PNG, JPG ou WebP.');
      return;
    }

    if (file.size > 1000000) {
      toast.error('Use uma imagem de ate 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setSavingAvatar(true);
      try {
        const res = await api.patch('/perfil/avatar', { avatar_url: reader.result });
        syncProfile(res.data);
        toast.success('Foto de perfil atualizada.');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erro ao atualizar foto.');
      } finally {
        setSavingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const res = await api.patch('/perfil/avatar', { avatar_url: null });
      syncProfile(res.data);
      toast.success('Foto removida.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao remover foto.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.nova_senha !== passwordForm.confirmar_senha) {
      toast.error('A confirmacao da nova senha nao confere.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch('/perfil/senha', passwordForm);
      setPasswordForm({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
      toast.success('Senha alterada com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-300">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const initial = profile?.nome?.charAt(0) || 'U';

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-uvv-yellow/12 text-xl font-semibold text-uvv-yellow shadow-sm ring-1 ring-gray-200/70 dark:ring-white/10">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Conta Fluxus</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">{profile?.nome}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{roleLabels[profile?.role] || profile?.role}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarFile} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingAvatar}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950"
            >
              {savingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
              Trocar foto
            </button>
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={savingAvatar}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 size={15} />
                Remover
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uvv-yellow/10 text-uvv-yellow">
              <UserRound size={19} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-white">Dados do perfil</h2>
              <p className="text-xs text-gray-500 dark:text-gray-300">Informacoes usadas dentro do Fluxus.</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-uvv-yellow/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50/80 p-3 dark:bg-white/5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400"><Mail size={12} /> Email</p>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{profile?.email || 'Nao informado'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50/80 p-3 dark:bg-white/5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400"><Shield size={12} /> Funcao</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{roleLabels[profile?.role] || profile?.role}</p>
              </div>
              <div className="rounded-2xl bg-gray-50/80 p-3 dark:bg-white/5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Criado em</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(profile?.created_at)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50/80 p-3 dark:bg-white/5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Vinculo</p>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{profile?.curso?.nome || 'Institucional'}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950"
            >
              {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Salvar perfil
            </button>
          </form>
        </section>

        <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950/5 text-gray-700 dark:bg-white/10 dark:text-white">
              <KeyRound size={19} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-white">Alterar senha</h2>
              <p className="text-xs text-gray-500 dark:text-gray-300">Sua senha nunca e exibida em texto puro.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {[
              ['senha_atual', 'Senha atual'],
              ['nova_senha', 'Nova senha'],
              ['confirmar_senha', 'Confirmar nova senha'],
            ].map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
                <input
                  type="password"
                  value={passwordForm[field]}
                  onChange={(event) => setPasswordForm(prev => ({ ...prev, [field]: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-uvv-yellow/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>
            ))}

            <button
              type="submit"
              disabled={savingPassword}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950"
            >
              {savingPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              Alterar senha
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
