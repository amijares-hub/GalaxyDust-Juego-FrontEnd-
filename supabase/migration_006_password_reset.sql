-- migration_006_password_reset.sql
-- Añadir bandera must_reset_password para forzar restablecimiento de clave

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;
