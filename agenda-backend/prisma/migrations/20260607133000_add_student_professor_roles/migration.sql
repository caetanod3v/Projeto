-- Add read-only academic audience roles.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'aluno';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'professor';
