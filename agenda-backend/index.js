const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { sendReminder } = require("./emailService");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_uvv_2026';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GOOGLE_CALENDAR_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/Sao_Paulo';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: [
    "https://projeto-two-sigma.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true
}));

app.use(express.json());

// ── Middleware RBAC ────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado para o seu perfil.' });
    }
    next();
  };
};

// ── Funções Utilitárias ────────────────────────────────────────────────────────
async function registrarLog(usuario_id, acao, detalhes = null) {
  try {
    await prisma.logAuditoria.create({
      data: { usuario_id, acao, detalhes }
    });
  } catch (err) {
    console.error('Erro ao registrar log de auditoria:', err);
  }
}

const usuarioPublicSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  status: true,
  curso_id: true,
  curso: { select: { id: true, nome: true } }
};

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);
const formatTimeOnly = (date) => date.toISOString().slice(11, 16);

const toSolicitacaoSecretaria = (compromisso) => ({
  id: compromisso.id,
  titulo: compromisso.titulo,
  descricao: compromisso.descricao,
  data: formatDateOnly(compromisso.dt_inicio),
  horario_inicio: formatTimeOnly(compromisso.dt_inicio),
  horario_fim: formatTimeOnly(compromisso.dt_fim),
  dt_inicio: compromisso.dt_inicio,
  dt_fim: compromisso.dt_fim,
  status: compromisso.status,
  mensagem_resposta: compromisso.mensagem_resposta,
  motivo_recusa: compromisso.motivo_recusa,
  respondido_em: compromisso.respondido_em,
  created_at: compromisso.created_at,
  coordenador: compromisso.coordenador ? {
    id: compromisso.coordenador.id,
    nome: compromisso.coordenador.nome,
    email: compromisso.coordenador.email,
  } : null,
  curso: compromisso.coordenador?.curso || compromisso.curso || null,
  categoria: compromisso.categoria || null,
});

const getGoogleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const isGoogleConfigured = () => {
  const config = getGoogleConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
};

const buildGoogleAuthUrl = (user) => {
  const config = getGoogleConfig();
  const state = jwt.sign(
    { userId: user.id, role: user.role, purpose: 'google-calendar-oauth' },
    JWT_SECRET,
    { expiresIn: '10m' }
  );

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const exchangeGoogleCode = async (code) => {
  const config = getGoogleConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Erro ao trocar codigo OAuth do Google.');
  }
  return payload;
};

const refreshGoogleAccessToken = async (user) => {
  const config = getGoogleConfig();
  if (!user.google_refresh_token) return null;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: user.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Erro ao renovar token do Google.');
  }

  const expiresAt = new Date(Date.now() + (payload.expires_in || 3600) * 1000);
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      google_access_token: payload.access_token,
      google_token_expiry: expiresAt,
      google_calendar_connected: true,
    },
  });

  return payload.access_token;
};

const getValidGoogleAccessToken = async (userId) => {
  if (!isGoogleConfigured()) return null;

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      google_access_token: true,
      google_refresh_token: true,
      google_token_expiry: true,
      google_calendar_connected: true,
    },
  });

  if (!user || user.role !== 'coordenador' || !user.google_calendar_connected) return null;
  if (!user.google_access_token && !user.google_refresh_token) return null;

  const expiresAt = user.google_token_expiry ? user.google_token_expiry.getTime() : 0;
  if (user.google_access_token && expiresAt > Date.now() + 60000) {
    return user.google_access_token;
  }

  return refreshGoogleAccessToken(user);
};

const buildGoogleCalendarEvent = (compromisso) => ({
  summary: compromisso.titulo,
  description: [
    compromisso.descricao || '',
    '',
    'Sincronizado automaticamente pelo Fluxus.',
    compromisso.curso?.nome ? `Curso: ${compromisso.curso.nome}` : null,
    compromisso.categoria?.nome ? `Categoria: ${compromisso.categoria.nome}` : null,
  ].filter(Boolean).join('\n'),
  start: {
    dateTime: new Date(compromisso.dt_inicio).toISOString(),
    timeZone: GOOGLE_CALENDAR_TIMEZONE,
  },
  end: {
    dateTime: new Date(compromisso.dt_fim).toISOString(),
    timeZone: GOOGLE_CALENDAR_TIMEZONE,
  },
});

const syncCompromissoToGoogleCalendar = async (compromissoOrId) => {
  const compromisso = typeof compromissoOrId === 'object'
    ? compromissoOrId
    : await prisma.compromisso.findUnique({
      where: { id: compromissoOrId },
      include: { curso: true, categoria: true, coordenador: true },
    });

  if (!compromisso || compromisso.status !== 'aprovado' || !compromisso.coordenador_id) {
    return { skipped: true, reason: 'Compromisso sem coordenador ou ainda nao aprovado.' };
  }

  const accessToken = await getValidGoogleAccessToken(compromisso.coordenador_id);
  if (!accessToken) {
    return { skipped: true, reason: 'Coordenador sem Google Calendar conectado.' };
  }

  const response = await fetch(GOOGLE_CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildGoogleCalendarEvent(compromisso)),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Erro ao criar evento no Google Calendar.');
  }

  return { synced: true, googleEventId: payload.id };
};

const syncCompromissoToGoogleCalendarAndStore = async (compromissoOrId) => {
  const compromisso = typeof compromissoOrId === 'object'
    ? compromissoOrId
    : await prisma.compromisso.findUnique({
      where: { id: compromissoOrId },
      include: { curso: true, categoria: true, coordenador: true },
    });

  if (compromisso?.google_event_id) {
    return updateGoogleCalendarEvent(compromisso);
  }

  const result = await syncCompromissoToGoogleCalendar(compromissoOrId);

  if (!result.synced || !result.googleEventId) {
    return result;
  }

  const compromissoId = typeof compromissoOrId === 'object' ? compromissoOrId.id : compromissoOrId;
  await prisma.compromisso.update({
    where: { id: compromissoId },
    data: { google_event_id: result.googleEventId },
  });

  return result;
};

const syncCompromissoToGoogleCalendarSafe = async (compromissoOrId) => {
  try {
    return await syncCompromissoToGoogleCalendarAndStore(compromissoOrId);
  } catch (err) {
    console.error('Erro ao sincronizar Google Calendar:', err.message);
    return { error: err.message };
  }
};

const updateGoogleCalendarEvent = async (compromisso) => {
  if (!compromisso?.google_event_id || !compromisso.coordenador_id) {
    return { skipped: true, reason: 'Compromisso sem evento Google vinculado.' };
  }

  const accessToken = await getValidGoogleAccessToken(compromisso.coordenador_id);
  if (!accessToken) {
    return { skipped: true, reason: 'Coordenador sem Google Calendar conectado.' };
  }

  const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(compromisso.google_event_id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildGoogleCalendarEvent(compromisso)),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Erro ao atualizar evento no Google Calendar.');
  }

  return { synced: true, googleEventId: payload.id };
};

const updateGoogleCalendarEventSafe = async (compromisso) => {
  try {
    return await updateGoogleCalendarEvent(compromisso);
  } catch (err) {
    console.error('Erro ao atualizar Google Calendar:', err.message);
    return { error: err.message };
  }
};

const deleteGoogleCalendarEvent = async (compromisso) => {
  if (!compromisso?.google_event_id || !compromisso.coordenador_id) {
    return { skipped: true, reason: 'Compromisso sem evento Google vinculado.' };
  }

  const accessToken = await getValidGoogleAccessToken(compromisso.coordenador_id);
  if (!accessToken) {
    return { skipped: true, reason: 'Coordenador sem Google Calendar conectado.' };
  }

  const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(compromisso.google_event_id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404 || response.status === 410) {
    return { deleted: false, missing: true };
  }

  if (!response.ok) {
    let message = 'Erro ao excluir evento no Google Calendar.';
    try {
      const payload = await response.json();
      message = payload.error?.message || message;
    } catch (err) {
      // Empty error body; keep generic message.
    }
    throw new Error(message);
  }

  return { deleted: true };
};

const deleteGoogleCalendarEventSafe = async (compromisso) => {
  try {
    return await deleteGoogleCalendarEvent(compromisso);
  } catch (err) {
    console.error('Erro ao excluir Google Calendar:', err.message);
    return { error: err.message };
  }
};

// ── Autenticação ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, role, curso_id } = req.body;
  try {
    const userExists = await prisma.usuario.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const hash = await bcrypt.hash(senha, 10);
    const newUser = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hash,
        role: role || 'secretaria',
        curso_id: curso_id || null,
        status: 'pendente'
      }
    });

    await registrarLog(newUser.id, 'REGISTRO', 'Usuário se registrou e aguarda aprovação.');
    res.status(201).json({ message: 'Cadastro realizado com sucesso. Aguarde aprovação do administrador.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

    if (user.status === 'pendente') return res.status(403).json({ error: 'Sua conta ainda aguarda aprovação do administrador.' });
    if (user.status === 'bloqueado') return res.status(403).json({ error: 'Sua conta foi bloqueada.' });

    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, role: user.role, curso_id: user.curso_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await registrarLog(user.id, 'LOGIN', 'Sessão iniciada.');

    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role, status: user.status, curso_id: user.curso_id } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const token = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    await prisma.usuario.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expires: expires }
    });

    const { sendReminder } = require("./emailService");
    // Aproveitando o mock do ethereal para enviar o link
    await sendReminder(email, "Recuperação de Senha", new Date(), "Use o link http://localhost:5173/reset-password?token=" + token + " para resetar sua senha. Ignorar a data:");

    await registrarLog(user.id, 'SOLICITACAO_RECUPERACAO_SENHA', 'Solicitou redefinição de senha.');
    res.json({ message: 'E-mail de recuperação enviado.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao solicitar recuperação.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, senha } = req.body;
  try {
    const user = await prisma.usuario.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: { gt: new Date() }
      }
    });

    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado.' });

    const hash = await bcrypt.hash(senha, 10);
    await prisma.usuario.update({
      where: { id: user.id },
      data: { senha: hash, reset_token: null, reset_token_expires: null }
    });

    await registrarLog(user.id, 'REDEFINICAO_SENHA', 'Senha alterada com sucesso.');
    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (user.status !== 'ativo') return res.status(403).json({ error: 'Sua conta não está ativa.' });

    res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role, curso_id: user.curso_id, status: user.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
  }
});
// ── Health Check ──────────────────────────────────────────────────────────────
// Google Calendar OAuth / Sync
app.get('/api/google-calendar/auth', authenticateToken, requireRole('coordenador'), async (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(500).json({ error: 'Google Calendar nao esta configurado no servidor.' });
  }

  res.json({ authUrl: buildGoogleAuthUrl(req.user) });
});

app.get('/api/google-calendar/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const redirectWithStatus = (status) => res.redirect(`${FRONTEND_URL}/?googleCalendar=${status}`);

  if (error) {
    return redirectWithStatus('error');
  }

  if (!code || !state || !isGoogleConfigured()) {
    return redirectWithStatus('error');
  }

  try {
    const decoded = jwt.verify(state, JWT_SECRET);
    if (decoded.purpose !== 'google-calendar-oauth' || decoded.role !== 'coordenador') {
      return redirectWithStatus('forbidden');
    }

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, google_refresh_token: true },
    });

    if (!user || user.role !== 'coordenador') {
      return redirectWithStatus('forbidden');
    }

    const tokens = await exchangeGoogleCode(code);
    const refreshToken = tokens.refresh_token || user.google_refresh_token;

    if (!refreshToken) {
      return redirectWithStatus('missing_refresh_token');
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        google_access_token: tokens.access_token,
        google_refresh_token: refreshToken,
        google_token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        google_calendar_connected: true,
      },
    });

    await registrarLog(user.id, 'GOOGLE_CALENDAR_CONNECT', 'Conectou Google Calendar.');
    return redirectWithStatus('connected');
  } catch (err) {
    console.error('Erro no callback do Google Calendar:', err.message);
    return redirectWithStatus('error');
  }
});

app.get('/api/google-calendar/status', authenticateToken, requireRole('coordenador'), async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { google_calendar_connected: true, google_token_expiry: true },
    });

    res.json({
      connected: Boolean(user?.google_calendar_connected),
      tokenExpiry: user?.google_token_expiry || null,
      configured: isGoogleConfigured(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao consultar status do Google Calendar.' });
  }
});

app.delete('/api/google-calendar/disconnect', authenticateToken, requireRole('coordenador'), async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id: req.user.id },
      data: {
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_calendar_connected: false,
      },
    });

    await registrarLog(req.user.id, 'GOOGLE_CALENDAR_DISCONNECT', 'Desconectou Google Calendar.');
    res.json({ connected: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao desconectar Google Calendar.' });
  }
});

app.post('/api/google-calendar/sync-event', authenticateToken, requireRole('coordenador'), async (req, res) => {
  const compromissoId = parseOptionalInt(req.body?.compromisso_id || req.body?.compromissoId);
  if (!compromissoId) {
    return res.status(400).json({ error: 'Informe o compromisso para sincronizar.' });
  }

  try {
    const compromisso = await prisma.compromisso.findFirst({
      where: { id: compromissoId, coordenador_id: req.user.id },
      include: { curso: true, categoria: true, coordenador: true },
    });

    if (!compromisso) {
      return res.status(404).json({ error: 'Compromisso nao encontrado para este coordenador.' });
    }

    const result = await syncCompromissoToGoogleCalendarAndStore(compromisso);
    if (result.skipped) {
      return res.status(400).json({ error: result.reason });
    }

    await registrarLog(req.user.id, 'GOOGLE_CALENDAR_SYNC_EVENT', `Sincronizou compromisso ${compromisso.id} no Google Calendar.`);
    res.json({ success: true, googleEventId: result.googleEventId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao sincronizar compromisso com Google Calendar.' });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend Agenda UVV online" });
});

// ── Cursos ────────────────────────────────────────────────────────────────────
app.get('/api/cursos', async (req, res) => {
  try {
    const cursos = await prisma.curso.findMany();
    res.json(cursos);
  } catch (e) {
    console.error('Erro ao buscar cursos:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Categorias ────────────────────────────────────────────────────────────────
app.get('/api/coordenadores', authenticateToken, async (req, res) => {
  try {
    const coordenadores = await prisma.usuario.findMany({
      where: { role: 'coordenador', status: 'ativo' },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
        curso_id: true,
        curso: { select: { id: true, nome: true } }
      }
    });

    res.json(coordenadores);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar coordenadores." });
  }
});

app.get("/api/categorias", async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({ orderBy: { id: 'asc' } });
    res.json(categorias);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar categorias." });
  }
});

// ── Usuários (Admin) ─────────────────────────────────────────────────────────
app.get("/api/users", authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, nome: true, email: true, role: true, status: true, curso_id: true, created_at: true, curso: true }
    });
    res.json(usuarios);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

app.post("/api/users", authenticateToken, requireRole('admin'), async (req, res) => {
  const { nome, email, senha, role, curso_id, status } = req.body;
  try {
    const hash = await bcrypt.hash(senha, 10);
    const novo = await prisma.usuario.create({
      data: { nome, email, senha: hash, role, curso_id: curso_id || null, status: status || 'ativo' }
    });
    await registrarLog(req.user.id, 'CRIAR_USUARIO', `Admin criou o usuário ${email}`);
    res.status(201).json({ id: novo.id, nome: novo.nome, email: novo.email, role: novo.role, status: novo.status, curso_id: novo.curso_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

app.put("/api/users/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, email, senha, role, curso_id, status } = req.body;
  try {
    const data = { nome, email, role, curso_id, status };
    if (senha) {
      data.senha = await bcrypt.hash(senha, 10);
    }
    const updated = await prisma.usuario.update({
      where: { id },
      data
    });
    await registrarLog(req.user.id, 'EDITAR_USUARIO', `Admin editou o usuário ${email}`);
    res.json({ id: updated.id, nome: updated.nome, email: updated.email, role: updated.role, status: updated.status, curso_id: updated.curso_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao editar usuário." });
  }
});

app.patch("/api/users/:id/aprovar", authenticateToken, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const updated = await prisma.usuario.update({ where: { id }, data: { status: 'ativo' } });
    await registrarLog(req.user.id, 'APROVAR_USUARIO', `Admin aprovou o usuário ${updated.email}`);
    res.json({ success: true, status: updated.status });
  } catch (e) {
    res.status(500).json({ error: "Erro ao aprovar usuário." });
  }
});

app.patch("/api/users/:id/bloquear", authenticateToken, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const updated = await prisma.usuario.update({ where: { id }, data: { status: 'bloqueado' } });
    await registrarLog(req.user.id, 'BLOQUEAR_USUARIO', `Admin bloqueou o usuário ${updated.email}`);
    res.json({ success: true, status: updated.status });
  } catch (e) {
    res.status(500).json({ error: "Erro ao bloquear usuário." });
  }
});

app.delete("/api/users/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.usuario.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir usuário." });
  }
});

// ── Compromissos aprovados ────────────────────────────────────────────────────
app.get("/api/compromissos", authenticateToken, async (req, res) => {
  try {
    const compromissos = await prisma.compromisso.findMany({
      where: { status: 'aprovado' },
      orderBy: { dt_inicio: 'asc' }
    });
    res.json(compromissos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar compromissos." });
  }
});

// ── Compromissos pendentes (RBAC) ─────────────────────────────────────────────
app.get("/api/compromissos/pendentes", authenticateToken, requireRole('coordenador', 'admin'), async (req, res) => {
  try {
    const whereClause = { status: 'pendente' };
    if (req.user.role === 'coordenador') {
      whereClause.coordenador_id = req.user.id;
    }
    const pendentes = await prisma.compromisso.findMany({
      where: whereClause,
      orderBy: { created_at: 'asc' },
      include: {
        curso: true,
        categoria: true,
        usuario: { select: usuarioPublicSelect },
        coordenador: { select: usuarioPublicSelect }
      }
    });
    res.json(pendentes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar pendentes." });
  }
});

// ── Criar compromisso ─────────────────────────────────────────────────────────
app.get("/api/minhas-solicitacoes", authenticateToken, requireRole('secretaria'), async (req, res) => {
  try {
    const solicitacoes = await prisma.compromisso.findMany({
      where: { usuario_id: req.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        curso: true,
        categoria: true,
        coordenador: { select: usuarioPublicSelect }
      }
    });

    res.json(solicitacoes.map(toSolicitacaoSecretaria));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar suas solicitacoes." });
  }
});

app.post('/api/compromissos', authenticateToken, async (req, res) => {
  const { titulo, descricao, dt_inicio, dt_fim, curso_id, categoria_id, repeticao, coordenador_id } = req.body;

  const isSecretaria = req.user.role === 'secretaria';
  const coordenadorId = parseOptionalInt(coordenador_id);

  if (!titulo || !dt_inicio || !dt_fim) {
    return res.status(400).json({ error: "Informe titulo, data de inicio e data de fim." });
  }

  const dtInicio = new Date(dt_inicio);
  const dtFim = new Date(dt_fim);
  if (Number.isNaN(dtInicio.getTime()) || Number.isNaN(dtFim.getTime()) || dtFim <= dtInicio) {
    return res.status(400).json({ error: "Informe um periodo valido para o compromisso." });
  }

  if (isSecretaria && !coordenadorId) {
    return res.status(400).json({ error: "Selecione o coordenador responsavel pelo compromisso." });
  }

  try {
    let coordenador = null;
    if (coordenadorId) {
      coordenador = await prisma.usuario.findFirst({
        where: { id: coordenadorId, role: 'coordenador', status: 'ativo' },
        select: usuarioPublicSelect
      });

      if (!coordenador) {
        return res.status(400).json({ error: "Coordenador responsavel invalido ou inativo." });
      }
    }

    const cursoId = parseOptionalInt(curso_id);
    const categoriaId = parseOptionalInt(categoria_id);
    const data = {
      titulo,
      descricao,
      dt_inicio: dtInicio,
      dt_fim: dtFim,
      categoria_id: categoriaId,
      usuario_id: req.user.id,
      repeticao: repeticao || 'nenhuma',
    };

    if (isSecretaria) {
      Object.assign(data, {
        curso_id: cursoId || coordenador?.curso_id || null,
        coordenador_id: coordenadorId,
        status: 'pendente',
        aprovado_por: null,
        aprovado_em: null,
        respondido_em: null,
        mensagem_resposta: null,
        motivo_recusa: null,
      });
    } else if (req.user.role === 'coordenador') {
      Object.assign(data, {
        curso_id: req.user.curso_id || cursoId || null,
        coordenador_id: req.user.id,
        status: 'aprovado',
      });
    } else {
      Object.assign(data, {
        curso_id: cursoId || coordenador?.curso_id || null,
        coordenador_id: coordenadorId,
        status: 'aprovado',
      });
    }

    const novoCompromisso = await prisma.compromisso.create({
      data,
      include: {
        curso: true,
        categoria: true,
        usuario: { select: usuarioPublicSelect },
        coordenador: { select: usuarioPublicSelect }
      }
    });

    await registrarLog(req.user.id, 'CRIAR_COMPROMISSO', `Criou compromisso: ${titulo}`);

    if (isSecretaria && coordenador?.email) {
      sendReminder(coordenador.email, titulo, dt_inicio).catch(err => {
        console.error("Erro no e-mail de notificacao:", err);
      });
    }

    let compromissoResponse = novoCompromisso;
    if (novoCompromisso.status === 'aprovado' && novoCompromisso.coordenador_id) {
      const googleResult = await syncCompromissoToGoogleCalendarSafe(novoCompromisso);
      if (googleResult?.googleEventId) {
        compromissoResponse = { ...novoCompromisso, google_event_id: googleResult.googleEventId };
      }
    }

    res.status(201).json(compromissoResponse);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar compromisso." });
  }
});

// ── Editar compromisso ────────────────────────────────────────────────────────
app.put('/api/compromissos/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  const { titulo, descricao, dt_inicio, dt_fim, curso_id, categoria_id, repeticao } = req.body;

  try {
    const updated = await prisma.compromisso.update({
      where: { id },
      data: {
        ...(titulo && { titulo }),
        ...(descricao !== undefined && { descricao }),
        ...(dt_inicio && { dt_inicio: new Date(dt_inicio) }),
        ...(dt_fim && { dt_fim: new Date(dt_fim) }),
        ...(curso_id !== undefined && { curso_id: curso_id ? parseInt(curso_id) : null }),
        ...(categoria_id !== undefined && { categoria_id: categoria_id ? parseInt(categoria_id) : null }),
        ...(repeticao && { repeticao }),
      },
      include: {
        curso: true,
        categoria: true,
        usuario: { select: usuarioPublicSelect },
        coordenador: { select: usuarioPublicSelect }
      }
    });

    if (updated.google_event_id && updated.coordenador_id) {
      await updateGoogleCalendarEventSafe(updated);
    }

    await registrarLog(req.user.id, 'EDITAR_COMPROMISSO', `Editou compromisso: ${updated.titulo}`);
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Compromisso não encontrado.' });
    console.error(e);
    res.status(500).json({ error: "Erro ao editar compromisso." });
  }
});

// ── Aprovar compromisso (RBAC) ────────────────────────────────────────────────
app.patch('/api/compromissos/:id/aprovar', authenticateToken, requireRole('coordenador', 'admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { mensagem_resposta } = req.body || {};
  try {
    const comp = await prisma.compromisso.findUnique({ where: { id } });
    if (!comp) return res.status(404).json({ error: 'Compromisso não encontrado.' });

    if (req.user.role === 'coordenador' && comp.coordenador_id !== req.user.id) {
      return res.status(403).json({ error: 'Voce so pode aprovar compromissos enviados para voce.' });
    }

    if (comp.status !== 'pendente') {
      return res.status(400).json({ error: 'Esta solicitacao ja foi respondida.' });
    }

    const updated = await prisma.compromisso.update({
      where: { id },
      data: {
        status: 'aprovado',
        motivo_recusa: null,
        mensagem_resposta: mensagem_resposta?.trim() || 'Compromisso aprovado pelo coordenador.',
        aprovado_por: req.user.id,
        aprovado_em: new Date(),
        respondido_em: new Date(),
      },
      include: {
        curso: true,
        categoria: true,
        coordenador: { select: usuarioPublicSelect }
      }
    });

    await registrarLog(req.user.id, 'APROVAR_COMPROMISSO', `Aprovou compromisso: ${updated.titulo}`);

    let compromissoResponse = updated;
    const googleResult = await syncCompromissoToGoogleCalendarSafe(updated);
    if (googleResult?.googleEventId) {
      compromissoResponse = { ...updated, google_event_id: googleResult.googleEventId };
    }

    res.json(compromissoResponse);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao aprovar compromisso." });
  }
});

// ── Recusar compromisso (RBAC) ────────────────────────────────────────────────
app.patch('/api/compromissos/:id/recusar', authenticateToken, requireRole('coordenador', 'admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { motivo_recusa, mensagem_resposta } = req.body || {};
  try {
    const comp = await prisma.compromisso.findUnique({ where: { id } });
    if (!comp) return res.status(404).json({ error: 'Compromisso não encontrado.' });

    if (req.user.role === 'coordenador' && comp.coordenador_id !== req.user.id) {
      return res.status(403).json({ error: 'Voce so pode recusar compromissos enviados para voce.' });
    }

    if (comp.status !== 'pendente') {
      return res.status(400).json({ error: 'Esta solicitacao ja foi respondida.' });
    }

    const motivo = motivo_recusa?.trim();
    if (!motivo) {
      return res.status(400).json({ error: 'Informe o motivo da recusa.' });
    }

    const updated = await prisma.compromisso.update({
      where: { id },
      data: {
        status: 'recusado',
        aprovado_por: req.user.id,
        motivo_recusa: motivo,
        mensagem_resposta: mensagem_resposta?.trim() || motivo,
        respondido_em: new Date(),
      }
    });
    await registrarLog(req.user.id, 'RECUSAR_COMPROMISSO', `Recusou compromisso: ${updated.titulo}`);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao recusar compromisso." });
  }
});

// ── Excluir compromisso ───────────────────────────────────────────────────────
app.delete('/api/compromissos/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const comp = await prisma.compromisso.findUnique({
      where: { id },
      include: {
        curso: true,
        categoria: true,
        coordenador: { select: usuarioPublicSelect }
      }
    });

    if (!comp) return res.status(404).json({ error: 'Compromisso nao encontrado.' });

    if (comp.google_event_id && comp.coordenador_id) {
      await deleteGoogleCalendarEventSafe(comp);
    }

    await prisma.compromisso.delete({ where: { id } });
    await registrarLog(req.user.id, 'EXCLUIR_COMPROMISSO', `Excluiu compromisso id: ${id}`);
    res.json({ success: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Compromisso não encontrado.' });
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir compromisso." });
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ Backend Agenda UVV rodando na porta ${PORT}`);
  try {
    await prisma.$connect();
    console.log("✅ Conectado ao banco Supabase via Prisma.");
  } catch (e) {
    console.error("❌ Falha ao conectar ao banco:", e.message);
  }
});
