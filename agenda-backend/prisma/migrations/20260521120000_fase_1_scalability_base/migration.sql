-- Fase 1: indexes for frequent queries and minimal action audit log.

CREATE TABLE IF NOT EXISTS "logs_acoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" INTEGER,
    "detalhes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_acoes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'logs_acoes_usuario_id_fkey'
  ) THEN
    ALTER TABLE "logs_acoes"
      ADD CONSTRAINT "logs_acoes_usuario_id_fkey"
      FOREIGN KEY ("usuario_id")
      REFERENCES "usuarios"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "logs_acoes_usuario_id_created_at_idx" ON "logs_acoes"("usuario_id", "created_at");
CREATE INDEX IF NOT EXISTS "logs_acoes_entidade_entidade_id_idx" ON "logs_acoes"("entidade", "entidade_id");
CREATE INDEX IF NOT EXISTS "logs_acoes_acao_created_at_idx" ON "logs_acoes"("acao", "created_at");

CREATE INDEX IF NOT EXISTS "usuarios_role_status_idx" ON "usuarios"("role", "status");
CREATE INDEX IF NOT EXISTS "usuarios_curso_id_idx" ON "usuarios"("curso_id");
CREATE INDEX IF NOT EXISTS "usuarios_created_at_idx" ON "usuarios"("created_at");

CREATE INDEX IF NOT EXISTS "notificacoes_lida_idx" ON "notificacoes"("lida");
CREATE INDEX IF NOT EXISTS "notificacoes_created_at_idx" ON "notificacoes"("created_at");
CREATE INDEX IF NOT EXISTS "notificacoes_referencia_tipo_referencia_id_idx" ON "notificacoes"("referencia_tipo", "referencia_id");

CREATE INDEX IF NOT EXISTS "cursos_created_at_idx" ON "cursos"("created_at");
CREATE INDEX IF NOT EXISTS "categorias_created_at_idx" ON "categorias"("created_at");

CREATE INDEX IF NOT EXISTS "compromissos_usuario_id_idx" ON "compromissos"("usuario_id");
CREATE INDEX IF NOT EXISTS "compromissos_coordenador_id_idx" ON "compromissos"("coordenador_id");
CREATE INDEX IF NOT EXISTS "compromissos_curso_id_idx" ON "compromissos"("curso_id");
CREATE INDEX IF NOT EXISTS "compromissos_categoria_id_idx" ON "compromissos"("categoria_id");
CREATE INDEX IF NOT EXISTS "compromissos_status_idx" ON "compromissos"("status");
CREATE INDEX IF NOT EXISTS "compromissos_created_at_idx" ON "compromissos"("created_at");
CREATE INDEX IF NOT EXISTS "compromissos_dt_inicio_idx" ON "compromissos"("dt_inicio");
CREATE INDEX IF NOT EXISTS "compromissos_dt_fim_idx" ON "compromissos"("dt_fim");
CREATE INDEX IF NOT EXISTS "compromissos_coordenador_id_status_dt_inicio_idx" ON "compromissos"("coordenador_id", "status", "dt_inicio");
CREATE INDEX IF NOT EXISTS "compromissos_usuario_id_status_dt_inicio_idx" ON "compromissos"("usuario_id", "status", "dt_inicio");
CREATE INDEX IF NOT EXISTS "compromissos_curso_id_status_dt_inicio_idx" ON "compromissos"("curso_id", "status", "dt_inicio");
