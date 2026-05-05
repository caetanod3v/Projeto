const express = require('express');
const cors = require('cors');
const { sendReminder } = require('./emailService');
const { iniciarCronJobs } = require('./cronService');

const app = express();
app.use(cors({
  origin: '*' // Permitir localhost para o dev
}));
app.use(express.json());

// Seed in-memory database as Supabase/Docker setup was deferred
let compromissos = [];

const usuarios = [
  { id: 1, nome: 'João Coordenador', email: 'joao@uvv.br', role: 'coordenador' },
  { id: 2, nome: 'Maria Silva', email: 'maria@uvv.br', role: 'coordenador' },
  { id: 3, nome: 'Carlos Souza', email: 'carlos@uvv.br', role: 'coordenador' },
];

const cursos = [
  { id: 1, nome: 'Ciência da Computação' },
  { id: 2, nome: 'Direito' },
  { id: 3, nome: 'Análise e Desenvolvimento de Sistemas' },
  { id: 4, nome: 'Engenharia de Software' },
  { id: 5, nome: 'Engenharia da Computação' }
];

const categorias = [
  { id: 1, nome: 'Reuniões', cor_hex: '#0D234A' }, // UVV Dark Blue
  { id: 2, nome: 'Prazos Acadêmicos', cor_hex: '#F2B200' }, // UVV Yellow
  { id: 3, nome: 'Aulas', cor_hex: '#4CAF50' }, // Green
  { id: 4, nome: 'Conselhos', cor_hex: '#9C27B0' }, // Purple
  { id: 5, nome: 'Outros', cor_hex: '#607D8B' } // GreyBlue
];

// Seed realistic academic events across different dates
const today = new Date();
const fakeEvents = [
  { daysOffset: -1, hour: 10,  title: "Reunião de Colegiado do Curso" },
  { daysOffset: 0,  hour: 8,   title: "Fechamento de Pauta Escolar [OK]" },
  { daysOffset: 0,  hour: 14,  title: "Banca de Defesa de TCC" },
  { daysOffset: 0,  hour: 18,  title: "Apresentação de Projeto Integrador" },
  { daysOffset: 1,  hour: 9,   title: "Reunião NDE (Núcleo Docente Estruturante)" },
  { daysOffset: 1,  hour: 16,  title: "Conselho de Classe" },
  { daysOffset: 2,  hour: 10,  title: "Oficina de Práticas Pedagógicas" },
  { daysOffset: 3,  hour: 15,  title: "Alinhamento com Ligas Acadêmicas" },
  { daysOffset: -2, hour: 11,  title: "Reunião Anual Administrativa [OK]"},
  { daysOffset: 5,  hour: 14,  title: "Avaliação do MEC - Reunião Prévia" },
  { daysOffset: 0,  hour: Math.max(9, today.getHours() - 2), title: "Integração de Calouros" } // Evento que sempre ficará "Atrasado/Em andamento" hoje
];

fakeEvents.forEach((evt, idx) => {
  const i = idx + 1;
  const dtInicio = new Date(today);
  dtInicio.setDate(today.getDate() + evt.daysOffset);
  dtInicio.setHours(evt.hour, 0, 0);
  
  const dtFim = new Date(dtInicio);
  // Duração de 1 a 2 horas
  dtFim.setHours(dtInicio.getHours() + ((i % 2 === 0) ? 2 : 1));

  compromissos.push({
    id: i,
    titulo: evt.title,
    descricao: `Pauta obrigatória para tratar assuntos acadêmicos. Presença requerida.`,
    dt_inicio: dtInicio.toISOString(),
    dt_fim: dtFim.toISOString(),
    curso_id: (i % 5) + 1,
    categoria_id: (i % 5) + 1,
    usuario_id: (i % 3) + 1,
    repeticao: 'nenhuma',
    status: 'aprovado'
  });
});

// REST Endpoints
app.get('/api/cursos', (req, res) => res.json(cursos));
app.get('/api/categorias', (req, res) => res.json(categorias));
app.get('/api/usuarios', (req, res) => res.json(usuarios));

app.get('/api/compromissos', (req, res) => {
  res.json(compromissos.filter(c => c.status === 'aprovado'));
});

app.get('/api/compromissos/pendentes', (req, res) => {
  res.json(compromissos.filter(c => c.status === 'pendente'));
});

app.post('/api/compromissos', async (req, res) => {
  const { titulo, descricao, dt_inicio, dt_fim, curso_id, categoria_id, repeticao, usuario_role } = req.body;
  
  const isSecretaria = usuario_role === 'secretaria';
  
  const novoCompromisso = {
    id: compromissos.length + 1,
    titulo, descricao, dt_inicio, dt_fim, curso_id, categoria_id, repeticao,
    usuario_id: 1, // mock
    status: isSecretaria ? 'pendente' : 'aprovado'
  };
  
  compromissos.push(novoCompromisso);

  // Send an email safely without blocking the HTTP Response
  try {
    sendReminder('coordenador@uvv.br', titulo, dt_inicio).catch(err => {
      console.error("Async Nodemailer error:", err);
    });
  } catch(err) {
    console.error("Nodemailer error:", err);
  }

  res.status(201).json(novoCompromisso);
});

app.put('/api/compromissos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = compromissos.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).send('Not found');
  
  compromissos[index] = { ...compromissos[index], ...req.body };
  res.json(compromissos[index]);
});

app.patch('/api/compromissos/:id/aprovar', (req, res) => {
  const id = parseInt(req.params.id);
  const index = compromissos.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).send('Not found');
  
  compromissos[index].status = 'aprovado';
  res.json(compromissos[index]);
});

app.patch('/api/compromissos/:id/recusar', (req, res) => {
  const id = parseInt(req.params.id);
  const index = compromissos.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).send('Not found');
  
  compromissos[index].status = 'recusado';
  res.json(compromissos[index]);
});

app.delete('/api/compromissos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  compromissos = compromissos.filter(c => c.id !== id);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  console.log(`DB In-Memory Seeded: 3 usuarios, 2 cursos, 5 tags, 10 eventos.`);
  
  // Start the background cron jobs for email reminders
  iniciarCronJobs(compromissos, usuarios);
});
