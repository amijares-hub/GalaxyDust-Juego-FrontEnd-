-- ============================================================
-- GalaxyDust Game — Migration 003: active_expeditions
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.active_expeditions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sector_name  TEXT NOT NULL,
  duration_hours NUMERIC NOT NULL,
  ship_type    TEXT NOT NULL,
  risk_factor  NUMERIC DEFAULT 0,
  status       TEXT DEFAULT 'LAUNCHED' CHECK (status IN ('LAUNCHED', 'SUCCESS', 'FAILED')),
  launch_time           TIMESTAMPTZ DEFAULT now() NOT NULL,
  estimated_return_time TIMESTAMPTZ NOT NULL,
  reward_est   JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. ENABLE RLS
ALTER TABLE public.active_expeditions ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES

-- Cada jugador sólo puede ver sus propias expediciones
DROP POLICY IF EXISTS "Users can view own expeditions" ON public.active_expeditions;
CREATE POLICY "Users can view own expeditions"
  ON public.active_expeditions FOR SELECT
  USING (auth.uid() = user_id);

-- Cada jugador sólo puede lanzar expediciones con su propio user_id
DROP POLICY IF EXISTS "Users can insert own expeditions" ON public.active_expeditions;
CREATE POLICY "Users can insert own expeditions"
  ON public.active_expeditions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cada jugador puede actualizar el estado de sus propias expediciones
DROP POLICY IF EXISTS "Users can update own expeditions" ON public.active_expeditions;
CREATE POLICY "Users can update own expeditions"
  ON public.active_expeditions FOR UPDATE
  USING (auth.uid() = user_id);

-- Cada jugador puede eliminar sus propias expediciones completadas
DROP POLICY IF EXISTS "Users can delete own expeditions" ON public.active_expeditions;
CREATE POLICY "Users can delete own expeditions"
  ON public.active_expeditions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_expeditions_user_id ON public.active_expeditions(user_id);
CREATE INDEX IF NOT EXISTS idx_expeditions_status ON public.active_expeditions(status);

-- 5. RPC: resolve_expedition_loot
-- Resuelve el botín de una expedición de forma segura en el servidor.
-- Calcula éxito/fallo con base en risk_factor y acredita recursos al jugador.
CREATE OR REPLACE FUNCTION public.resolve_expedition_loot(p_expedition_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_expedition   public.active_expeditions%ROWTYPE;
  v_roll         numeric;
  v_success      boolean;
  v_metal_reward numeric;
  v_crystal_reward numeric;
BEGIN
  -- Obtener la expedición (sólo si pertenece al usuario autenticado)
  SELECT * INTO v_expedition
  FROM public.active_expeditions
  WHERE id = p_expedition_id
    AND user_id = auth.uid()
    AND status = 'LAUNCHED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expedición no encontrada o ya procesada.';
  END IF;

  -- Calcular éxito basado en risk_factor (0-1)
  v_roll    := random();
  v_success := v_roll > v_expedition.risk_factor;

  IF v_success THEN
    -- Calcular recompensas proporcionales a la duración
    v_metal_reward   := FLOOR(v_expedition.duration_hours * 100 + random() * 200);
    v_crystal_reward := FLOOR(v_expedition.duration_hours * 50 + random() * 100);

    -- Actualizar recursos del jugador
    UPDATE public.user_profiles
    SET
      metal   = COALESCE(metal, 0) + v_metal_reward,
      crystal = COALESCE(crystal, 0) + v_crystal_reward
    WHERE user_id = auth.uid();

    -- Marcar expedición como exitosa
    UPDATE public.active_expeditions
    SET status = 'SUCCESS'
    WHERE id = p_expedition_id;

    RETURN jsonb_build_object(
      'status', 'SUCCESS',
      'rewards', jsonb_build_object('metal', v_metal_reward, 'crystal', v_crystal_reward)
    );
  ELSE
    -- Expedición fallida: marcar y no dar recursos
    UPDATE public.active_expeditions
    SET status = 'FAILED'
    WHERE id = p_expedition_id;

    RETURN jsonb_build_object(
      'status', 'FAILED',
      'rewards', jsonb_build_object('metal', 0, 'crystal', 0)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
