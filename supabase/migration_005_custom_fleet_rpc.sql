-- ============================================================
-- GalaxyDust Game — Migration 005: Custom Fleet RPC
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_custom_fleet(
  p_user_id uuid,
  p_fleet_name text,
  p_power_score numeric,
  p_ships_json jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_license_balance numeric;
  v_new_fleet_id uuid;
BEGIN
  -- 1. Verificar si el usuario tiene al menos 1 Licencia (usaremos pt_token como proxy temporal, puedes cambiar esto a gd_coin o lo que corresponda)
  SELECT pt_token INTO v_license_balance 
  FROM public.user_profiles 
  WHERE user_id = p_user_id;

  IF v_license_balance IS NULL OR v_license_balance < 1 THEN
    -- Si no hay pt_token, intentamos chequear si tiene gd_coin como fallback para testing (o lanzar error directamente)
    SELECT gd_coin INTO v_license_balance 
    FROM public.user_profiles 
    WHERE user_id = p_user_id;

    IF v_license_balance IS NULL OR v_license_balance < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'LICENCIA_INSUFICIENTE');
    END IF;
    
    -- Deducir gd_coin si no tenía pt_token
    UPDATE public.user_profiles
    SET gd_coin = gd_coin - 1
    WHERE user_id = p_user_id;
  ELSE
    -- Deducir pt_token
    UPDATE public.user_profiles
    SET pt_token = pt_token - 1
    WHERE user_id = p_user_id;
  END IF;

  -- 2. Insertar la nueva flota
  INSERT INTO public.sasori_fleets (user_id, name, total_power_score, ships)
  VALUES (p_user_id, p_fleet_name, p_power_score, p_ships_json)
  RETURNING id INTO v_new_fleet_id;

  -- 3. Retornar éxito
  RETURN jsonb_build_object(
    'success', true, 
    'fleet_id', v_new_fleet_id,
    'message', 'Flota compilada exitosamente.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
