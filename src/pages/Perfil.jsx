import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Camera, Check, ChevronRight, KeyRound, Loader2, Mail, Shield, SlidersHorizontal, Trash2, UserRound, X } from 'lucide-react';
import api from '../services/api';

const roleLabels = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  secretaria: 'Secretaria',
};

const emptyPasswordForm = {
  senha_atual: '',
  nova_senha: '',
  confirmar_senha: '',
};

const formatDate = (value) => {
  if (!value) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

const cropAvatar = (source, zoom, offset) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const baseScale = Math.max(size / image.width, size / image.height) * zoom;
    const width = image.width * baseScale;
    const height = image.height * baseScale;
    const overflowX = Math.max(0, width - size);
    const overflowY = Math.max(0, height - size);
    const x = -overflowX / 2 + (offset.x / 100) * (overflowX / 2);
    const y = -overflowY / 2 + (offset.y / 100) * (overflowY / 2);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, x, y, width, height);
    resolve(canvas.toDataURL('image/jpeg', 0.9));
  };
  image.onerror = reject;
  image.src = source;
});

export default function Perfil({ user, onUserUpdate }) {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(user);
  const [name, setName] = useState(user?.nome || '');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [avatarSource, setAvatarSource] = useState(user?.avatar_url || '');
  const [avatarZoom, setAvatarZoom] = useState(1.08);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);

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

  const openAvatarModal = () => {
    setAvatarSource(profile?.avatar_url || '');
    setAvatarZoom(1.08);
    setAvatarOffset({ x: 0, y: 0 });
    setAvatarModalOpen(true);
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

  const handleAvatarFile = (event) => {
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
    reader.onload = () => {
      setAvatarSource(reader.result);
      setAvatarZoom(1.08);
      setAvatarOffset({ x: 0, y: 0 });
      setAvatarModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!avatarSource) return;
    setSavingAvatar(true);
    try {
      const croppedAvatar = await cropAvatar(avatarSource, avatarZoom, avatarOffset);
      const res = await api.patch('/perfil/avatar', { avatar_url: croppedAvatar });
      syncProfile(res.data);
      setAvatarModalOpen(false);
      toast.success('Foto de perfil atualizada.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar foto.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const res = await api.patch('/perfil/avatar', { avatar_url: null });
      syncProfile(res.data);
      setAvatarSource('');
      setAvatarModalOpen(false);
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
      setPasswordForm(emptyPasswordForm);
      setPasswordModalOpen(false);
      toast.success('Senha alterada com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordForm(emptyPasswordForm);
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
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openAvatarModal}
              className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-uvv-yellow/12 text-xl font-semibold text-uvv-yellow shadow-sm ring-1 ring-gray-200/70 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvv-yellow/30 dark:ring-white/10"
              aria-label="Editar foto de perfil"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-gray-950/0 text-white opacity-0 transition group-hover:bg-gray-950/32 group-hover:opacity-100">
                <Camera size={18} />
              </span>
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Conta Fluxus</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">{profile?.nome}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{roleLabels[profile?.role] || profile?.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAvatarModal}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-gray-950"
          >
            <Camera size={15} />
            Editar foto
          </button>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uvv-yellow/10 text-uvv-yellow">
            <UserRound size={19} />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-white">Informacoes principais</h2>
            <p className="text-xs text-gray-500 dark:text-gray-300">Dados essenciais exibidos na sua conta.</p>
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

      <button
        type="button"
        onClick={() => setPasswordModalOpen(true)}
        className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left shadow-sm ring-1 ring-gray-200/70 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-[#191d28] dark:ring-white/10 dark:hover:bg-[#202432]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950/5 text-gray-700 dark:bg-white/10 dark:text-white">
            <KeyRound size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-950 dark:text-white">Alterar senha</span>
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-300">Atualize suas credenciais de acesso.</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-gray-400" />
      </button>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[26px] bg-white p-5 shadow-2xl ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">Alterar senha</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Sua senha nunca e exibida em texto puro.</p>
              </div>
              <button type="button" onClick={closePasswordModal} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white">
                <X size={18} />
              </button>
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

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closePasswordModal} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPassword} className="flex-1 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950">
                  {savingPassword ? <Loader2 size={15} className="mx-auto animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-5 shadow-2xl ring-1 ring-gray-200/70 dark:bg-[#191d28] dark:ring-white/10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">Foto de perfil</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Visualize, recorte e ajuste sua imagem.</p>
              </div>
              <button type="button" onClick={() => setAvatarModalOpen(false)} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-[260px_1fr]">
              <div className="flex justify-center">
                <div className="relative h-60 w-60 overflow-hidden rounded-[32px] bg-gray-100 ring-1 ring-gray-200/80 dark:bg-white/5 dark:ring-white/10">
                  {avatarSource ? (
                    <img
                      src={avatarSource}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        transform: `translate(${avatarOffset.x}%, ${avatarOffset.y}%) scale(${avatarZoom})`,
                        transformOrigin: 'center',
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-uvv-yellow/12 text-5xl font-semibold text-uvv-yellow">
                      {initial}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarFile} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-950">
                    <Camera size={15} />
                    Trocar foto
                  </button>
                  {profile?.avatar_url && (
                    <button type="button" onClick={handleRemoveAvatar} disabled={savingAvatar} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10">
                      <Trash2 size={15} />
                      Remover
                    </button>
                  )}
                </div>

                <div className="rounded-2xl bg-gray-50/80 p-4 dark:bg-white/5">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    <SlidersHorizontal size={15} />
                    Editar foto
                  </p>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Zoom</span>
                      <input type="range" min="1" max="2.4" step="0.01" value={avatarZoom} disabled={!avatarSource} onChange={(event) => setAvatarZoom(Number(event.target.value))} className="w-full accent-uvv-yellow" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Recorte horizontal</span>
                      <input type="range" min="-100" max="100" step="1" value={avatarOffset.x} disabled={!avatarSource} onChange={(event) => setAvatarOffset(prev => ({ ...prev, x: Number(event.target.value) }))} className="w-full accent-uvv-yellow" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Recorte vertical</span>
                      <input type="range" min="-100" max="100" step="1" value={avatarOffset.y} disabled={!avatarSource} onChange={(event) => setAvatarOffset(prev => ({ ...prev, y: Number(event.target.value) }))} className="w-full accent-uvv-yellow" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setAvatarModalOpen(false)} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSaveAvatar} disabled={!avatarSource || savingAvatar} className="flex-1 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950">
                    {savingAvatar ? <Loader2 size={15} className="mx-auto animate-spin" /> : 'Salvar foto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
