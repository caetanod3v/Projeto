-- Add coordinator ownership to approval requests.
ALTER TABLE "compromissos" ADD COLUMN "coordenador_id" INTEGER;

CREATE INDEX "compromissos_coordenador_id_idx" ON "compromissos"("coordenador_id");

ALTER TABLE "compromissos"
  ADD CONSTRAINT "compromissos_coordenador_id_fkey"
  FOREIGN KEY ("coordenador_id")
  REFERENCES "usuarios"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
