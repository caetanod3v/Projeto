const nodemailer = require('nodemailer');
const dns = require('dns').promises;

let cachedTransporter = null;
let cachedTestAccount = null;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Fluxus" <no-reply@fluxus.app>';

const formatDate = (value) => {
  if (!value) return 'Nao informada';
  return new Date(value).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (value) => {
  if (!value) return 'Nao informado';
  return new Date(value).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCategoriaNome = (compromisso) => compromisso?.categoria?.nome || 'Sem categoria';
const getCoordenadorNome = (compromisso) => compromisso?.coordenador?.nome || 'Coordenador nao informado';
const getSecretariaNome = (compromisso) => compromisso?.usuario?.nome || 'Secretaria nao informada';

const buildText = (lines) => lines.filter(Boolean).join('\n');
const buildHtml = (lines) => lines.filter(Boolean).map((line) => `<p>${line}</p>`).join('');

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST) {
    console.log('[E-MAIL] SMTP config', {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT || 587,
      SMTP_SECURE: process.env.SMTP_SECURE,
    });

    let transportHost = process.env.SMTP_HOST;
    let tlsServername = process.env.SMTP_HOST;

    try {
      const ipv4Addresses = await dns.resolve4(process.env.SMTP_HOST);
      if (ipv4Addresses?.length) {
        transportHost = ipv4Addresses[0];
        console.log('[E-MAIL] SMTP IPv4 resolved', {
          SMTP_HOST: process.env.SMTP_HOST,
          IPv4: transportHost,
        });
      }
    } catch (err) {
      console.error('[E-MAIL] SMTP IPv4 resolution failed', {
        SMTP_HOST: process.env.SMTP_HOST,
        message: err.message,
      });
    }

    cachedTransporter = nodemailer.createTransport({
      host: transportHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      family: 4,
      requireTLS: true,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        servername: tlsServername,
      },
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return cachedTransporter;
  }

  cachedTestAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: cachedTestAccount.user,
      pass: cachedTestAccount.pass,
    },
  });
  return cachedTransporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!to) return null;

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, '<br>'),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('[E-MAIL] Preview URL:', previewUrl);
  }

  return info;
}

function compromissoLines(compromisso, extraLines = []) {
  return [
    `Titulo: ${compromisso?.titulo || 'Sem titulo'}`,
    `Categoria: ${getCategoriaNome(compromisso)}`,
    `Data: ${formatDate(compromisso?.dt_inicio)}`,
    `Horario: ${formatTime(compromisso?.dt_inicio)} - ${formatTime(compromisso?.dt_fim)}`,
    ...extraLines,
    `Acessar Fluxus: ${FRONTEND_URL}`,
  ];
}

async function sendReminder(to, eventTitle, eventDate, avisoPrefixo = 'Aviso') {
  const lines = [
    `Ola! ${avisoPrefixo}`,
    `Compromisso: ${eventTitle}`,
    `Data: ${new Date(eventDate).toLocaleString('pt-BR')}`,
  ];

  const info = await sendMail({
    to,
    subject: `[${avisoPrefixo}] Fluxus: ${eventTitle}`,
    text: buildText(lines),
    html: buildHtml(lines),
  });

  if (info) console.log('Mensagem enviada: %s', info.messageId);
  return info;
}

async function sendPendingApprovalEmail({ to, compromisso }) {
  const lines = compromissoLines(compromisso, [
    `Secretaria solicitante: ${getSecretariaNome(compromisso)}`,
  ]);

  const info = await sendMail({
    to,
    subject: '[Fluxus] Nova solicitacao aguardando aprovacao',
    text: buildText(lines),
    html: buildHtml(lines),
  });

  if (info) console.log('[E-MAIL] Pending approval sent', { to, compromisso_id: compromisso?.id });
  return info;
}

async function sendApprovalEmail({ to, compromisso }) {
  const lines = compromissoLines(compromisso, [
    `Coordenador responsavel: ${getCoordenadorNome(compromisso)}`,
  ]);

  const info = await sendMail({
    to,
    subject: '[Fluxus] Solicitacao aprovada',
    text: buildText(lines),
    html: buildHtml(lines),
  });

  if (info) console.log('[E-MAIL] Approval sent', { to, compromisso_id: compromisso?.id });
  return info;
}

async function sendRejectionEmail({ to, compromisso }) {
  const lines = compromissoLines(compromisso, [
    `Coordenador responsavel: ${getCoordenadorNome(compromisso)}`,
    `Motivo da recusa: ${compromisso?.motivo_recusa || compromisso?.mensagem_resposta || 'Nao informado'}`,
  ]);

  const info = await sendMail({
    to,
    subject: '[Fluxus] Solicitacao recusada',
    text: buildText(lines),
    html: buildHtml(lines),
  });

  if (info) console.log('[E-MAIL] Rejection sent', { to, compromisso_id: compromisso?.id });
  return info;
}

async function sendUpdatedCommitmentEmail({ to, compromisso, previousCompromisso = null }) {
  const oldLines = previousCompromisso
    ? [
        `Dados antigos: ${formatDate(previousCompromisso.dt_inicio)} ${formatTime(previousCompromisso.dt_inicio)} - ${formatTime(previousCompromisso.dt_fim)}`,
      ]
    : ['Dados antigos: nao disponiveis'];

  const lines = [
    `Titulo: ${compromisso?.titulo || 'Sem titulo'}`,
    ...oldLines,
    `Nova data: ${formatDate(compromisso?.dt_inicio)}`,
    `Novo horario: ${formatTime(compromisso?.dt_inicio)} - ${formatTime(compromisso?.dt_fim)}`,
    `Categoria: ${getCategoriaNome(compromisso)}`,
    `Acessar Fluxus: ${FRONTEND_URL}`,
  ];

  const info = await sendMail({
    to,
    subject: '[Fluxus] Compromisso atualizado',
    text: buildText(lines),
    html: buildHtml(lines),
  });

  if (info) console.log('[E-MAIL] Update sent', { to, compromisso_id: compromisso?.id });
  return info;
}

async function sendCancelledCommitmentEmail({ to, compromisso }) {
  const lines = [
    `Titulo: ${compromisso?.titulo || 'Sem titulo'}`,
    `Data: ${formatDate(compromisso?.dt_inicio)}`,
    `Horario: ${formatTime(compromisso?.dt_inicio)} - ${formatTime(compromisso?.dt_fim)}`,
    `Acessar Fluxus: ${FRONTEND_URL}`,
  ];

  const info = await sendMail({
    to,
    subject: '[Fluxus] Compromisso cancelado',
    text: buildText(lines),
    html: buildHtml(lines),
  });

  if (info) console.log('[E-MAIL] Cancellation sent', { to, compromisso_id: compromisso?.id });
  return info;
}

module.exports = {
  sendReminder,
  sendPendingApprovalEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendUpdatedCommitmentEmail,
  sendCancelledCommitmentEmail,
};
