-- migration_002_profiles_and_economy.sql

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username text,
  avatar_url text,
  power_score numeric DEFAULT 0,
  
  -- Currencies
  gd_coin numeric DEFAULT 0,
  quantum_credit numeric DEFAULT 0,
  halloween_coin numeric DEFAULT 0,
  phantom_coin numeric DEFAULT 0,
  xmas_coin numeric DEFAULT 0,
  valentine_coin numeric DEFAULT 0,
  
  -- Resources
  metal numeric DEFAULT 0,
  crystal numeric DEFAULT 0,
  deuterium numeric DEFAULT 0,
  dark_matter numeric DEFAULT 0,
  omniplate numeric DEFAULT 0,
  orichaltron numeric DEFAULT 0,
  lunar_fiber numeric DEFAULT 0,
  infinite_core numeric DEFAULT 0,
  primal_token numeric DEFAULT 0,
  xenoplasm numeric DEFAULT 0,
  organium numeric DEFAULT 0,
  mana numeric DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para lectura y actualización del propio usuario
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- 2. Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, gd_coin, metal, crystal)
  VALUES (new.id, split_part(new.email, '@', 1), 100, 500, 500);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurarnos de borrar el trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. RPC increment_player_resource
CREATE OR REPLACE FUNCTION public.increment_player_resource(user_uuid uuid, resource_col text, increment_amount numeric)
RETURNS void AS $$
BEGIN
  -- SQL dinámico para incrementar la columna específica
  EXECUTE format('UPDATE public.user_profiles SET %I = COALESCE(%I, 0) + $1 WHERE user_id = $2', resource_col, resource_col)
  USING increment_amount, user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC update_user_power
CREATE OR REPLACE FUNCTION public.update_user_power(user_uuid uuid, amount numeric)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET power_score = COALESCE(power_score, 0) + amount 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
