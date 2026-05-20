const cron = require('node-cron');
const { sendReminder } = require('./emailService');

function iniciarCronJobs(compromissos, usuarios) {
  // Vamos armazenar em memória também o registro de quais e-mails já foram enviados,
  // Para evitar spam a cada 5 minutos do mesmo evento se usar crons muito frequentes.
  // Formato da chave: "eventoId_tipoAviso" (Ex: "1_24h", "1_1h")
  const enviosRealizados = new Set();

  console.log("CRON Jobs Engine inicializado.");

  // CRON 1: Varredor de Alta Frequência (Executa a cada 5 minutos na máquina)
  // Utilidade: Achar eventos faltando 24h, 1h ou 15m
  cron.schedule('*/5 * * * *', () => {
    const agora = new Date();
    
    compromissos.forEach(comp => {
      const inicio = new Date(comp.dt_inicio);
      if (inicio < agora) return; // Evento já passou
      
      const diffMinutos = Math.floor((inicio - agora) / 1000 / 60);

      // Regra: 24 Horas
      if (diffMinutos <= 1440 && diffMinutos > 1380) {
        if (!enviosRealizados.has(`${comp.id}_24h`)) {
           enviosRealizados.add(`${comp.id}_24h`);
           console.log(`[CRON] Lembrete 24h disparado para Evento ${comp.id} (${comp.titulo})`);
           // Puxa email real do usuário
           const usr = usuarios.find(u => u.id === comp.usuario_id);
           if (usr) sendReminder(usr.email, comp.titulo, comp.dt_inicio, "Faltam 24 horas").catch(console.error);
        }
      }
      
      // Regra: 1 Hora
      if (diffMinutos <= 60 && diffMinutos > 45) {
        if (!enviosRealizados.has(`${comp.id}_1h`)) {
           enviosRealizados.add(`${comp.id}_1h`);
           console.log(`[CRON] Lembrete 1h disparado para Evento ${comp.id} (${comp.titulo})`);
           const usr = usuarios.find(u => u.id === comp.usuario_id);
           if (usr) sendReminder(usr.email, comp.titulo, comp.dt_inicio, "Falta 1 hora").catch(console.error);
        }
      }

      // Regra: 15 Minutos
      if (diffMinutos <= 15 && diffMinutos > 0) {
        if (!enviosRealizados.has(`${comp.id}_15m`)) {
           enviosRealizados.add(`${comp.id}_15m`);
           console.log(`[CRON] Lembrete 15m disparado para Evento ${comp.id} (${comp.titulo})`);
           const usr = usuarios.find(u => u.id === comp.usuario_id);
           if (usr) sendReminder(usr.email, comp.titulo, comp.dt_inicio, "Faltam apenas 15 minutos!").catch(console.error);
        }
      }
    });
  });

  // CRON 2: Resumo Diário (Todos os dias às 08:00 AM)
  cron.schedule('0 8 * * *', () => {
    console.log("[CRON] Executando Resumo Diário das 08h00");
    const agora = new Date();
    const hojeStr = agora.toLocaleDateString();

    usuarios.forEach(usr => {
      // Filtrar proximo eventos de hoje
      const eventosDeHoje = compromissos.filter(comp => {
         return comp.usuario_id === usr.id && (new Date(comp.dt_inicio).toLocaleDateString() === hojeStr);
      });

      if (eventosDeHoje.length > 0) {
         console.log(`[CRON] Enviando resumo diário para ${usr.nome} (Total: ${eventosDeHoje.length})`);
         sendReminder(
           usr.email, 
           `Resumo Diário - ${eventosDeHoje.length} Compromissos Hoje`, 
           agora.toISOString(), 
           "Resumo"
         ).catch(console.error);
      }
    });
  });
}

module.exports = { iniciarCronJobs };
