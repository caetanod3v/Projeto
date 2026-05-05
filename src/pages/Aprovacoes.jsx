import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';

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
   const [loadingActionId, setLoadingActionId] = useState(null);
   const [recusarEvt, setRecusarEvt] = useState(null);
   const [motivoRecusa, setMotivoRecusa] = useState('');

   const fetchData = async () => {
      setIsLoading(true);
      try {
         const [pendRes, curRes, catRes, usrRes] = await Promise.all([
            api.get('/compromissos/pendentes'),
            api.get('/cursos'),
            api.get('/categorias'),
            api.get('/usuarios')
         ]);

         const cursosMap = {};
         curRes.data.forEach(c => cursosMap[c.id] = c.nome);

         const catMap = {};
         catRes.data.forEach(c => catMap[c.id] = { nome: c.nome, cor_hex: c.cor_hex });

         const userMap = {};
         usrRes.data.forEach(u => userMap[u.id] = u.nome);

         const formattedPendentes = pendRes.data.map(ev => {
            const inicio = new Date(ev.dt_inicio);
            const fim = ev.dt_fim ? new Date(ev.dt_fim) : new Date(inicio.getTime() + 3600000);
            return {
               ...ev,
               inicio, fim,
               durationStr: formatDuration(inicio, fim),
               catObj: catMap[ev.categoria_id] || { nome: 'Geral', cor_hex: '#374151' },
               cursoStr: cursosMap[ev.curso_id] || 'Geral',
               criadorStr: userMap[ev.usuario_id] || 'Secretaria'
            };
         }).sort((a, b) => a.inicio - b.inicio);
         
         setPendentes(formattedPendentes);
      } catch (err) {
         console.error(err);
         toast.error("Erro ao carregar aprovações.");
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
            await api.patch(`/compromissos/${ev.id}/aprovar`);
            setPendentes(prev => prev.filter(p => p.id !== ev.id));
            toast.success("Compromisso aprovado e agendado!");
         } catch(e) {
            toast.error(e.response?.data?.error || "Erro ao aprovar.");
         } finally {
            setLoadingActionId(null);
         }
      } else if (action === 'reject') {
         setRecusarEvt(ev);
      }
   };

   const confirmReject = async () => {
      if (!recusarEvt) return;
      const tid = toast.loading("Recusando compromisso...");
      setLoadingActionId(`${recusarEvt.id}-reject`);
      try {
         await api.patch(`/compromissos/${recusarEvt.id}/recusar`, { motivo_recusa: motivoRecusa });
         setPendentes(prev => prev.filter(p => p.id !== recusarEvt.id));
         toast.success("Compromisso recusado e removido.", { id: tid });
      } catch (e) {
         toast.error("Erro ao recusar compromisso.", { id: tid });
      } finally {
         setLoadingActionId(null);
         setRecusarEvt(null);
         setMotivoRecusa('');
      }
   };

   return (
      <div className="w-full relative min-h-[500px]">
         <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Aprovações de Compromissos</h1>
            <p className="text-gray-400">Gerencie solicitações enviadas pela secretaria</p>
         </div>

         {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-[#111827] border border-gray-800 rounded-2xl">
               <div className="w-10 h-10 border-4 border-[#0B1220] border-t-uvv-yellow rounded-full animate-spin mb-4"></div>
               <span className="text-gray-400 font-semibold tracking-wide">Carregando fila...</span>
            </div>
         ) : (
            <div className="mb-12">
               <h2 className="text-xl font-black text-uvv-yellow mb-6 uppercase tracking-widest flex items-center gap-3">
                  <AlertCircle size={24} />
                  Aguardando aprovação ({pendentes.length})
               </h2>
               
               {pendentes.length === 0 ? (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-16 text-center flex flex-col items-center">
                     <div className="w-16 h-16 bg-uvv-yellow/10 text-uvv-yellow rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-white mb-2">Tudo em dia!</h3>
                     <p className="text-gray-400 font-medium">Nenhum compromisso aguardando aprovação.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {pendentes.map(ev => (
                        <div key={ev.id} className="relative group bg-[#111827] border border-uvv-yellow/30 rounded-2xl p-6 hover:border-uvv-yellow transition-all duration-300 shadow-xl flex flex-col justify-between">
                           <div>
                              <div className="flex justify-between items-start mb-3">
                                 <h5 className="text-xl font-bold text-gray-100">{ev.titulo}</h5>
                                 <span className="bg-uvv-yellow/10 text-uvv-yellow text-xs font-black px-3 py-1 rounded-full border border-uvv-yellow/30 uppercase tracking-widest flex-shrink-0 ml-4">
                                    Pendente
                                 </span>
                              </div>
                              {ev.descricao && <p className="text-sm text-gray-400 mb-5 line-clamp-3">{ev.descricao}</p>}
                              
                              <div className="flex items-center gap-5 text-sm font-semibold text-gray-500 mb-4 flex-wrap">
                                 <div className="flex items-center gap-2"><CalendarIcon size={16} className="text-uvv-yellow" /> {format(ev.inicio, 'dd/MM/yyyy')}</div>
                                 <div className="flex items-center gap-2"><Clock size={16} className="text-uvv-yellow" /> {ev.durationStr}</div>
                                 <div className="flex items-center gap-2"><Users size={16} className="text-uvv-yellow" /> {ev.cursoStr}</div>
                              </div>
                              
                              <div className="flex flex-col gap-1.5 text-xs text-gray-400 mb-8 bg-[#0B1220] px-4 py-3 rounded-xl border border-gray-800 w-max">
                                 <div><span className="font-bold text-gray-500">Criado por:</span> {ev.criadorStr}</div>
                                 <div><span className="font-bold text-gray-500">Data de Criação:</span> {format(new Date(ev.created_at || ev.inicio), 'dd/MM/yyyy HH:mm')}</div>
                              </div>
                           </div>

                           <div className="flex gap-4 w-full mt-auto">
                              <button 
                                 onClick={() => handleAction(ev, 'approve')} 
                                 disabled={loadingActionId === `${ev.id}-approve` || loadingActionId === `${ev.id}-reject`}
                                 className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-500 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
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
                                 className="flex-1 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                              >
                                 {loadingActionId === `${ev.id}-reject` ? (
                                    <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                 ) : (
                                    <><XCircle size={18} /> Recusar</>
                                 )}
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}

         {/* Modal de Recusa */}
         {recusarEvt && (
            <div className="fixed inset-0 z-50 bg-[#0B1220]/80 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                  
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
                        <AlertTriangle size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-white">Recusar Compromisso</h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">{recusarEvt.titulo}</p>
                     </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                     Tem certeza que deseja recusar este compromisso? Ele não aparecerá no calendário principal.
                  </p>

                  <div className="mb-6">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Motivo da Recusa (Opcional)
                     </label>
                     <textarea
                        value={motivoRecusa}
                        onChange={(e) => setMotivoRecusa(e.target.value)}
                        placeholder="Ex: Faltam informações sobre a sala..."
                        className="w-full bg-[#0B1220] border border-gray-800 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors resize-none h-24"
                     />
                  </div>

                  <div className="flex gap-3">
                     <button
                        onClick={() => { setRecusarEvt(null); setMotivoRecusa(''); }}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all"
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
                           'Confirmar Recusa'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
