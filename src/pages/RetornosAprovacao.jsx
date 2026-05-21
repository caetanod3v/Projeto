import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Clock, MessageSquare, RefreshCw, UserCheck, XCircle } from 'lucide-react';
import api from '../services/api';
import { getCategoryChipStyle, isReunioesCategory } from '../utils/categoryVisual';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const statusMeta = {
   pendente: {
      label: 'Em análise',
      icon: AlertCircle,
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-uvv-yellow/10 dark:text-uvv-yellow dark:border-uvv-yellow/30'
   },
   aprovado: {
      label: 'Aprovado',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
   },
   recusado: {
      label: 'Recusado',
      icon: XCircle,
      className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
   }
};

function formatDateRange(item) {
   const inicio = new Date(item.dt_inicio);
   const fim = new Date(item.dt_fim);
   return {
      data: format(inicio, 'dd/MM/yyyy'),
      horario: `${format(inicio, 'HH:mm')} - ${format(fim, 'HH:mm')}`
   };
}

export default function RetornosAprovacao({ user }) {
   if (user?.role !== 'secretaria') {
      return <Navigate to="/" replace />;
   }

   const [solicitacoes, setSolicitacoes] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState(null);

   const fetchSolicitacoes = async () => {
      setIsLoading(true);
      setError(null);
      try {
         const res = await api.get('/minhas-solicitacoes');
         setSolicitacoes(res.data);
      } catch (err) {
         console.error(err);
         setError(err.response?.data?.error || 'Nao foi possivel carregar os retornos de aprovacao.');
         toast.error('Erro ao carregar retornos de aprovação.');
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchSolicitacoes();
   }, []);

   const stats = useMemo(() => ({
      pendente: solicitacoes.filter(item => item.status === 'pendente').length,
      aprovado: solicitacoes.filter(item => item.status === 'aprovado').length,
      recusado: solicitacoes.filter(item => item.status === 'recusado').length,
   }), [solicitacoes]);

   return (
      <div className="w-full relative min-h-[500px] text-gray-900 dark:text-gray-100">
         <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_420px]">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171a22]">
               <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                     <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Secretaria</p>
                     <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Aprovações</h1>
                     <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Acompanhe o retorno dos coordenadores para suas solicitações.</p>
                  </div>
                  <button
                     onClick={fetchSolicitacoes}
                     className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                  >
                     <RefreshCw size={16} />
                     Atualizar
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
               <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 dark:border-uvv-yellow/20 dark:bg-uvv-yellow/10">
                  <p className="text-2xl font-black text-amber-700 dark:text-uvv-yellow">{stats.pendente}</p>
                  <p className="text-[11px] font-bold text-amber-700/70 dark:text-uvv-yellow/80">Em análise</p>
               </div>
               <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.aprovado}</p>
                  <p className="text-[11px] font-bold text-emerald-700/70 dark:text-emerald-300/80">Aprovadas</p>
               </div>
               <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="text-2xl font-black text-red-700 dark:text-red-300">{stats.recusado}</p>
                  <p className="text-[11px] font-bold text-red-700/70 dark:text-red-300/80">Recusadas</p>
               </div>
            </div>
         </div>

         {isLoading ? (
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171a22]">
               <LoadingSkeleton variant="list" rows={4} />
            </div>
         ) : error ? (
            <ErrorState
               variant="fullpage"
               title="Nao foi possivel carregar os retornos"
               message={error}
               onRetry={fetchSolicitacoes}
            />
         ) : solicitacoes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-[28px] p-16 text-center flex flex-col items-center dark:border-white/10 dark:bg-[#171a22]">
               <div className="w-16 h-16 bg-uvv-yellow/10 text-uvv-yellow rounded-2xl flex items-center justify-center mb-4">
                  <MessageSquare size={32} />
               </div>
               <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">Nenhuma solicitação encontrada</h3>
               <p className="text-gray-500 font-medium">Quando você criar compromissos para aprovação, eles aparecerão aqui.</p>
            </div>
         ) : (
            <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171a22]">
               <div className="grid grid-cols-[1fr_170px_170px] gap-4 border-b border-gray-100 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 dark:border-white/10 max-lg:hidden">
                  <span>Solicitação</span>
                  <span>Responsável</span>
                  <span>Status</span>
               </div>

               <div className="divide-y divide-gray-100 dark:divide-white/10">
                  {solicitacoes.map(item => {
                     const meta = statusMeta[item.status] || statusMeta.pendente;
                     const StatusIcon = meta.icon;
                     const { data, horario } = formatDateRange(item);
                     const resposta = item.status === 'recusado'
                        ? item.motivo_recusa || item.mensagem_resposta
                        : item.mensagem_resposta;

                     return (
                        <article key={item.id} className="grid gap-4 px-5 py-5 transition hover:bg-gray-50/70 dark:hover:bg-white/5 lg:grid-cols-[1fr_170px_170px]">
                           <div className="min-w-0">
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                 <h2 className="text-base font-semibold text-gray-950 dark:text-white">{item.titulo}</h2>
                                 <span
                                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-500 dark:border-white/10 dark:bg-white/5"
                                    style={isReunioesCategory(item.categoria) ? getCategoryChipStyle(item.categoria) : undefined}
                                 >
                                    {item.categoria?.nome || 'Sem categoria'}
                                 </span>
                              </div>
                              {item.descricao && <p className="mb-3 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">{item.descricao}</p>}

                              <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-gray-500">
                                 <span className="inline-flex items-center gap-1.5"><CalendarIcon size={14} className="text-uvv-yellow" /> {data}</span>
                                 <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-uvv-yellow" /> {horario}</span>
                                 {item.created_at && <span>Solicitado em {format(new Date(item.created_at), 'dd/MM HH:mm')}</span>}
                                 {item.respondido_em && <span>Respondido em {format(new Date(item.respondido_em), 'dd/MM HH:mm')}</span>}
                              </div>

                              <div className={`rounded-2xl border px-4 py-3 ${item.status === 'recusado' ? 'bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/10'}`}>
                                 <div className="mb-1 flex items-center gap-2">
                                    <MessageSquare size={15} className={item.status === 'recusado' ? 'text-red-500' : 'text-uvv-yellow'} />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                       {item.status === 'pendente' ? 'Retorno' : 'Mensagem do coordenador'}
                                    </span>
                                 </div>
                                 <p className={`text-sm leading-relaxed ${item.status === 'recusado' ? 'text-red-700 dark:text-red-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                    {item.status === 'pendente' ? 'Aguardando análise do coordenador.' : resposta || 'Sem mensagem adicional.'}
                                 </p>
                              </div>
                           </div>

                           <div className="text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center gap-2 font-semibold">
                                 <UserCheck size={16} className="text-uvv-yellow" />
                                 {item.coordenador?.nome || 'Coordenador não definido'}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">{item.curso?.nome || 'Curso não vinculado'}</p>
                           </div>

                           <div>
                              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-widest ${meta.className}`}>
                                 <StatusIcon size={14} />
                                 {meta.label}
                              </span>
                           </div>
                        </article>
                     );
                  })}
               </div>
            </div>
         )}
      </div>
   );
}
