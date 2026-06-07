-- Add daily recurrence support without changing existing commitments.
ALTER TYPE "Repeticao" ADD VALUE IF NOT EXISTS 'diaria';
