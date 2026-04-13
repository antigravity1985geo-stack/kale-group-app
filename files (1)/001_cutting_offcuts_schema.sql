-- ============================================================
-- Kale Group ERP — Cutting & Offcut Logic Migration
-- Version: 001  (FIXED)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. SEQUENCE for offcut_code (replaces RANDOM() — BUG FIX #1)
-- RANDOM()-based default could produce duplicate codes at scale.
-- A sequence guarantees uniqueness without relying on UNIQUE retry loops.
-- ─────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS offcut_code_seq START 1 INCREMENT 1;


-- ─────────────────────────────────────────────────────────────
-- 1. EXTEND raw_materials
-- ─────────────────────────────────────────────────────────────

ALTER TABLE raw_materials
  ADD COLUMN IF NOT EXISTS has_grain            BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grain_direction      TEXT         CHECK (grain_direction IN ('longitudinal', 'transverse', 'none')),
  ADD COLUMN IF NOT EXISTS thickness_mm         DECIMAL(5,2) NOT NULL DEFAULT 18.0,
  ADD COLUMN IF NOT EXISTS sheet_length_mm      INTEGER,
  ADD COLUMN IF NOT EXISTS sheet_width_mm       INTEGER,
  ADD COLUMN IF NOT EXISTS is_double_sided      BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS min_offcut_length_mm INTEGER      NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS min_offcut_width_mm  INTEGER      NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS saw_kerf_mm          DECIMAL(4,2) NOT NULL DEFAULT 3.2,
  ADD COLUMN IF NOT EXISTS edge_trim_mm         INTEGER      NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS material_type        TEXT         NOT NULL DEFAULT 'sheet'
    CHECK (material_type IN ('sheet', 'edge_band', 'hardware', 'consumable'));

-- grain_direction must be set when has_grain = true
ALTER TABLE raw_materials
  ADD CONSTRAINT chk_grain_direction
    CHECK (has_grain = FALSE OR grain_direction IS NOT NULL);

COMMENT ON COLUMN raw_materials.has_grain            IS 'ფილას აქვს ტექსტურის მიმართულება';
COMMENT ON COLUMN raw_materials.grain_direction      IS 'longitudinal=სიგრძეზე, transverse=სიგანეზე';
COMMENT ON COLUMN raw_materials.thickness_mm         IS 'ფილის სისქე mm-ში (18, 25, etc.)';
COMMENT ON COLUMN raw_materials.sheet_length_mm      IS 'სტანდარტული ფილის სიგრძე mm (2800)';
COMMENT ON COLUMN raw_materials.sheet_width_mm       IS 'სტანდარტული ფილის სიგანე mm (2070)';
COMMENT ON COLUMN raw_materials.min_offcut_length_mm IS 'ამ ზომაზე პატარა ნარჩენი = ოტხოდი, არა offcut';
COMMENT ON COLUMN raw_materials.saw_kerf_mm          IS 'ხერხის ლელო mm-ში (ჩვეულებრივ 3.2)';
COMMENT ON COLUMN raw_materials.edge_trim_mm         IS 'კიდის გასწორება mm - პირველ ჭრაზე';


-- ─────────────────────────────────────────────────────────────
-- 2. EXTEND recipe_ingredients
-- ─────────────────────────────────────────────────────────────

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS can_rotate               BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS required_grain_direction TEXT
    CHECK (required_grain_direction IN ('along_length', 'along_width', 'any')),
  ADD COLUMN IF NOT EXISTS finished_length_mm       INTEGER,
  ADD COLUMN IF NOT EXISTS finished_width_mm        INTEGER,
  ADD COLUMN IF NOT EXISTS waste_percentage         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS show_face_required       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes                    TEXT;

COMMENT ON COLUMN recipe_ingredients.can_rotate         IS 'ნაჭრის ბრუნვა დასაშვებია?';
COMMENT ON COLUMN recipe_ingredients.finished_length_mm IS 'მზა ნაჭრის სიგრძე (კრომკის შემდეგ)';
COMMENT ON COLUMN recipe_ingredients.finished_width_mm  IS 'მზა ნაჭრის სიგანე (კრომკის შემდეგ)';
COMMENT ON COLUMN recipe_ingredients.waste_percentage   IS 'დამატებითი ნარჩენის % (manual override)';


-- ─────────────────────────────────────────────────────────────
-- 3. EDGE BANDING / KROMKA per ingredient edge
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_ingredient_edge_bands (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_ingredient_id  UUID         NOT NULL REFERENCES recipe_ingredients(id) ON DELETE CASCADE,
  edge_position         TEXT         NOT NULL CHECK (edge_position IN ('top', 'bottom', 'left', 'right')),
  kromka_material_id    UUID         NOT NULL REFERENCES raw_materials(id),
  thickness_mm          DECIMAL(3,1) NOT NULL CHECK (thickness_mm > 0 AND thickness_mm <= 5.0),
  is_post_formed        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (recipe_ingredient_id, edge_position)
);

CREATE INDEX IF NOT EXISTS idx_edge_bands_ingredient ON recipe_ingredient_edge_bands(recipe_ingredient_id);

COMMENT ON TABLE  recipe_ingredient_edge_bands               IS 'კრომკა/კიდის ბანდი რეცეპტის ნაჭრის ყოველ კიდეზე';
COMMENT ON COLUMN recipe_ingredient_edge_bands.thickness_mm  IS 'კრომკის სისქე: 0.4, 1.0, 2.0, 3.0 mm';
COMMENT ON COLUMN recipe_ingredient_edge_bands.is_post_formed IS 'მომრგვალებული პოსტფორმ კიდე';


-- ─────────────────────────────────────────────────────────────
-- 4. OFFCUTS TABLE — core of the new logic
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS material_offcuts (
  -- identity
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- BUG FIX #1: Replaced RANDOM()-based code with sequence — guaranteed uniqueness
  -- Old: RANDOM() * 99999 → max 99,999 values/day, collisions possible under load
  -- New: monotonic sequence → zero collision risk
  offcut_code             TEXT         UNIQUE NOT NULL
    DEFAULT 'OFC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('offcut_code_seq')::TEXT, 6, '0'),

  -- lineage
  parent_material_id      UUID         NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  parent_offcut_id        UUID         REFERENCES material_offcuts(id),  -- if cut from another offcut
  generated_by_order_id   UUID,        -- FK to production_orders when that table exists

  -- physical properties (copied from parent at creation, then immutable)
  thickness_mm            DECIMAL(5,2) NOT NULL,
  length_mm               INTEGER      NOT NULL CHECK (length_mm > 0),
  width_mm                INTEGER      NOT NULL CHECK (width_mm > 0),
  area_m2                 DECIMAL(10,6) GENERATED ALWAYS AS
                            (ROUND((length_mm * width_mm / 1000000.0)::NUMERIC, 6)) STORED,
  grain_direction         TEXT         CHECK (grain_direction IN ('longitudinal', 'transverse', 'none')),
  is_double_sided         BOOLEAN      NOT NULL DEFAULT TRUE,
  quality_grade           TEXT         NOT NULL DEFAULT 'A'
                            CHECK (quality_grade IN ('A', 'B', 'C', 'SCRAP')),

  -- lifecycle state machine
  status                  TEXT         NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available','reserved','consumed','damaged','disposed','pending_inspection')),

  -- reservation (prevents race conditions)
  reserved_for_order_id   UUID,
  reserved_at             TIMESTAMPTZ,
  reservation_expires_at  TIMESTAMPTZ,

  -- physical location
  warehouse_zone          TEXT,
  shelf_position          TEXT,

  -- financial
  estimated_value         DECIMAL(10,2),

  -- consumption audit
  consumed_at             TIMESTAMPTZ,
  consumed_by_order_id    UUID,

  -- audit
  created_by              UUID         REFERENCES auth.users(id),
  updated_by              UUID         REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notes                   TEXT,

  CONSTRAINT chk_min_viable_size CHECK (length_mm >= 50 AND width_mm >= 50)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_offcuts_status
  ON material_offcuts(status);

CREATE INDEX IF NOT EXISTS idx_offcuts_material_available
  ON material_offcuts(parent_material_id, status, length_mm, width_mm)
  WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_offcuts_reservation_expiry
  ON material_offcuts(reservation_expires_at)
  WHERE status = 'reserved';

CREATE INDEX IF NOT EXISTS idx_offcuts_parent_offcut
  ON material_offcuts(parent_offcut_id)
  WHERE parent_offcut_id IS NOT NULL;

COMMENT ON TABLE  material_offcuts                         IS 'ნარჩენი ფილები (offcut/ნამჭრელები) — ინვენტარი';
COMMENT ON COLUMN material_offcuts.offcut_code            IS 'ბარკოდი/QR-ისთვის უნიკალური კოდი';
COMMENT ON COLUMN material_offcuts.parent_offcut_id       IS 'თუ ეს offcut სხვა offcut-იდან ამოჭრეს';
COMMENT ON COLUMN material_offcuts.reservation_expires_at IS 'ავტო-გათავისუფლება stale reservation-ისთვის';


-- ─────────────────────────────────────────────────────────────
-- 5. AUTO-RELEASE STALE RESERVATIONS (via Supabase pg_cron)
-- ─────────────────────────────────────────────────────────────
-- SELECT cron.schedule(
--   'release-stale-offcut-reservations',
--   '*/15 * * * *',
--   $$
--     UPDATE material_offcuts
--     SET
--       status                 = 'available',
--       reserved_for_order_id  = NULL,
--       reserved_at            = NULL,
--       reservation_expires_at = NULL,
--       updated_at             = NOW()
--     WHERE
--       status = 'reserved'
--       AND reservation_expires_at < NOW();
--   $$
-- );


-- ─────────────────────────────────────────────────────────────
-- 6. WASTE ACTUALS — post-production reconciliation
-- BUG FIX #2: Added updated_at column + trigger (was missing — no edit tracking)
-- BUG FIX #3: Renamed efficiency_pct comment to "recovery_rate_pct" semantically.
--   The formula computes: offcut_returned / actual_consumed * 100
--   This is "material recovery rate" (how much was saved as offcut),
--   NOT cutting efficiency. A separate efficiency column added below.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_waste_actuals (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id     UUID         NOT NULL,
  material_id             UUID         NOT NULL REFERENCES raw_materials(id),
  theoretical_gross_m2    DECIMAL(10,4),
  actual_consumed_m2      DECIMAL(10,4),
  offcut_returned_m2      DECIMAL(10,4) NOT NULL DEFAULT 0,

  -- How much material turned into pure scrap (dust/unusable waste)
  actual_scrap_m2         DECIMAL(10,4) GENERATED ALWAYS AS
                            (GREATEST(0, COALESCE(actual_consumed_m2,0) - COALESCE(offcut_returned_m2,0))) STORED,

  -- BUG FIX #3a: "Recovery rate" = what fraction was saved as offcut.
  -- Formula: offcut_returned / consumed.
  -- Semantically separate from cutting efficiency.
  recovery_rate_pct       DECIMAL(5,2) GENERATED ALWAYS AS (
                            CASE WHEN COALESCE(actual_consumed_m2,0) > 0
                            THEN ROUND(
                              (COALESCE(offcut_returned_m2,0) / actual_consumed_m2 * 100)::NUMERIC, 2)
                            ELSE NULL END
                          ) STORED,

  -- BUG FIX #3b: True cutting efficiency = theoretical needed vs actually used.
  -- Lower actual vs theoretical = better planning accuracy.
  -- Only meaningful if theoretical_gross_m2 is set.
  material_efficiency_pct DECIMAL(5,2) GENERATED ALWAYS AS (
                            CASE
                              WHEN COALESCE(actual_consumed_m2,0) > 0
                               AND COALESCE(theoretical_gross_m2,0) > 0
                            THEN ROUND(
                              (theoretical_gross_m2 / actual_consumed_m2 * 100)::NUMERIC, 2)
                            ELSE NULL END
                          ) STORED,

  recorded_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- BUG FIX #2: Added updated_at for edit tracking
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  recorded_by             UUID         REFERENCES auth.users(id),
  notes                   TEXT
);

CREATE INDEX IF NOT EXISTS idx_waste_actuals_order    ON production_waste_actuals(production_order_id);
CREATE INDEX IF NOT EXISTS idx_waste_actuals_material ON production_waste_actuals(material_id);
-- BUG FIX #2: Added updated_at index for time-range queries
CREATE INDEX IF NOT EXISTS idx_waste_actuals_updated  ON production_waste_actuals(updated_at);


-- ─────────────────────────────────────────────────────────────
-- 7. CUTTING PLANS (for future nesting software integration)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cutting_plans (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id     UUID         NOT NULL,
  material_id             UUID         NOT NULL REFERENCES raw_materials(id),
  source_software         TEXT         NOT NULL DEFAULT 'manual'
                            CHECK (source_software IN ('manual', 'cutrite', 'bazis', 'import')),
  sheets_required         INTEGER,
  offcuts_used            INTEGER      DEFAULT 0,
  theoretical_area_m2     DECIMAL(10,4),
  planned_waste_m2        DECIMAL(10,4),
  planned_efficiency_pct  DECIMAL(5,2),
  plan_data_json          JSONB,
  status                  TEXT         NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','confirmed','in_progress','completed','cancelled')),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- BUG FIX #4: Missing index on production_order_id (high-cardinality FK, always queried)
CREATE INDEX IF NOT EXISTS idx_cutting_plans_order    ON cutting_plans(production_order_id);
CREATE INDEX IF NOT EXISTS idx_cutting_plans_material ON cutting_plans(material_id);
CREATE INDEX IF NOT EXISTS idx_cutting_plans_status   ON cutting_plans(status);


-- ─────────────────────────────────────────────────────────────
-- 8. UPDATED_AT TRIGGER (reusable)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offcuts_updated_at
  BEFORE UPDATE ON material_offcuts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cutting_plans_updated_at
  BEFORE UPDATE ON cutting_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- BUG FIX #2: Trigger for production_waste_actuals (was completely missing)
CREATE TRIGGER trg_waste_actuals_updated_at
  BEFORE UPDATE ON production_waste_actuals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE material_offcuts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredient_edge_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_waste_actuals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_plans                ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "offcuts_read"        ON material_offcuts             FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "edge_bands_read"     ON recipe_ingredient_edge_bands FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "waste_actuals_read"  ON production_waste_actuals     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "cutting_plans_read"  ON cutting_plans                FOR SELECT TO authenticated USING (TRUE);

-- Write policies
-- NOTE: These allow any authenticated user full write access.
-- For production, consider role-based policies (e.g., warehouse_staff, manager).
-- Example role restriction:
--   USING (auth.jwt() ->> 'role' IN ('warehouse', 'manager'))
CREATE POLICY "offcuts_write"       ON material_offcuts             FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "edge_bands_write"    ON recipe_ingredient_edge_bands FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "waste_actuals_write" ON production_waste_actuals     FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "cutting_plans_write" ON cutting_plans                FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- ─────────────────────────────────────────────────────────────
-- 10. HELPER VIEWS
-- ─────────────────────────────────────────────────────────────

-- Available offcuts with parent material info
CREATE OR REPLACE VIEW v_available_offcuts AS
SELECT
  o.*,
  m.name              AS material_name,
  m.unit              AS material_uom,
  m.has_grain,
  m.thickness_mm      AS material_thickness_mm,
  m.min_offcut_length_mm,
  m.min_offcut_width_mm,
  EXTRACT(DAY FROM NOW() - o.created_at)::INTEGER AS days_in_stock
FROM material_offcuts o
JOIN raw_materials    m ON m.id = o.parent_material_id
WHERE o.status = 'available'
ORDER BY o.created_at ASC;

-- All offcuts (any status) with parent info — for full inventory view
CREATE OR REPLACE VIEW v_all_offcuts AS
SELECT
  o.*,
  m.name              AS material_name,
  m.unit              AS material_uom,
  m.has_grain,
  m.thickness_mm      AS material_thickness_mm,
  m.min_offcut_length_mm,
  m.min_offcut_width_mm,
  EXTRACT(DAY FROM NOW() - o.created_at)::INTEGER AS days_in_stock
FROM material_offcuts o
JOIN raw_materials    m ON m.id = o.parent_material_id
ORDER BY o.created_at DESC;

-- Offcuts aging report
-- BUG FIX #5: Changed WARNING threshold from 292 to 270 (non-round number makes no business sense)
CREATE OR REPLACE VIEW v_offcuts_aging AS
SELECT
  o.*,
  m.name AS material_name,
  EXTRACT(DAY FROM NOW() - o.created_at)::INTEGER AS days_in_stock,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - o.created_at) > 365 THEN 'OVERDUE'
    WHEN EXTRACT(DAY FROM NOW() - o.created_at) > 270 THEN 'WARNING'   -- 9 months
    WHEN EXTRACT(DAY FROM NOW() - o.created_at) > 180 THEN 'CAUTION'   -- 6 months (new tier)
    ELSE 'OK'
  END AS age_status
FROM material_offcuts o
JOIN raw_materials    m ON m.id = o.parent_material_id
WHERE o.status IN ('available', 'pending_inspection')
ORDER BY days_in_stock DESC;

-- Waste efficiency per material (last 90 days)
-- BUG FIX #3: Uses both recovery_rate_pct and material_efficiency_pct now
CREATE OR REPLACE VIEW v_waste_efficiency_summary AS
SELECT
  m.id          AS material_id,
  m.name        AS material_name,
  COUNT(w.id)   AS job_count,
  ROUND(AVG(w.recovery_rate_pct)::NUMERIC, 2)        AS avg_recovery_rate_pct,
  ROUND(AVG(w.material_efficiency_pct)::NUMERIC, 2)  AS avg_material_efficiency_pct,
  ROUND(SUM(w.actual_scrap_m2)::NUMERIC, 4)          AS total_scrap_m2,
  ROUND(SUM(w.offcut_returned_m2)::NUMERIC, 4)       AS total_offcut_returned_m2,
  ROUND(SUM(w.actual_consumed_m2)::NUMERIC, 4)       AS total_consumed_m2
FROM production_waste_actuals w
JOIN raw_materials m ON m.id = w.material_id
WHERE w.recorded_at > NOW() - INTERVAL '90 days'
GROUP BY m.id, m.name
ORDER BY total_scrap_m2 DESC;

-- NEW: Inventory value summary by material
CREATE OR REPLACE VIEW v_offcut_inventory_value AS
SELECT
  m.id                AS material_id,
  m.name              AS material_name,
  COUNT(o.id)         AS offcut_count,
  ROUND(SUM(o.area_m2)::NUMERIC, 4)          AS total_area_m2,
  ROUND(SUM(o.estimated_value)::NUMERIC, 2)  AS total_value,
  ROUND(AVG(o.area_m2)::NUMERIC, 4)          AS avg_area_m2
FROM material_offcuts o
JOIN raw_materials     m ON m.id = o.parent_material_id
WHERE o.status = 'available'
GROUP BY m.id, m.name
ORDER BY total_value DESC;


-- ─────────────────────────────────────────────────────────────
-- 11. OFFCUT MATCHING FUNCTION (atomic reservation)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reserve_best_offcut(
  p_material_id         UUID,
  p_thickness_mm        DECIMAL,
  p_length_mm           INTEGER,
  p_width_mm            INTEGER,
  p_grain_direction     TEXT,    -- 'along_length' | 'along_width' | 'any'
  p_can_rotate          BOOLEAN,
  p_order_id            UUID
)
RETURNS material_offcuts
LANGUAGE plpgsql
AS $$
DECLARE
  v_offcut material_offcuts;
BEGIN
  SELECT * INTO v_offcut
  FROM material_offcuts
  WHERE
    parent_material_id = p_material_id
    AND status         = 'available'
    AND thickness_mm   = p_thickness_mm
    AND (
      -- normal orientation
      (length_mm >= p_length_mm AND width_mm >= p_width_mm)
      OR
      -- rotated (only if allowed)
      (p_can_rotate = TRUE AND length_mm >= p_width_mm AND width_mm >= p_length_mm)
    )
    AND (
      -- 'any' requirement: accept all grain types
      p_grain_direction = 'any'
      -- no-grain material: always acceptable for any grain requirement
      OR grain_direction = 'none'
      OR (p_grain_direction = 'along_length' AND grain_direction = 'longitudinal')
      OR (p_grain_direction = 'along_width'  AND grain_direction = 'transverse')
    )
  ORDER BY area_m2 ASC   -- smallest viable first (best-fit)
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- atomic, skip if another transaction locked it

  IF v_offcut.id IS NULL THEN
    RETURN NULL;  -- no suitable offcut found; caller must use fresh sheet
  END IF;

  UPDATE material_offcuts SET
    status                 = 'reserved',
    reserved_for_order_id  = p_order_id,
    reserved_at            = NOW(),
    reservation_expires_at = NOW() + INTERVAL '2 hours',
    updated_at             = NOW()
  WHERE id = v_offcut.id
  RETURNING * INTO v_offcut;

  RETURN v_offcut;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 12. NEW: RELEASE RESERVATION FUNCTION (atomic, returns offcut)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION release_offcut_reservation(
  p_offcut_id UUID
)
RETURNS material_offcuts
LANGUAGE plpgsql
AS $$
DECLARE
  v_offcut material_offcuts;
BEGIN
  UPDATE material_offcuts SET
    status                 = 'available',
    reserved_for_order_id  = NULL,
    reserved_at            = NULL,
    reservation_expires_at = NULL,
    updated_at             = NOW()
  WHERE id = p_offcut_id
    AND status = 'reserved'
  RETURNING * INTO v_offcut;

  RETURN v_offcut;  -- NULL if not found or not in 'reserved' state
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 13. SEED: Example edge band materials
-- ─────────────────────────────────────────────────────────────
/*
INSERT INTO raw_materials (name, material_type, thickness_mm, unit, has_grain)
VALUES
  ('კრომკა 0.4mm თეთრი', 'edge_band', 0.4, 'lm', FALSE),
  ('კრომკა 1mm თეთრი',   'edge_band', 1.0, 'lm', FALSE),
  ('კრომკა 2mm კაკალი',  'edge_band', 2.0, 'lm', TRUE),
  ('კრომკა 3mm შავი',    'edge_band', 3.0, 'lm', FALSE)
ON CONFLICT DO NOTHING;
*/
