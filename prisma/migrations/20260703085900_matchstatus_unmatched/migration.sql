-- Vlera e re e enum-it duhet committuar para se të përdoret (kufizim Postgres),
-- prandaj është migration i veçantë nga 20260703090000_osm_places.
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'UNMATCHED';
