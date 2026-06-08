-- Support student login by academic registration number while preserving existing email logins.
ALTER TABLE "usuarios" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "matricula" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_matricula_key" ON "usuarios"("matricula");
CREATE INDEX IF NOT EXISTS "usuarios_matricula_idx" ON "usuarios"("matricula");
