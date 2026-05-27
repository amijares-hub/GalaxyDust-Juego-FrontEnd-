-- ============================================================
-- GalaxyDust Game — Migration 004: sasori_fleets & celestial nodes
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. ADD MISSING COLUMNS TO active_expeditions (if migration_003 was already run)
ALTER TABLE public.active_expeditions ADD COLUMN IF NOT EXISTS fleet_id   uuid;
ALTER TABLE public.active_expeditions ADD COLUMN IF NOT EXISTS fleet_name text;
ALTER TABLE public.active_expeditions ADD COLUMN IF NOT EXISTS is_adrift  boolean DEFAULT false;

-- 2. SASORI_FLEETS TABLE
CREATE TABLE IF NOT EXISTS public.sasori_fleets (
  id                uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              text    NOT NULL,
  total_power_score numeric DEFAULT 0,
  ships             jsonb   DEFAULT '[]'::jsonb,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.sasori_fleets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fleets"   ON public.sasori_fleets;
DROP POLICY IF EXISTS "Users can create own fleets" ON public.sasori_fleets;
DROP POLICY IF EXISTS "Users can update own fleets" ON public.sasori_fleets;
DROP POLICY IF EXISTS "Users can delete own fleets" ON public.sasori_fleets;

CREATE POLICY "Users can view own fleets"
  ON public.sasori_fleets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own fleets"
  ON public.sasori_fleets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fleets"
  ON public.sasori_fleets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fleets"
  ON public.sasori_fleets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sasori_fleets_user_id ON public.sasori_fleets(user_id);

-- 3. DISCOVERED_CELESTIAL_NODES TABLE
CREATE TABLE IF NOT EXISTS public.discovered_celestial_nodes (
  id                   uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_name         text    NOT NULL,
  galaxy_name          text    NOT NULL,
  node_name            text    NOT NULL,
  node_type            text    NOT NULL,
  discovered_by_user_id uuid   REFERENCES auth.users(id) ON DELETE SET NULL,
  discovered_by_username text,
  risk_factor          numeric DEFAULT 0.2,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE public.discovered_celestial_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read celestial nodes"    ON public.discovered_celestial_nodes;
DROP POLICY IF EXISTS "Auth users can discover nodes"  ON public.discovered_celestial_nodes;

-- Todos pueden leer el mapa de nodos descubiertos
CREATE POLICY "Public read celestial nodes"
  ON public.discovered_celestial_nodes FOR SELECT
  USING (true);

-- Solo usuarios autenticados pueden registrar descubrimientos
CREATE POLICY "Auth users can discover nodes"
  ON public.discovered_celestial_nodes FOR INSERT
  WITH CHECK (auth.uid() = discovered_by_user_id);

CREATE INDEX IF NOT EXISTS idx_nodes_cluster ON public.discovered_celestial_nodes(cluster_name);
CREATE INDEX IF NOT EXISTS idx_nodes_galaxy  ON public.discovered_celestial_nodes(galaxy_name);

-- 4. SEED INITIAL DISCOVERED NODES (mock data para el MVP)
INSERT INTO public.discovered_celestial_nodes
  (cluster_name, galaxy_name, node_name, node_type, discovered_by_username, risk_factor)
VALUES
  ('INARA',        'Inara-Prime',            'Nebulosa Áurea',        'Yacimiento Metal',       'Commander_Alpha', 0.10),
  ('INARA',        'Inara-Prime',            'Cinturón Argón',        'Depósito Cristal',       'StarPilot_77',    0.12),
  ('INARA',        'Inara-Secundus',         'Pulsar SR-4',           'Anomalía Energética',    'Xeno_Explorer',   0.15),
  ('QUEOPS',       'Queops-Alpha',           'Fosa Azul-K',           'Yacimiento Deuterio',    'DeepSpace_9',     0.20),
  ('QUEOPS',       'Queops-Sector VII',      'Nodo Óptico Q7',        'Relay Cuántico',         'Commander_Alpha', 0.22),
  ('ORIOUS',       'Orious-Belt',            'Roca Plata-X',          'Asteroid Mineral',       'MineralHunter',   0.30),
  ('ORIOUS',       'Orious-Halo',            'Cráter Osmio',          'Depósito Omniplate',     'Void_Walker',     0.32),
  ('ANHECLETHUS',  'Anheclethus-Core',       'Singularidad H-01',     'Anomalía Orichaltron',   'Void_Walker',     0.42),
  ('ANHECLETHUS',  'Anheclethus-Nebula',     'Huracán Plasmático',    'Zona de Radiación',      'DarkMatter_X',    0.45),
  ('DIMERTRA',     'Dimertra-Station',       'Muelle Corsario D9',    'Estación Pirata',        'BountyXR',        0.53),
  ('AVRENIM',      'Avrenim-Apex',           'Frente de Batalla AV',  'Zona de Guerra Activa',  'WarFleet_01',     0.66),
  ('CASSIO',       'Cassio-Main',            'Espejo Negro',          'Materia Oscura',         'DarkMatter_X',    0.77),
  ('CASSIO',       'Cassio-Dark',            'Rift Oculto',           'Fisura Dimensional',     'SYSTEM',          0.80),
  ('MENESIA',      'Menesia-Abyss',          'Vórtex Final',          'Infinite Core',          'SYSTEM',          0.95),
  ('MENESIA',      'Menesia-Singularity',    'El Umbral',             'Punto de No Retorno',    'SYSTEM',          0.99)
ON CONFLICT DO NOTHING;
