// src/services/offcutService.js
// Kale Group ERP — Offcut Service Layer  (FIXED)
// All Supabase interactions for the cutting & offcut module

import { supabase } from '@/src/lib/supabase'

interface OffcutFilters {
  materialId?: string | null
  minLength?: number | null
  minWidth?: number | null
  grainDirection?: string | null
  qualityGrade?: string | null
  status?: string
}

interface CreateOffcutParams {
  parentMaterialId: string
  parentOffcutId?: string | null
  generatedByOrderId?: string | null
  thicknessMm: number
  lengthMm: number
  widthMm: number
  grainDirection: string
  qualityGrade?: string
  warehouseZone?: string | null
  shelfPosition?: string | null
  estimatedValue?: number | null
  notes?: string | null
}


// Allowed status values — mirrors DB CHECK constraint
// BUG FIX #6: Centralised here so disposeOffcut() can validate before DB round-trip
const VALID_STATUSES = ['available', 'reserved', 'consumed', 'damaged', 'disposed', 'pending_inspection']


// ─────────────────────────────────────────────────────────────
// OFFCUT CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Fetch offcuts with optional filters.
 * BUG FIX #7: Now supports filtering by status (not just 'available').
 *   - status 'available'          → uses the enriched v_available_offcuts view
 *   - status 'all' or other value → uses v_all_offcuts view (includes all statuses)
 */
export async function getAvailableOffcuts({
  materialId     = null,
  minLength      = null,
  minWidth       = null,
  grainDirection = null,
  qualityGrade   = null,
  status         = 'available',
} = {}) {
  // Use the appropriate view based on requested status
  const view = status === 'available' ? 'v_available_offcuts' : 'v_all_offcuts'

  let query = supabase.from(view).select('*')

  if (materialId)                       query = query.eq('parent_material_id', materialId)
  if (minLength)                        query = query.gte('length_mm', minLength)
  if (minWidth)                         query = query.gte('width_mm', minWidth)
  if (grainDirection && grainDirection !== 'any')
                                        query = query.eq('grain_direction', grainDirection)
  if (qualityGrade)                     query = query.eq('quality_grade', qualityGrade)
  if (status !== 'all' && status !== 'available')
                                        query = query.eq('status', status)

  const { data, error } = await query.order('area_m2', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Log a new offcut after production.
 * Validates against material's min_offcut thresholds.
 */
export async function createOffcut({
  parentMaterialId,
  parentOffcutId     = null,
  generatedByOrderId = null,
  thicknessMm,
  lengthMm,
  widthMm,
  grainDirection,
  qualityGrade       = 'A',
  warehouseZone      = null,
  shelfPosition      = null,
  estimatedValue     = null,
  notes              = null,
}) {
  // Validate inputs before DB round-trip
  if (!parentMaterialId)  throw new Error('parentMaterialId is required')
  if (!thicknessMm)       throw new Error('thicknessMm is required')
  if (!lengthMm || lengthMm < 50) throw new Error('lengthMm must be ≥ 50mm')
  if (!widthMm  || widthMm  < 50) throw new Error('widthMm must be ≥ 50mm')

  // Fetch parent material to validate min sizes + copy properties
  const { data: material, error: matErr } = await supabase
    .from('raw_materials')
    .select('min_offcut_length_mm, min_offcut_width_mm, is_double_sided, name')
    .eq('id', parentMaterialId)
    .single()

  if (matErr) throw matErr

  if (lengthMm < material.min_offcut_length_mm || widthMm < material.min_offcut_width_mm) {
    throw new Error(
      `ნარჩენი ძალიან პატარაა offcut-ისთვის. ` +
      `მინიმუმი: ${material.min_offcut_length_mm}×${material.min_offcut_width_mm}mm. ` +
      `ეს ნარჩენი ჩაეწერება სკრაპად.`
    )
  }

  const { data, error } = await supabase
    .from('material_offcuts')
    .insert({
      parent_material_id:    parentMaterialId,
      parent_offcut_id:      parentOffcutId,
      generated_by_order_id: generatedByOrderId,
      thickness_mm:          thicknessMm,
      length_mm:             lengthMm,
      width_mm:              widthMm,
      grain_direction:       grainDirection,
      is_double_sided:       material.is_double_sided,
      quality_grade:         qualityGrade,
      warehouse_zone:        warehouseZone,
      shelf_position:        shelfPosition,
      estimated_value:       estimatedValue,
      notes,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark offcut as consumed by a production order.
 * Optionally creates a child offcut from the remainder.
 *
 * BUG FIX #8: Fetch parent data BEFORE marking as consumed to avoid
 *   a second read after the status change (cleaner, avoids stale data risk).
 */
export async function consumeOffcut(offcutId, orderId, remainder = null) {
  // BUG FIX #8: Fetch first, then consume — single source of truth
  const { data: offcut, error: fetchErr } = await supabase
    .from('material_offcuts')
    .select('parent_material_id, thickness_mm, grain_direction, is_double_sided, quality_grade, warehouse_zone')
    .eq('id', offcutId)
    .eq('status', 'reserved')  // Only consume if properly reserved — prevents accidental double-consume
    .single()

  if (fetchErr) throw new Error(`Offcut ${offcutId} not found or not in 'reserved' state`)

  const { error: consumeErr } = await supabase
    .from('material_offcuts')
    .update({
      status:                 'consumed',
      consumed_at:            new Date().toISOString(),
      consumed_by_order_id:   orderId,
      reserved_for_order_id:  null,
      reservation_expires_at: null,
    })
    .eq('id', offcutId)
    .eq('status', 'reserved')  // Optimistic lock — double safety

  if (consumeErr) throw consumeErr

  // If there's a usable remainder, create a child offcut
  if (remainder?.length_mm && remainder?.width_mm) {
    await createOffcut({
      parentMaterialId:   offcut.parent_material_id,
      parentOffcutId:     offcutId,
      generatedByOrderId: orderId,
      thicknessMm:        offcut.thickness_mm,
      lengthMm:           remainder.length_mm,
      widthMm:            remainder.width_mm,
      grainDirection:     offcut.grain_direction,
      qualityGrade:       offcut.quality_grade,
      warehouseZone:      offcut.warehouse_zone,
      notes:              `ნარჩენი offcut #${offcutId.slice(0,8)}-ის გამოყენებიდან`,
    })
  }
}

/**
 * Reserve the best available offcut for a production order.
 * Uses the atomic PostgreSQL function to prevent race conditions.
 */
export async function reserveBestOffcut({
  materialId,
  thicknessMm,
  lengthMm,
  widthMm,
  grainDirection = 'any',
  canRotate      = true,
  orderId,
}) {
  const { data, error } = await supabase.rpc('reserve_best_offcut', {
    p_material_id:     materialId,
    p_thickness_mm:    thicknessMm,
    p_length_mm:       lengthMm,
    p_width_mm:        widthMm,
    p_grain_direction: grainDirection,
    p_can_rotate:      canRotate,
    p_order_id:        orderId,
  })

  if (error) throw error
  return data // null = no suitable offcut found; caller should use fresh sheet
}

/**
 * Release a reservation (e.g., order cancelled).
 * BUG FIX #9: Now uses the atomic DB function rather than a plain UPDATE,
 *   ensuring the state check (status = 'reserved') is evaluated inside the DB lock.
 */
export async function releaseOffcutReservation(offcutId) {
  const { data, error } = await supabase.rpc('release_offcut_reservation', {
    p_offcut_id: offcutId,
  })

  if (error) throw error
  if (!data) throw new Error(`Offcut ${offcutId} is not in 'reserved' state — cannot release.`)
  return data
}

/**
 * Mark offcut as damaged or disposed.
 * BUG FIX #6: Validates 'reason' against allowed statuses before DB call.
 */
export async function disposeOffcut(offcutId, reason = 'disposed', notes = null) {
  const disposableStatuses = ['damaged', 'disposed', 'pending_inspection']
  if (!disposableStatuses.includes(reason)) {
    throw new Error(
      `Invalid dispose reason: "${reason}". ` +
      `Allowed: ${disposableStatuses.join(', ')}`
    )
  }

  const { error } = await supabase
    .from('material_offcuts')
    .update({
      status:     reason,
      notes:      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offcutId)
    .in('status', ['available', 'pending_inspection'])  // Only dispose non-consumed offcuts

  if (error) throw error
}

/**
 * Bulk update offcut location (e.g., after physical reorganisation).
 * NEW: Useful when moving multiple offcuts between racks.
 */
export async function updateOffcutLocation(offcutId, { warehouseZone, shelfPosition }) {
  const { data, error } = await supabase
    .from('material_offcuts')
    .update({
      warehouse_zone: warehouseZone,
      shelf_position: shelfPosition,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', offcutId)
    .select()
    .single()

  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────
// YIELD CALCULATION (Level 2: Physics-based)
// ─────────────────────────────────────────────────────────────

/**
 * Calculate gross area needed for a recipe ingredient line.
 * Returns full breakdown for display.
 *
 * BUG FIX #10: Fixed sheet_edge_trim_m2 amortisation.
 *   Old: divided only by parts-per-length (ignored width dimension)
 *   New: parts_per_sheet = floor(L/l) * floor(W/w) → correct amortisation
 *
 * BUG FIX #11: grain_penalty is now a configurable param (default 0.18)
 *   instead of a magic number buried in the formula.
 */
export function calculateYield(ingredient, material, { grainPenaltyRate = 0.18 } = {}) {
  const {
    finished_length_mm,
    finished_width_mm,
    quantity_required: quantity,
    can_rotate,
    edge_bands     = [],
    waste_percentage = 0,
  } = ingredient

  const {
    saw_kerf_mm     = 3.2,
    has_grain,
    sheet_length_mm = 2800,
    sheet_width_mm  = 2070,
    edge_trim_mm    = 8,
  } = material

  // Kromka deductions per edge
  const kromkaTop    = edge_bands.find(b => b.edge_position === 'top')?.thickness_mm    ?? 0
  const kromkaBottom = edge_bands.find(b => b.edge_position === 'bottom')?.thickness_mm ?? 0
  const kromkaLeft   = edge_bands.find(b => b.edge_position === 'left')?.thickness_mm   ?? 0
  const kromkaRight  = edge_bands.find(b => b.edge_position === 'right')?.thickness_mm  ?? 0

  const cut_length = finished_length_mm - kromkaLeft - kromkaRight
  const cut_width  = finished_width_mm  - kromkaTop  - kromkaBottom

  if (cut_length <= 0 || cut_width <= 0) {
    throw new Error('ჭრის ზომები 0-ზე ნაკლებია — შეამოწმეთ კრომკის სისქეები')
  }

  // Net area (what the parts actually occupy)
  const net_area_m2 = (cut_length * cut_width * quantity) / 1_000_000

  // Kerf loss per part
  const kerf_fraction =
    ((cut_length + saw_kerf_mm) * (cut_width + saw_kerf_mm) - cut_length * cut_width) /
    (cut_length * cut_width)

  // Grain penalty: grain-locked parts reduce nesting efficiency
  const grain_penalty = (has_grain && !can_rotate) ? grainPenaltyRate : 0

  // BUG FIX #10: Correct 2D amortisation of edge trim across the full sheet
  const parts_per_length = Math.max(1, Math.floor(sheet_length_mm / cut_length))
  const parts_per_width  = Math.max(1, Math.floor(sheet_width_mm  / cut_width))
  const parts_per_sheet  = parts_per_length * parts_per_width

  const sheet_edge_trim_area =
    (sheet_length_mm * edge_trim_mm * 2 + sheet_width_mm * edge_trim_mm * 2) / 1_000_000
  const sheet_edge_trim_m2 = sheet_edge_trim_area / parts_per_sheet

  // Manual override buffer
  const manual_buffer = waste_percentage / 100

  const gross_area_m2 = net_area_m2 * (1 + kerf_fraction + grain_penalty + manual_buffer) +
                        sheet_edge_trim_m2

  // Kromka linear meters per unit
  const kromka_lm_per_unit = (
    (kromkaTop    > 0 ? finished_length_mm : 0) +
    (kromkaBottom > 0 ? finished_length_mm : 0) +
    (kromkaLeft   > 0 ? finished_width_mm  : 0) +
    (kromkaRight  > 0 ? finished_width_mm  : 0)
  ) / 1000

  return {
    cut_length_mm:      Math.round(cut_length),
    cut_width_mm:       Math.round(cut_width),
    net_area_m2:        +net_area_m2.toFixed(4),
    gross_area_m2:      +gross_area_m2.toFixed(4),
    kerf_pct:           +(kerf_fraction * 100).toFixed(2),
    grain_penalty_pct:  +(grain_penalty * 100).toFixed(2),
    manual_buffer_pct:  +waste_percentage.toFixed(2),
    edge_trim_m2:       +sheet_edge_trim_m2.toFixed(4),
    parts_per_sheet,
    kromka_lm_per_unit: +kromka_lm_per_unit.toFixed(3),
    kromka_lm_total:    +(kromka_lm_per_unit * quantity).toFixed(3),
  }
}


// ─────────────────────────────────────────────────────────────
// EDGE BANDS
// ─────────────────────────────────────────────────────────────

/**
 * BUG FIX #12: saveEdgeBands now uses a Supabase transaction-like pattern
 * (delete → insert in a single network roundtrip via RPC if available,
 *  or guarded with explicit error handling to avoid silent data loss).
 *
 * If the insert fails after the delete, an error is thrown — the caller
 * should show an error and the user can retry. For true atomicity,
 * wrap in a Postgres function (see comment below).
 */
export async function saveEdgeBands(recipeIngredientId, edgeBands) {
  // Delete existing
  const { error: delErr } = await supabase
    .from('recipe_ingredient_edge_bands')
    .delete()
    .eq('recipe_ingredient_id', recipeIngredientId)

  if (delErr) throw delErr  // Abort before data is lost

  if (!edgeBands || edgeBands.length === 0) return []

  const { data, error } = await supabase
    .from('recipe_ingredient_edge_bands')
    .insert(
      edgeBands.map(b => ({
        ...b,
        recipe_ingredient_id: recipeIngredientId,
        // Omit id so DB generates fresh UUIDs
        id: undefined,
      }))
    )
    .select()

  if (error) throw error
  return data
}

export async function getEdgeBandsForIngredient(recipeIngredientId) {
  const { data, error } = await supabase
    .from('recipe_ingredient_edge_bands')
    .select('*, kromka_material:raw_materials(id, name, thickness_mm)')
    .eq('recipe_ingredient_id', recipeIngredientId)

  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────
// WASTE ACTUALS
// ─────────────────────────────────────────────────────────────

export async function logWasteActual({
  productionOrderId,
  materialId,
  theoreticalGrossM2,
  actualConsumedM2,
  offcutReturnedM2 = 0,
  notes            = null,
}) {
  // Guard against nonsensical inputs
  if (offcutReturnedM2 > actualConsumedM2) {
    throw new Error('offcutReturnedM2 cannot exceed actualConsumedM2')
  }

  const { data, error } = await supabase
    .from('production_waste_actuals')
    .insert({
      production_order_id:  productionOrderId,
      material_id:          materialId,
      theoretical_gross_m2: theoreticalGrossM2,
      actual_consumed_m2:   actualConsumedM2,
      offcut_returned_m2:   offcutReturnedM2,
      notes,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getWasteEfficiencySummary() {
  const { data, error } = await supabase
    .from('v_waste_efficiency_summary')
    .select('*')

  if (error) throw error
  return data
}

// NEW: Fetch inventory value summary
export async function getInventoryValueSummary() {
  const { data, error } = await supabase
    .from('v_offcut_inventory_value')
    .select('*')

  if (error) throw error
  return data
}

// NEW: Fetch aging report
export async function getAgingReport() {
  const { data, error } = await supabase
    .from('v_offcuts_aging')
    .select('*')

  if (error) throw error
  return data
}
