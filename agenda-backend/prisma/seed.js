const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco...');

  const senhaPadrao = await bcrypt.hash('uvv@123', 10);

  // ── Cursos ────────────────────────────────────────────────────────────────
  const cursoNames = [
    'Ciência da Computação',
    'Direito',
    'Análise e Desenvolvimento de Sistemas',
    'Engenharia de Software',
    'Engenharia da Computação',
  ];
  const cursos = [];
  for (const nome of cursoNames) {
    const c = await prisma.curso.upsert({
      where: { id: cursoNames.indexOf(nome) + 1 },
      update: { nome },
      create: { nome },
    });
    cursos.push(c);
  }
  console.log('✅ Cursos criados:', cursos.length);

  // ── Usuários ──────────────────────────────────────────────────────────────
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@uvv.br' },
    update: { senha: senhaPadrao, status: 'ativo' },
    create: { nome: 'Administrador', email: 'admin@uvv.br', role: 'admin', senha: senhaPadrao, status: 'ativo' },
  });
  const u1 = await prisma.usuario.upsert({
    where: { email: 'joao@uvv.br' },
    update: { senha: senhaPadrao, curso_id: cursos[0].id, status: 'ativo' },
    create: { nome: 'João Coordenador', email: 'joao@uvv.br', role: 'coordenador', senha: senhaPadrao, curso_id: cursos[0].id, status: 'ativo' },
  });
  const u2 = await prisma.usuario.upsert({
    where: { email: 'maria@uvv.br' },
    update: { senha: senhaPadrao, curso_id: cursos[1].id, status: 'ativo' },
    create: { nome: 'Maria Silva', email: 'maria@uvv.br', role: 'coordenador', senha: senhaPadrao, curso_id: cursos[1].id, status: 'ativo' },
  });
  const u3 = await prisma.usuario.upsert({
    where: { email: 'carlos@uvv.br' },
    update: { senha: senhaPadrao, curso_id: cursos[2].id, status: 'ativo' },
    create: { nome: 'Carlos Souza', email: 'carlos@uvv.br', role: 'coordenador', senha: senhaPadrao, curso_id: cursos[2].id, status: 'ativo' },
  });
  const sec1 = await prisma.usuario.upsert({
    where: { email: 'secretaria@uvv.br' },
    update: { senha: senhaPadrao, status: 'ativo' },
    create: { nome: 'Ana Secretaria', email: 'secretaria@uvv.br', role: 'secretaria', senha: senhaPadrao, status: 'ativo' },
  });
  console.log('✅ Usuários criados:', admin.nome, u1.nome, u2.nome, u3.nome, sec1.nome);

  // ── Categorias ────────────────────────────────────────────────────────────
  const categoriaData = [
    { nome: 'Reuniões',           cor_hex: '#0D234A' },
    { nome: 'Prazos Acadêmicos',  cor_hex: '#F2B200' },
    { nome: 'Aulas',              cor_hex: '#4CAF50' },
    { nome: 'Conselhos',          cor_hex: '#9C27B0' },
    { nome: 'Outros',             cor_hex: '#607D8B' },
  ];
  const categorias = [];
  for (const data of categoriaData) {
    const cat = await prisma.categoria.upsert({
      where: { id: categoriaData.indexOf(data) + 1 },
      update: data,
      create: data,
    });
    categorias.push(cat);
  }
  console.log('✅ Categorias criadas:', categorias.length);

  // ── Compromissos ──────────────────────────────────────────────────────────
  // Limpa compromissos existentes antes de re-seedar
  await prisma.compromisso.deleteMany({});

  const today = new Date();
  const fakeEvents = [
    { daysOffset: -2, hour: 11, title: 'Reunião Anual Administrativa' },
    { daysOffset: -1, hour: 10, title: 'Reunião de Colegiado do Curso' },
    { daysOffset:  0, hour:  8, title: 'Fechamento de Pauta Escolar' },
    { daysOffset:  0, hour: 10, title: 'Integração de Calouros' },
    { daysOffset:  0, hour: 14, title: 'Banca de Defesa de TCC' },
    { daysOffset:  0, hour: 18, title: 'Apresentação de Projeto Integrador' },
    { daysOffset:  1, hour:  9, title: 'Reunião NDE (Núcleo Docente Estruturante)' },
    { daysOffset:  1, hour: 16, title: 'Conselho de Classe' },
    { daysOffset:  2, hour: 10, title: 'Oficina de Práticas Pedagógicas' },
    { daysOffset:  3, hour: 15, title: 'Alinhamento com Ligas Acadêmicas' },
    { daysOffset:  5, hour: 14, title: 'Avaliação do MEC - Reunião Prévia' },
  ];

  const usuarios = [u1, u2, u3];

  for (let i = 0; i < fakeEvents.length; i++) {
    const evt = fakeEvents[i];

    const dtInicio = new Date(today);
    dtInicio.setDate(today.getDate() + evt.daysOffset);
    dtInicio.setHours(evt.hour, 0, 0, 0);

    const dtFim = new Date(dtInicio);
    dtFim.setHours(dtInicio.getHours() + (i % 2 === 0 ? 2 : 1));

    await prisma.compromisso.create({
      data: {
        titulo:       evt.title,
        descricao:    'Pauta obrigatória para tratar assuntos acadêmicos. Presença requerida.',
        dt_inicio:    dtInicio,
        dt_fim:       dtFim,
        curso_id:     cursos[i % 5].id,
        categoria_id: categorias[i % 5].id,
        usuario_id:   usuarios[i % 3].id,
        repeticao:    'nenhuma',
        status:       'aprovado',
      },
    });
  }

  console.log('✅ Compromissos criados:', fakeEvents.length);
  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
