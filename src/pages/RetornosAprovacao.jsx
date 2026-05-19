import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Clock, MessageSquare, RefreshCw, UserCheck, XCircle } from 'lucide-react';
import api from '../services/api';

const statusMeta = {
   pendente: {
      label: 'Em análise',
      icon: AlertCircle,
      className: 'bg-uvv-yellow/10 text-uvv-yellow border-uvv-yellow/30'
   },
   aprovado: {
      label: 'Aprovado',
      icon: CheckCircle2,
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
   },
   recusado: {
      label: 'Recusado',
      icon: XCircle,
      className: 'bg-red-500/10 text-red-400 border-red-500/30'
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

   const fetchSolicitacoes = async () => {
      setIsLoading(true);
      try {
         const res = await api.get('/minhas-solicitacoes');
         setSolicitacoes(res.data);
      } catch (err) {
         console.error(err);
         toast.error('Erro ao carregar retornos de aprovação.');
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchSolicitacoes();
   }, []);

   return (
      <div className="w-full relative min-h-[500px]">
         <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
               <h1 className="text-3xl font-black text-white mb-2">Aprovações</h1>
               <p className="text-gray-400">Acompanhe o retorno dos coordenadores para suas solicitações</p>
            </div>
            <button
               onClick={fetchSolicitacoes}
               className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold px-4 py-3 rounded-xl transition-all"
            >
               <RefreshCw size={16} />
               Atualizar
            </button>
         </div>

         {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-[#111827] border border-gray-800 rounded-2xl">
               <div className="w-10 h-10 border-4 border-[#0B1220] border-t-uvv-yellow rounded-full animate-spin mb-4"></div>
               <span className="text-gray-400 font-semibold tracking-wide">Carregando retornos...</span>
            </div>
         ) : solicitacoes.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-16 text-center flex flex-col items-center">
               <div className="w-16 h-16 bg-uvv-yellow/10 text-uvv-yellow rounded-full flex items-center justify-center mb-4">
                  <MessageSquare size={32} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Nenhuma solicitação encontrada</h3>
               <p className="text-gray-400 font-medium">Quando você criar compromissos para aprovação, eles aparecerão aqui.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               {solicitacoes.map(item => {
                  const meta = statusMeta[item.status] || statusMeta.pendente;
                  const StatusIcon = meta.icon;
                  const { data, horario } = formatDateRange(item);
                  const resposta = item.status === 'recusado'
                     ? item.motivo_recusa || item.mensagem_resposta
                     : item.mensagem_resposta;

                  return (
                     <article key={item.id} className="bg-[#111827] border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-xl transition-all">
                        <div className="flex items-start justify-between gap-4 mb-5">
                           <div className="min-w-0">
                              <h2 className="text-xl font-black text-white leading-tight mb-2">{item.titulo}</h2>
                              {item.descricao && <p className="text-sm text-gray-400 line-clamp-2">{item.descricao}</p>}
                           </div>
                           <span className={`inline-flex items-center gap-2 text-xs font-black px-3 py-1 rounded-full border uppercase tracking-widest shrink-0 ${meta.className}`}>
                              <StatusIcon size={14} />
                              {meta.label}
                           </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm text-gray-400">
                           <div className="flex items-center gap-2 bg-[#0B1220] border border-gray-800 rounded-xl px-3 py-2">
                              <CalendarIcon size={16} className="text-uvv-yellow" />
                              {data}
                           </div>
                           <div className="flex items-center gap-2 bg-[#0B1220] border border-gray-800 rounded-xl px-3 py-2">
                              <Clock size={16} className="text-uvv-yellow" />
                              {horario}
                           </div>
                           <div className="flex items-center gap-2 bg-[#0B1220] border border-gray-800 rounded-xl px-3 py-2">
                              <UserCheck size={16} className="text-uvv-yellow" />
                              {item.coordenador?.nome || 'Coordenador não definido'}
                           </div>
                           <div className="bg-[#0B1220] border border-gray-800 rounded-xl px-3 py-2 truncate">
                              {item.curso?.nome || 'Curso não vinculado'}
                           </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-5">
                           <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5">
                              {item.categoria?.nome || 'Sem categoria'}
                           </span>
                           {item.created_at && (
                              <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5">
                                 Solicitado em {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                           )}
                           {item.respondido_em && (
                              <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5">
                                 Respondido em {format(new Date(item.respondido_em), 'dd/MM/yyyy HH:mm')}
                              </span>
                           )}
                        </div>

                        <div className={`rounded-xl border px-4 py-3 ${item.status === 'recusado' ? 'bg-red-500/10 border-red-500/20' : 'bg-[#0B1220] border-gray-800'}`}>
                           <div className="flex items-center gap-2 mb-2">
                              <MessageSquare size={16} className={item.status === 'recusado' ? 'text-red-400' : 'text-uvv-yellow'} />
                              <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                                 {item.status === 'pendente' ? 'Retorno' : 'Mensagem do coordenador'}
                              </span>
                           </div>
                           <p className={`text-sm leading-relaxed ${item.status === 'recusado' ? 'text-red-200' : 'text-gray-300'}`}>
                              {item.status === 'pendente' ? 'Aguardando análise do coordenador.' : resposta || 'Sem mensagem adicional.'}
                           </p>
                        </div>
                     </article>
                  );
               })}
            </div>
         )}
      </div>
   );
}
