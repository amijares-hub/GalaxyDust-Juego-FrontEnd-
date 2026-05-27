-- ============================================================
-- GalaxyDust Game — Migration 001: inventory_items
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  fullname TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Spaceships', 'Structures', 'Tecnology', 'Badges',
    'Astrobots', 'Consumible', 'Fleets', 'Tools',
    'Licenses', 'Blueprints'
  )),
  avatar_url TEXT,
  description TEXT,
  rarity TEXT DEFAULT 'Common' CHECK (rarity IN ('Common','Uncommon','Rare','Epic','Legendary')),

  hp INTEGER DEFAULT 0,
  stamina INTEGER DEFAULT 0,
  speed INTEGER DEFAULT 0,
  defense INTEGER DEFAULT 0,
  power INTEGER DEFAULT 0,

  level INTEGER DEFAULT 0,
  tier INTEGER DEFAULT 1,
  stars INTEGER DEFAULT 0,
  shards_count INTEGER DEFAULT 0,
  shards_needed INTEGER DEFAULT 10,
  unlocked BOOLEAN DEFAULT false,
  favorite BOOLEAN DEFAULT false,

  faction TEXT,
  sound TEXT DEFAULT 'laser_click',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ENABLE RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 3. PUBLIC READ POLICY (anon can read the full catalog)
CREATE POLICY "Public read access"
  ON public.inventory_items
  FOR SELECT
  USING (true);

-- 4. INDEX
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_rarity ON public.inventory_items(rarity);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO public.inventory_items (slug, name, fullname, category, avatar_url, description, rarity, hp, stamina, speed, defense, power, shards_needed, faction, sound) VALUES

-- ── SPACESHIPS ──────────────────────────────────────────────
('xwing-t65', 'X-Wing T-65', 'Incom T-65B X-Wing Starfighter', 'Spaceships',
 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&auto=format&fit=crop',
 'El caza estelar icónico de la Alianza Rebelde. Equilibrio perfecto entre velocidad y potencia de fuego.',
 'Rare', 3200, 150, 95, 80, 420, 25, 'Rebels', 'heavy_laser'),

('tie-interceptor', 'TIE Interceptor', 'Sienar Fleet Systems TIE/IN Interceptor', 'Spaceships',
 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop',
 'Caza de superioridad aérea del Imperio. Velocidad devastadora a costa de blindaje.',
 'Uncommon', 1800, 120, 140, 30, 380, 15, 'Empire', 'heavy_laser'),

('millennium-falcon', 'Millennium Falcon', 'YT-1300 Millennium Falcon Modified Freighter', 'Spaceships',
 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=300&auto=format&fit=crop',
 'El carguero más rápido de la galaxia. Modificaciones ilegales le dan una ventaja única.',
 'Legendary', 5500, 200, 130, 120, 750, 50, 'Rebels', 'laser_success'),

('slave-one', 'Slave I', 'Firespray-31 Patrol Craft — Slave I', 'Spaceships',
 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=300&auto=format&fit=crop',
 'La nave personal de Boba Fett. Armada hasta los dientes con misiles y cañones láser.',
 'Epic', 4200, 180, 110, 100, 620, 35, 'Empire', 'heavy_laser'),

('naboo-starfighter', 'Naboo N-1', 'Theed Palace Space Vessel N-1 Starfighter', 'Spaceships',
 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=300&auto=format&fit=crop',
 'Elegante caza de Naboo. Velocidad excepcional con diseño cromado distintivo.',
 'Rare', 2800, 140, 125, 60, 350, 20, 'Galactic Republic', 'laser_success'),

-- ── STRUCTURES ──────────────────────────────────────────────
('shield-generator', 'Shield Generator', 'SLD-26 Planetary Shield Generator', 'Structures',
 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=300&auto=format&fit=crop',
 'Generador de escudo planetario. Protege la base de bombardeos orbitales.',
 'Epic', 8000, 0, 0, 200, 500, 40, 'Rebels', 'laser_click'),

('turbolaser-tower', 'Turbolaser Tower', 'XX-9 Heavy Turbolaser Defense Tower', 'Structures',
 'https://images.unsplash.com/photo-1534996858221-380b92700493?w=300&auto=format&fit=crop',
 'Torre de defensa pesada. Alto poder de fuego contra naves de capital.',
 'Rare', 5000, 0, 0, 150, 680, 30, 'Empire', 'heavy_laser'),

('command-center', 'Command Center', 'Tactical Operations Command Center Mk-IV', 'Structures',
 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=300&auto=format&fit=crop',
 'Centro de mando táctico. Desbloquea bonificaciones globales para todas las unidades.',
 'Legendary', 10000, 0, 0, 300, 200, 50, 'Galactic Republic', 'laser_success'),

('barracks', 'Barracks', 'Clone Trooper Training Barracks', 'Structures',
 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=300&auto=format&fit=crop',
 'Barracas de entrenamiento. Reduce el tiempo de reclutamiento de unidades.',
 'Common', 3000, 0, 0, 80, 100, 10, 'Galactic Republic', 'laser_click'),

('droid-factory', 'Droid Factory', 'Geonosis Automated Droid Foundry', 'Structures',
 'https://images.unsplash.com/photo-1484589065579-248aad0d628b?w=300&auto=format&fit=crop',
 'Fábrica automatizada de droides. Produce unidades B1 y B2 continuamente.',
 'Rare', 6000, 0, 0, 120, 350, 25, 'Droid', 'heavy_laser'),

-- ── TECNOLOGY ───────────────────────────────────────────────
('hyperdrive-core', 'Hyperdrive Core', 'Class 1.0 Hyperdrive Motivator Core', 'Tecnology',
 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&auto=format&fit=crop',
 'Núcleo de hiperimpulsor Clase 1.0. Permite saltos al hiperespacio instantáneos.',
 'Epic', 0, 0, 200, 0, 450, 35, NULL, 'laser_success'),

('ion-cannon', 'Ion Cannon', 'v-150 Planet Defender Ion Cannon', 'Tecnology',
 'https://images.unsplash.com/photo-1581822261290-991b38693d1b?w=300&auto=format&fit=crop',
 'Cañón de iones planetario. Desactiva sistemas electrónicos de naves capitales.',
 'Rare', 0, 0, 0, 0, 700, 30, 'Rebels', 'heavy_laser'),

('cloaking-device', 'Cloaking Device', 'Stygium Crystal Cloaking Array', 'Tecnology',
 'https://images.unsplash.com/photo-1504192010706-dd7f569ee2be?w=300&auto=format&fit=crop',
 'Dispositivo de camuflaje con cristales Stygium. Hace invisible a cualquier nave.',
 'Legendary', 0, 0, 150, 0, 300, 50, NULL, 'laser_success'),

('tractor-beam', 'Tractor Beam', 'Phylon Q7 Tractor Beam Projector', 'Tecnology',
 'https://images.unsplash.com/photo-1610296669228-602fa827fc1f?w=300&auto=format&fit=crop',
 'Proyector de rayo tractor. Captura naves enemigas y las inmoviliza.',
 'Uncommon', 0, 0, 0, 50, 250, 15, 'Empire', 'heavy_laser'),

-- ── BADGES ──────────────────────────────────────────────────
('rebel-hero', 'Rebel Hero', 'Medal of Bravery — Rebel Alliance', 'Badges',
 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=300&auto=format&fit=crop',
 'Otorgada por valentía excepcional en batalla contra el Imperio.',
 'Rare', 0, 0, 0, 0, 100, 20, 'Rebels', 'laser_success'),

('sith-conquest', 'Sith Conquest', 'Dark Side Mastery Insignia', 'Badges',
 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop',
 'Insignia otorgada por dominar el lado oscuro de la Fuerza.',
 'Epic', 0, 0, 0, 0, 150, 30, 'Sith', 'heavy_laser'),

('fleet-commander', 'Fleet Commander', 'Grand Admiral Fleet Command Badge', 'Badges',
 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&auto=format&fit=crop',
 'Insignia de Gran Almirante. Otorga bonificaciones a la flota completa.',
 'Legendary', 0, 0, 0, 0, 200, 50, 'Empire', 'laser_success'),

('first-blood', 'First Blood', 'First Victory in Galactic Arena', 'Badges',
 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=300&auto=format&fit=crop',
 'Obtenida al ganar tu primera batalla en la Arena Galáctica.',
 'Common', 0, 0, 0, 0, 25, 5, NULL, 'laser_click'),

-- ── ASTROBOTS ───────────────────────────────────────────────
('r2d2', 'R2-D2', 'R2-D2 Industrial Automaton Astromech', 'Astrobots',
 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&auto=format&fit=crop',
 'El droide astromecánico más legendario. Repara naves y hackea sistemas enemigos.',
 'Legendary', 1200, 100, 90, 40, 500, 50, 'Galactic Republic', 'laser_success'),

('bb8', 'BB-8', 'BB-8 Spherical Astromech Unit', 'Astrobots',
 'https://images.unsplash.com/photo-1563207153-f403bf289096?w=300&auto=format&fit=crop',
 'Astromecánico esférico de nueva generación. Rápido y ágil.',
 'Epic', 900, 80, 130, 25, 380, 35, 'Rebels', 'laser_success'),

('c3po', 'C-3PO', 'C-3PO Cybot Galactica Protocol Droid', 'Astrobots',
 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=300&auto=format&fit=crop',
 'Droide de protocolo. Domina más de seis millones de formas de comunicación.',
 'Rare', 800, 60, 75, 15, 200, 25, 'Galactic Republic', 'laser_click'),

('chopper', 'Chopper', 'C1-10P "Chopper" Astromech', 'Astrobots',
 'https://images.unsplash.com/photo-1531746790095-e5e1381e0dab?w=300&auto=format&fit=crop',
 'Astromecánico temperamental pero letal. Especialista en sabotaje.',
 'Uncommon', 1000, 90, 95, 35, 320, 15, 'Rebels', 'heavy_laser'),

-- ── CONSUMIBLE ──────────────────────────────────────────────
('bacta-tank', 'Bacta Tank', 'Zaltin Corp Medical Bacta Infusion Tank', 'Consumible',
 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=300&auto=format&fit=crop',
 'Tanque de bacta medicinal. Restaura HP completo de cualquier unidad.',
 'Rare', 0, 0, 0, 0, 0, 20, NULL, 'laser_success'),

('shield-booster', 'Shield Booster', 'Personal Deflector Shield Mk-III', 'Consumible',
 'https://images.unsplash.com/photo-1532178910-7815d6919875?w=300&auto=format&fit=crop',
 'Potenciador de escudo personal. +50% defensa por 3 turnos.',
 'Uncommon', 0, 0, 0, 50, 0, 10, NULL, 'laser_click'),

('stim-pack', 'Stim Pack', 'Military Grade Stimulant Pack', 'Consumible',
 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=300&auto=format&fit=crop',
 'Paquete de estimulantes. +30% velocidad y stamina por 2 turnos.',
 'Common', 0, 30, 30, 0, 0, 5, NULL, 'laser_click'),

('thermal-detonator', 'Thermal Detonator', 'Class-A Thermal Detonator Grenade', 'Consumible',
 'https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?w=300&auto=format&fit=crop',
 'Detonador térmico de clase A. Daño masivo en área.',
 'Epic', 0, 0, 0, 0, 800, 30, NULL, 'heavy_laser'),

-- ── FLEETS ──────────────────────────────────────────────────
('home-one-fleet', 'Home One Fleet', 'MC80 Home One Star Cruiser Battle Group', 'Fleets',
 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=300&auto=format&fit=crop',
 'Grupo de batalla liderado por el MC80 Home One. Flota insignia rebelde.',
 'Legendary', 15000, 300, 60, 250, 1200, 50, 'Rebels', 'laser_success'),

('executor-armada', 'Executor Armada', 'Super Star Destroyer Executor Death Squadron', 'Fleets',
 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=300&auto=format&fit=crop',
 'El Escuadrón de la Muerte liderado por el Executor. Terror imperial.',
 'Legendary', 20000, 400, 45, 350, 1500, 50, 'Empire', 'heavy_laser'),

('rogue-squadron', 'Rogue Squadron', 'Rogue Squadron Elite Starfighter Wing', 'Fleets',
 'https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?w=300&auto=format&fit=crop',
 'Escuadrón de élite de la Alianza. Los mejores pilotos de la galaxia.',
 'Epic', 8000, 200, 120, 100, 900, 35, 'Rebels', 'laser_success'),

('phantom-cell', 'Phantom Cell', 'Ghost Crew Phantom Cell Strike Force', 'Fleets',
 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=300&auto=format&fit=crop',
 'Célula de ataque del Ghost. Operaciones encubiertas de alto riesgo.',
 'Rare', 5000, 150, 100, 80, 600, 25, 'Rebels', 'laser_click'),

-- ── TOOLS ───────────────────────────────────────────────────
('lightsaber-crystal', 'Kyber Crystal', 'Ilum Kyber Crystal — Force Attuned', 'Tools',
 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop',
 'Cristal Kyber sintonizado con la Fuerza. Componente esencial de sables de luz.',
 'Legendary', 0, 0, 0, 0, 500, 50, NULL, 'laser_success'),

('repair-toolkit', 'Repair Toolkit', 'Astromech Multi-Tool Repair Kit', 'Tools',
 'https://images.unsplash.com/photo-1530124566582-a45a7e3e29d1?w=300&auto=format&fit=crop',
 'Kit de reparación universal. Restaura durabilidad de naves y droides.',
 'Common', 0, 0, 0, 0, 50, 5, NULL, 'laser_click'),

('electrobinoculars', 'Electrobinoculars', 'TD2.3 Electrobinoculars with Night Vision', 'Tools',
 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=300&auto=format&fit=crop',
 'Electrobinoculares con visión nocturna. Revela enemigos ocultos.',
 'Uncommon', 0, 0, 0, 0, 100, 10, NULL, 'laser_click'),

('holocomm', 'Holocomm', 'Long-Range Holographic Communicator', 'Tools',
 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&auto=format&fit=crop',
 'Comunicador holográfico de largo alcance. Coordina flotas remotamente.',
 'Rare', 0, 0, 0, 0, 150, 20, NULL, 'laser_success'),

-- ── LICENSES ────────────────────────────────────────────────
('pilot-license', 'Pilot License', 'Imperial / Republic Starfighter Pilot License', 'Licenses',
 'https://images.unsplash.com/photo-1457364559154-aa2644600ebb?w=300&auto=format&fit=crop',
 'Licencia de piloto estelar. Requerida para operar cazas y naves de combate.',
 'Common', 0, 0, 0, 0, 0, 5, NULL, 'laser_click'),

('bounty-permit', 'Bounty Permit', 'Outer Rim Bounty Hunter Operating Permit', 'Licenses',
 'https://images.unsplash.com/photo-1504333638930-c8787321eee0?w=300&auto=format&fit=crop',
 'Permiso de cazarrecompensas. Autoriza operaciones en el Borde Exterior.',
 'Rare', 0, 0, 0, 0, 0, 20, NULL, 'heavy_laser'),

('trade-federation', 'Trade License', 'Trade Federation Commercial Operating License', 'Licenses',
 'https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?w=300&auto=format&fit=crop',
 'Licencia comercial de la Federación de Comercio. Acceso a rutas exclusivas.',
 'Uncommon', 0, 0, 0, 0, 0, 15, NULL, 'laser_click'),

('jedi-charter', 'Jedi Charter', 'Jedi Order Mission Authorization Charter', 'Licenses',
 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=300&auto=format&fit=crop',
 'Carta de autorización de la Orden Jedi. Otorga jurisdicción galáctica.',
 'Legendary', 0, 0, 0, 0, 0, 50, 'Galactic Republic', 'laser_success'),

-- ── BLUEPRINTS ──────────────────────────────────────────────
('death-star-plans', 'Death Star Plans', 'DS-1 Orbital Battle Station Technical Readout', 'Blueprints',
 'https://images.unsplash.com/photo-1610296669228-602fa827fc1f?w=300&auto=format&fit=crop',
 'Planos técnicos de la Estrella de la Muerte. La información más valiosa de la galaxia.',
 'Legendary', 0, 0, 0, 0, 2000, 50, 'Empire', 'laser_success'),

('xwing-schematic', 'X-Wing Schematic', 'Incom T-65 X-Wing Assembly Blueprints', 'Blueprints',
 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&auto=format&fit=crop',
 'Esquemáticos de ensamblaje del X-Wing. Permite construir cazas en tu hangar.',
 'Rare', 0, 0, 0, 0, 400, 25, 'Rebels', 'laser_click'),

('droideka-blueprint', 'Droideka Blueprint', 'Colicoid Destroyer Droid Manufacturing Plans', 'Blueprints',
 'https://images.unsplash.com/photo-1581822261290-991b38693d1b?w=300&auto=format&fit=crop',
 'Planos de fabricación del Droideka. Produce droides destructores blindados.',
 'Epic', 0, 0, 0, 0, 600, 35, 'Droid', 'heavy_laser'),

('beskar-armor', 'Beskar Armor', 'Mandalorian Beskar Steel Armor Forging Plans', 'Blueprints',
 'https://images.unsplash.com/photo-1531797265278-d5b5f4e71e79?w=300&auto=format&fit=crop',
 'Planos de forja de armadura Beskar. La protección más resistente de la galaxia.',
 'Legendary', 0, 0, 0, 0, 800, 50, NULL, 'laser_success'),

('lightsaber-blueprint', 'Lightsaber Design', 'Jedi Temple Lightsaber Construction Guide', 'Blueprints',
 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop',
 'Guía de construcción de sable de luz. Requiere un cristal Kyber para completar.',
 'Epic', 0, 0, 0, 0, 550, 30, 'Galactic Republic', 'laser_success');
