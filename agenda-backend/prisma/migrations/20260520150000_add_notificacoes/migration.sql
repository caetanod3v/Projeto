CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia_id" INTEGER,
    "referencia_tipo" TEXT,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notificacoes_usuario_id_created_at_idx" ON "notificacoes"("usuario_id", "created_at");
CREATE INDEX "notificacoes_usuario_id_lida_idx" ON "notificacoes"("usuario_id", "lida");

ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
