-- Add DRAFT and QUEUED to VideoStatus.
--
-- DRAFT: a project created but never rendered (e.g. instantiated from a
--        template). It was previously mislabelled PROCESSING, which made such
--        projects appear to be rendering forever.
-- QUEUED: a generation job accepted and enqueued, not yet picked up by a worker.
--
-- Postgres appends enum values; existing rows are untouched. `IF NOT EXISTS`
-- keeps this idempotent if a database was already patched by hand.

ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
