const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const deleteOrphans = args.has('--delete-orphans');

const userSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  status: true,
  curso_id: true,
};

const summarize = (compromisso, reason) => ({
  id: compromisso.id,
  titulo: compromisso.titulo,
  status: compromisso.status,
  curso_id: compromisso.curso_id,
  usuario_id: compromisso.usuario_id,
  usuario_role: compromisso.usuario?.role || null,
  coordenador_id: compromisso.coordenador_id,
  coordenador_nome: compromisso.coordenador?.nome || null,
  reason,
});

async function main() {
  const compromissos = await prisma.compromisso.findMany({
    orderBy: { id: 'asc' },
    include: {
      usuario: { select: userSelect },
      coordenador: { select: userSelect },
    },
  });

  const fixes = [];
  const removals = [];

  for (const compromisso of compromissos) {
    const creator = compromisso.usuario;
    const coordinator = compromisso.coordenador;

    if (!compromisso.coordenador_id) {
      if (creator?.role === 'coordenador') {
        fixes.push({
          id: compromisso.id,
          reason: 'coordenador_id ausente em compromisso criado por coordenador',
          data: {
            coordenador_id: creator.id,
            curso_id: creator.curso_id || compromisso.curso_id || null,
          },
        });
      } else {
        removals.push(summarize(compromisso, 'sem coordenador_id e sem inferencia segura'));
      }
      continue;
    }

    if (!coordinator) {
      removals.push(summarize(compromisso, 'coordenador_id aponta para usuario inexistente'));
      continue;
    }

    if (coordinator.role !== 'coordenador') {
      removals.push(summarize(compromisso, 'coordenador_id aponta para usuario que nao e coordenador'));
      continue;
    }

    if (coordinator.status !== 'ativo') {
      removals.push(summarize(compromisso, 'coordenador vinculado nao esta ativo'));
      continue;
    }

    if (creator?.role === 'coordenador' && compromisso.coordenador_id !== creator.id) {
      removals.push(summarize(compromisso, 'compromisso criado por coordenador vinculado a outro coordenador'));
      continue;
    }

    if (coordinator.curso_id && compromisso.curso_id !== coordinator.curso_id) {
      fixes.push({
        id: compromisso.id,
        reason: 'curso_id diferente do curso do coordenador',
        data: { curso_id: coordinator.curso_id },
      });
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    deleteOrphans,
    total: compromissos.length,
    fixes,
    removals,
  }, null, 2));

  if (!apply) {
    console.log('Dry-run apenas. Use --apply para corrigir campos seguros. Use --apply --delete-orphans para remover itens listados em removals.');
    return;
  }

  for (const fix of fixes) {
    await prisma.compromisso.update({
      where: { id: fix.id },
      data: fix.data,
    });
  }

  if (deleteOrphans && removals.length > 0) {
    await prisma.compromisso.deleteMany({
      where: { id: { in: removals.map((item) => item.id) } },
    });
  }

  console.log(`Aplicado. Corrigidos: ${fixes.length}. Removidos: ${deleteOrphans ? removals.length : 0}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
