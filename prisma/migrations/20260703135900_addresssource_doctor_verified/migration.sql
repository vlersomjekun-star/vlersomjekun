-- Vlera e re duhet committuar para se të përdoret (kufizim Postgres) —
-- migration i veçantë nga 20260703140000_doctor_claim.
ALTER TYPE "AddressSource" ADD VALUE IF NOT EXISTS 'DOCTOR_VERIFIED';
