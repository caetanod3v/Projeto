-- Store coordinator approval/rejection feedback for the requester.
ALTER TABLE "compromissos" ADD COLUMN "mensagem_resposta" TEXT;
ALTER TABLE "compromissos" ADD COLUMN "respondido_em" TIMESTAMP(3);
