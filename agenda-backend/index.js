const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { sendReminder } = require("./emailService");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_uvv_2026';

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
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend Agenda UVV online" });
});

// ── Cursos ────────────────────────────────────────────────────────────────────
app.get("/api/cursos", async (req, res) => {
  try {
    const cursos = await prisma.curso.findMany({ orderBy: { id: 'asc' } });
    res.json(cursos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar cursos." });
  }
});

// ── Categorias ────────────────────────────────────────────────────────────────
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
      whereClause.curso_id = req.user.curso_id;
    }
    const pendentes = await prisma.compromisso.findMany({
      where: whereClause,
      orderBy: { created_at: 'asc' },
      include: { curso: true, categoria: true, usuario: true }
    });
    res.json(pendentes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar pendentes." });
  }
});

// ── Criar compromisso ─────────────────────────────────────────────────────────
app.post('/api/compromissos', authenticateToken, async (req, res) => {
  const { titulo, descricao, dt_inicio, dt_fim, curso_id, categoria_id, repeticao } = req.body;

  const isSecretaria = req.user.role === 'secretaria';

  try {
    const novoCompromisso = await prisma.compromisso.create({
      data: {
        titulo,
        descricao,
        dt_inicio:    new Date(dt_inicio),
        dt_fim:       new Date(dt_fim),
        curso_id:     curso_id     ? parseInt(curso_id)     : null,
        categoria_id: categoria_id ? parseInt(categoria_id) : null,
        usuario_id:   req.user.id,
        repeticao:    repeticao || 'nenhuma',
        status:       isSecretaria ? 'pendente' : 'aprovado',
      }
    });

    await registrarLog(req.user.id, 'CRIAR_COMPROMISSO', `Criou compromisso: ${titulo}`);

    // Notifica coordenador por e-mail (não bloqueia a resposta)
    sendReminder('coordenador@uvv.br', titulo, dt_inicio).catch(err => {
      console.error("Erro no e-mail de notificação:", err);
    });

    res.status(201).json(novoCompromisso);
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
        ...(titulo        && { titulo }),
        ...(descricao     !== undefined && { descricao }),
        ...(dt_inicio     && { dt_inicio:    new Date(dt_inicio) }),
        ...(dt_fim        && { dt_fim:       new Date(dt_fim) }),
        ...(curso_id      !== undefined && { curso_id:     curso_id     ? parseInt(curso_id)     : null }),
        ...(categoria_id  !== undefined && { categoria_id: categoria_id ? parseInt(categoria_id) : null }),
        ...(repeticao     && { repeticao }),
      }
    });
    
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
  try {
    const comp = await prisma.compromisso.findUnique({ where: { id } });
    if (!comp) return res.status(404).json({ error: 'Compromisso não encontrado.' });
    
    if (req.user.role === 'coordenador' && comp.curso_id !== req.user.curso_id) {
      return res.status(403).json({ error: 'Você só pode aprovar compromissos do seu próprio curso.' });
    }

    const updated = await prisma.compromisso.update({
      where: { id },
      data: {
        status:       'aprovado',
        aprovado_por: req.user.id,
        aprovado_em:  new Date(),
      }
    });

    await registrarLog(req.user.id, 'APROVAR_COMPROMISSO', `Aprovou compromisso: ${updated.titulo}`);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao aprovar compromisso." });
  }
});

// ── Recusar compromisso (RBAC) ────────────────────────────────────────────────
app.patch('/api/compromissos/:id/recusar', authenticateToken, requireRole('coordenador', 'admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { motivo_recusa } = req.body;
  try {
    const comp = await prisma.compromisso.findUnique({ where: { id } });
    if (!comp) return res.status(404).json({ error: 'Compromisso não encontrado.' });
    
    if (req.user.role === 'coordenador' && comp.curso_id !== req.user.curso_id) {
      return res.status(403).json({ error: 'Você só pode recusar compromissos do seu próprio curso.' });
    }

    const updated = await prisma.compromisso.update({
      where: { id },
      data: {
        status:       'recusado',
        motivo_recusa: motivo_recusa || null,
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
    const comp = await prisma.compromisso.delete({ where: { id } });
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
