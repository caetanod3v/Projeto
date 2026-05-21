import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

function formatDuration(start, end) {
   const diffMs = end - start;
   const diffHrs = Math.floor(diffMs / 3600000);
   const diffMins = Math.round((diffMs % 3600000) / 60000);
   if (diffHrs > 0 && diffMins > 0) return `${diffHrs}h ${diffMins}m`;
   if (diffHrs > 0) return `${diffHrs}h`;
   return `${diffMins}m`;
}

export default function Aprovacoes({ user }) {
   if (user?.role !== 'coordenador' && user?.role !== 'admin') {
      return <Navigate to="/" />;
   }

   const [pendentes, setPendentes] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState(null);
   const [loadingActionId, setLoadingActionId] = useState(null);
   const [recusarEvt, setRecusarEvt] = useState(null);
   const [motivoRecusa, setMotivoRecusa] = useState('');

   const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
         const [pendRes, curRes, catRes] = await Promise.all([
            api.get('/compromissos/pendentes'),
            api.get('/cursos'),
            api.get('/categorias'),
         ]);

         const cursosMap = {};
         curRes.data.forEach(c => cursosMap[c.id] = c.nome);

         const catMap = {};
         catRes.data.forEach(c => catMap[c.id] = { nome: c.nome, cor_hex: c.cor_hex });

         const formattedPendentes = pendRes.data.map(ev => {
            const inicio = new Date(ev.dt_inicio);
            const fim = ev.dt_fim ? new Date(ev.dt_fim) : new Date(inicio.getTime() + 3600000);
            return {
               ...ev,
               inicio,
               fim,
               durationStr: formatDuration(inicio, fim),
               catObj: catMap[ev.categoria_id] || { nome: 'Geral', cor_hex: '#374151' },
               cursoStr: ev.curso?.nome || cursosMap[ev.curso_id] || 'Geral',
               criadorStr: ev.usuario?.nome || 'Secretaria',
               coordenadorStr: ev.coordenador?.nome || 'Nao definido',
               statusStr: ev.status || 'pendente'
            };
         }).sort((a, b) => a.inicio - b.inicio);

         setPendentes(formattedPendentes);
      } catch (err) {
         console.error(err);
         setError(err.response?.data?.error || 'Nao foi possivel carregar a fila de aprovacao.');
         toast.error('Erro ao carregar aprovações.');
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   const handleAction = async (ev, action) => {
      if (action === 'approve') {
         setLoadingActionId(`${ev.id}-approve`);
         try {
            await api.patch(`/compromissos/${ev.id}/aprovar`, {
               mensagem_resposta: 'Compromisso aprovado pelo coordenador.'
            });
            setPendentes(prev => prev.filter(p => p.id !== ev.id));
            toast.success('Compromisso aprovado e agendado!');
         } catch (e) {
            toast.error(e.response?.data?.error || 'Erro ao aprovar.');
         } finally {
            setLoadingActionId(null);
         }
      } else if (action === 'reject') {
         setRecusarEvt(ev);
      }
   };

   const confirmReject = async () => {
      if (!recusarEvt) return;
      if (!motivoRecusa.trim()) {
         return toast.error('Informe o motivo da recusa.');
      }
      const tid = toast.loading('Recusando compromisso...');
      setLoadingActionId(`${recusarEvt.id}-reject`);
      try {
         await api.patch(`/compromissos/${recusarEvt.id}/recusar`, {
            motivo_recusa: motivoRecusa,
            mensagem_resposta: motivoRecusa
         });
         setPendentes(prev => prev.filter(p => p.id !== recusarEvt.id));
         toast.success('Compromisso recusado e removido.', { id: tid });
      } catch (e) {
         toast.error('Erro ao recusar compromisso.', { id: tid });
      } finally {
         setLoadingActionId(null);
         setRecusarEvt(null);
         setMotivoRecusa('');
      }
   };

   const proximas24h = pendentes.filter(ev => ev.inicio <= new Date(Date.now() + 86400000)).length;

   return (
      <div className="w-full relative min-h-[500px] text-gray-900 dark:text-gray-100">
         <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171a22]">
               <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Fila do coordenador</p>
               <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Aprovações de compromissos</h1>
               <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Solicitações enviadas pela secretaria, direcionadas para análise.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171a22]">
                  <p className="text-3xl font-black text-gray-950 dark:text-white">{pendentes.length}</p>
                  <p className="text-xs font-semibold text-gray-500">Pendentes</p>
               </div>
               <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-uvv-yellow/20 dark:bg-uvv-yellow/10">
                  <p className="text-3xl font-black text-amber-700 dark:text-uvv-yellow">{proximas24h}</p>
                  <p className="text-xs font-semibold text-amber-700/70 dark:text-uvv-yellow/80">Próx. 24h</p>
               </div>
            </div>
         </div>

         {isLoading ? (
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171a22]">
               <LoadingSkeleton variant="list" rows={3} />
            </div>
         ) : error ? (
            <ErrorState
               variant="fullpage"
               title="Nao foi possivel carregar a fila"
               message={error}
               onRetry={fetchData}
            />
         ) : (
            <div className="mb-12 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171a22] md:p-5">
               <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  <AlertCircle size={18} />
                  Aguardando aprovação ({pendentes.length})
               </h2>

               {pendentes.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-16 text-center flex flex-col items-center dark:border-white/10 dark:bg-white/5">
                     <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 size={30} />
                     </div>
                     <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-2">Tudo em dia!</h3>
                     <p className="text-gray-500 font-medium">Nenhum compromisso aguardando aprovação.</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {pendentes.map(ev => (
                        <article key={ev.id} className="group grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 xl:grid-cols-[1fr_260px]">
                           <div className="min-w-0">
                              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                 <div>
                                    <h5 className="text-lg font-semibold text-gray-950 dark:text-white">{ev.titulo}</h5>
                                    {ev.descricao && <p className="mt-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">{ev.descricao}</p>}
                                 </div>
                                 <span className="bg-uvv-yellow/10 text-amber-700 text-[11px] font-black px-3 py-1 rounded-full border border-uvv-yellow/30 uppercase tracking-widest">
                                    Pendente
                                 </span>
                              </div>

                              <div className="mb-4 flex flex-wrap items-center gap-5 text-sm font-semibold text-gray-500">
                                 <div className="flex items-center gap-2"><CalendarIcon size={16} className="text-uvv-yellow" /> {format(ev.inicio, 'dd/MM/yyyy')}</div>
                                 <div className="flex items-center gap-2"><Clock size={16} className="text-uvv-yellow" /> {ev.durationStr}</div>
                                 <div className="flex items-center gap-2"><Users size={16} className="text-uvv-yellow" /> {ev.cursoStr}</div>
                              </div>

                              <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
                                 <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#171a22]"><span className="block font-bold text-gray-400">Solicitante</span>{ev.criadorStr}</div>
                                 <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#171a22]"><span className="block font-bold text-gray-400">Responsável</span>{ev.coordenadorStr}</div>
                                 <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#171a22]"><span className="block font-bold text-gray-400">Status</span>{ev.statusStr}</div>
                                 <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#171a22]"><span className="block font-bold text-gray-400">Criado em</span>{format(new Date(ev.created_at || ev.inicio), 'dd/MM HH:mm')}</div>
                              </div>
                           </div>

                           <div className="flex items-stretch gap-3 xl:flex-col xl:justify-center">
                              <button
                                 onClick={() => handleAction(ev, 'approve')}
                                 disabled={loadingActionId === `${ev.id}-approve` || loadingActionId === `${ev.id}-reject`}
                                 className="flex-1 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                              >
                                 {loadingActionId === `${ev.id}-approve` ? (
                                    <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                 ) : (
                                    <><CheckCircle2 size={18} /> Aprovar</>
                                 )}
                              </button>
                              <button
                                 onClick={() => handleAction(ev, 'reject')}
                                 disabled={loadingActionId === `${ev.id}-approve` || loadingActionId === `${ev.id}-reject`}
                                 className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                              >
                                 {loadingActionId === `${ev.id}-reject` ? (
                                    <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                 ) : (
                                    <><XCircle size={18} /> Recusar</>
                                 )}
                              </button>
                           </div>
                        </article>
                     ))}
                  </div>
               )}
            </div>
         )}

         {recusarEvt && (
            <div className="fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white border border-gray-200 rounded-[28px] p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden dark:border-white/10 dark:bg-[#171a22]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />

                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 dark:bg-red-500/10 dark:text-red-300">
                        <AlertTriangle size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-gray-950 dark:text-white">Recusar compromisso</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{recusarEvt.titulo}</p>
                     </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-6 leading-relaxed dark:text-gray-300">
                     Informe o motivo da recusa. A secretaria verá essa resposta no retorno da solicitação.
                  </p>

                  <div className="mb-6">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Motivo da recusa
                     </label>
                     <textarea
                        value={motivoRecusa}
                        onChange={(e) => setMotivoRecusa(e.target.value)}
                        required
                        placeholder="Ex: Faltam informações sobre a sala..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors resize-none h-24 dark:border-white/10 dark:bg-white/5 dark:text-white"
                     />
                  </div>

                  <div className="flex gap-3">
                     <button
                        onClick={() => { setRecusarEvt(null); setMotivoRecusa(''); }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                     >
                        Cancelar
                     </button>
                     <button
                        onClick={confirmReject}
                        disabled={loadingActionId === `${recusarEvt.id}-reject`}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
                     >
                        {loadingActionId === `${recusarEvt.id}-reject` ? (
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                           'Confirmar recusa'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
