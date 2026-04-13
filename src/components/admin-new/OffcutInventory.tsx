// src/components/manufacturing/OffcutInventory.jsx
// Kale Group ERP — Offcut Inventory Browser  (FIXED)
// Obsidian & Gilt glassmorphism design standard

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/src/lib/supabase'
import { disposeOffcut } from '@/src/services/offcutService'

const G = {
  gold:        '#d97706',
  goldLight:   '#f59e0b',
  goldDim:     'rgba(245, 158, 11, 0.1)',
  goldBorder:  'rgba(245, 158, 11, 0.25)',
  glass:       '#ffffff',
  glassBorder: 'rgba(0,0,0,0.08)',
  surface:     '#f8fafc',
  text:        '#0f172a',
  textMuted:   '#64748b',
  error:       '#ef4444',
  success:     '#10b981',
  warning:     '#f59e0b',
  bg:          'transparent',
}

const STATUS_COLORS = {
  available:          { color: G.success,  label: 'ხელმისაწვდომი' },
  reserved:           { color: G.warning,  label: 'დაჯავშნული' },
  consumed:           { color: G.textMuted,label: 'გამოყენებული' },
  damaged:            { color: G.error,    label: 'დაზიანებული' },
  disposed:           { color: G.error,    label: 'ჩამოწერილი' },
  pending_inspection: { color: G.warning,  label: 'შემოწმება' },
}

const QUALITY_COLORS = { A: G.success, B: G.warning, C: G.error, SCRAP: G.textMuted }

// BUG FIX #13: Removed dead 'stats' state that was declared but never populated.
// Added proper stats derived from loaded data using useMemo instead.

// ── ConfirmDialog (NEW: prevents accidental disposals) ────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.98)',
          border: `1px solid rgba(224,92,92,0.3)`,
          borderRadius: 14,
          padding: '24px 28px',
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
        <p style={{ margin: '0 0 20px', color: G.text, fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: 8,
              border: `1px solid ${G.glassBorder}`,
              background: 'transparent', color: G.textMuted, cursor: 'pointer', fontSize: 13,
            }}
          >
            გაუქმება
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: 8,
              border: `1px solid rgba(224,92,92,0.4)`,
              background: 'rgba(224,92,92,0.12)',
              color: G.error, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            დადასტურება
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── OffcutVisual ──────────────────────────────────────────────
function OffcutVisual({ length, width, grainDirection, quality, size = 80 }) {
  const aspect = length / width
  const vizW = aspect >= 1 ? size : size * aspect
  const vizH = aspect >= 1 ? size / aspect : size
  const qColor = QUALITY_COLORS[quality] ?? G.textMuted

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size + 8, height: size + 8 }}>
      <div style={{
        width: vizW,
        height: vizH,
        background: `linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(201,168,76,0.05) 100%)`,
        border: `1.5px solid ${qColor}44`,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: vizW > 40 ? 18 : 12,
          color: qColor,
          opacity: 0.8,
          transform: grainDirection === 'transverse' ? 'rotate(90deg)' : 'none',
        }}>
          {grainDirection === 'none' ? '◻' : '↕'}
        </span>
        <div style={{
          position: 'absolute', top: -6, right: -6,
          width: 16, height: 16, borderRadius: '50%',
          background: `${qColor}33`, border: `1px solid ${qColor}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: qColor, fontWeight: 700,
        }}>
          {quality}
        </div>
      </div>
    </div>
  )
}

// ── OffcutCard ────────────────────────────────────────────────
function OffcutCard({ offcut, onDispose, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const status  = STATUS_COLORS[offcut.status] ?? STATUS_COLORS.available
  const daysOld = Math.floor((Date.now() - new Date(offcut.created_at).getTime()) / 86400000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      // BUG FIX #14: onSelect was hardcoded to console.log — now properly forwarded
      onClick={() => onSelect?.(offcut)}
      style={{
        background: hovered ? G.surface : G.glass,
        border: `1px solid ${hovered ? G.goldBorder : G.glassBorder}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'background 0.18s, border-color 0.18s',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <OffcutVisual
        length={offcut.length_mm}
        width={offcut.width_mm}
        grainDirection={offcut.grain_direction}
        quality={offcut.quality_grade}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: G.gold, fontFamily: 'monospace', fontWeight: 600 }}>
            {offcut.offcut_code}
          </span>
          <span style={{
            fontSize: 10, color: status.color,
            background: `${status.color}1a`,
            border: `1px solid ${status.color}44`,
            borderRadius: 5, padding: '2px 7px',
          }}>
            {status.label}
          </span>
        </div>

        <div style={{ fontSize: 13, color: G.text, fontWeight: 500, marginBottom: 4 }}>
          {offcut.material_name}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: G.textMuted }}>
            {offcut.length_mm} × {offcut.width_mm} × {offcut.thickness_mm}mm
          </span>
          <span style={{ fontSize: 12, color: G.goldLight, fontWeight: 600 }}>
            {parseFloat(offcut.area_m2).toFixed(4)} m²
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
          {offcut.warehouse_zone && (
            <span style={{ fontSize: 11, color: G.textMuted }}>
              📍 {offcut.warehouse_zone}{offcut.shelf_position ? ` / ${offcut.shelf_position}` : ''}
            </span>
          )}
          <span style={{
            fontSize: 10,
            color: daysOld > 300 ? G.error : daysOld > 180 ? G.warning : G.textMuted,
          }}>
            {daysOld === 0 ? 'დღეს' : `${daysOld} დღის წინ`}
          </span>
          {offcut.estimated_value != null && (
            <span style={{ fontSize: 10, color: G.gold, marginLeft: 'auto' }}>
              ≈ {Number(offcut.estimated_value).toFixed(2)} ₾
            </span>
          )}
        </div>
      </div>

      {offcut.status === 'available' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); onDispose(offcut) }}
            style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 11,
              border: `1px solid rgba(224,92,92,0.3)`,
              background: 'rgba(224,92,92,0.08)',
              color: G.error, cursor: 'pointer',
            }}
          >
            დაზიანება
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────

interface OffcutInventoryProps {
  onSelectOffcut?: (offcut: any) => void
}

export default function OffcutInventory({ onSelectOffcut }: OffcutInventoryProps) {
  const [offcuts, setOffcuts]         = useState([])
  const [materials, setMaterials]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterMat, setFilterMat]     = useState('')
  // BUG FIX #15: filterStatus is now functional — connected to query + UI control
  const [filterStatus, setFilterStatus] = useState('available')
  const [filterGrain, setFilterGrain] = useState('')
  const [sortBy, setSortBy]           = useState('area_asc')
  const [searchCode, setSearchCode]   = useState('')
  // BUG FIX #13: confirm dialog state replaces the unused 'stats' state
  const [confirmDispose, setConfirmDispose] = useState(null) // { offcut, reason }

  // BUG FIX #16: useCallback prevents stale-closure issues with useEffect
  const fetchOffcuts = useCallback(async () => {
    setLoading(true)
    // BUG FIX #15: Use the correct view based on filterStatus
    const view = filterStatus === 'available' ? 'v_available_offcuts' : 'v_all_offcuts'
    let query = supabase.from(view).select('*')

    if (filterMat)                                   query = query.eq('parent_material_id', filterMat)
    if (filterGrain)                                 query = query.eq('grain_direction', filterGrain)
    if (searchCode)                                  query = query.ilike('offcut_code', `%${searchCode}%`)
    if (filterStatus !== 'all' && filterStatus !== 'available')
                                                     query = query.eq('status', filterStatus)

    const { data, error } = await query
    if (!error) setOffcuts(data ?? [])
    setLoading(false)
  }, [filterMat, filterGrain, searchCode, filterStatus])

  useEffect(() => {
    fetchOffcuts()
  }, [fetchOffcuts])

  // NEW: Real-time subscription — updates when another user adds/consumes offcuts
  useEffect(() => {
    const channel = supabase
      .channel('offcut-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'material_offcuts',
      }, () => {
        fetchOffcuts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchOffcuts])

  useEffect(() => {
    supabase
      .from('raw_materials')
      .select('id, name, thickness_mm')
      .eq('material_type', 'sheet')
      .order('name')
      .then(({ data }) => setMaterials(data ?? []))
  }, [])

  const sorted = useMemo(() => {
    const arr = [...offcuts]
    switch (sortBy) {
      case 'area_asc':  return arr.sort((a, b) => a.area_m2 - b.area_m2)
      case 'area_desc': return arr.sort((a, b) => b.area_m2 - a.area_m2)
      case 'age_asc':   return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'age_desc':  return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      default:          return arr
    }
  }, [offcuts, sortBy])

  // BUG FIX #13: Stats computed properly from loaded data
  const stats = useMemo(() => ({
    totalCount:     offcuts.length,
    totalArea:      offcuts.reduce((s, o) => s + parseFloat(o.area_m2 ?? 0), 0),
    totalValue:     offcuts.reduce((s, o) => s + parseFloat(o.estimated_value ?? 0), 0),
    agingCount:     offcuts.filter(o => {
                      const d = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86400000)
                      return d > 270
                    }).length,
  }), [offcuts])

  // BUG FIX: onDispose now opens confirmation dialog
  function handleDisposeRequest(offcut) {
    setConfirmDispose({ offcut, reason: 'damaged' })
  }

  async function handleDisposeConfirm() {
    if (!confirmDispose) return
    await disposeOffcut(confirmDispose.offcut.id, confirmDispose.reason)
    setConfirmDispose(null)
    fetchOffcuts()
  }

  const selectStyles = {
    width: '100%', background: '#f8fafc', border: `1px solid ${G.glassBorder}`,
    borderRadius: 8, padding: '8px 12px', color: G.text, fontSize: 13, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: 'system-ui, sans-serif' }}>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmDispose && (
          <ConfirmDialog
            message={`დარწმუნებული ხართ, რომ ${confirmDispose.offcut.offcut_code} დაზიანებულია?`}
            onConfirm={handleDisposeConfirm}
            onCancel={() => setConfirmDispose(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderBottom: `1px solid ${G.glassBorder}`,
        padding: '20px 28px',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', maxWidth: 1100, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 11, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              წარმოება
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: G.text }}>
              ნარჩენების ინვენტარი
            </h1>
          </div>

          {/* BUG FIX #13: Stats now correctly populated from computed stats */}
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: filterStatus === 'all' ? 'სულ' : STATUS_COLORS[filterStatus]?.label ?? 'ჩანაწერები', value: stats.totalCount, color: G.success },
              { label: 'სულ ფართობი', value: `${stats.totalArea.toFixed(2)} m²`, color: G.goldLight },
              ...(stats.totalValue > 0
                ? [{ label: 'სავარაუდო ღირებულება', value: `${stats.totalValue.toFixed(2)} ₾`, color: G.gold }]
                : []),
              ...(stats.agingCount > 0
                ? [{ label: 'ვადაგასული', value: stats.agingCount, color: G.warning }]
                : []),
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: G.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>

        {/* Filters */}
        <div style={{
          background: G.glass,
          border: `1px solid ${G.glassBorder}`,
          borderRadius: 14,
          padding: '16px 18px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: 11, color: G.textMuted, display: 'block', marginBottom: 6 }}>კოდი</label>
            <input
              placeholder="OFC-..."
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              style={{
                width: '100%', background: '#f8fafc', border: `1px solid ${G.glassBorder}`,
                borderRadius: 8, padding: '8px 12px', color: G.text, fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Material filter */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 11, color: G.textMuted, display: 'block', marginBottom: 6 }}>მასალა</label>
            <select value={filterMat} onChange={e => setFilterMat(e.target.value)} style={selectStyles}>
              <option value="">ყველა მასალა</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.thickness_mm}mm)</option>
              ))}
            </select>
          </div>

          {/* BUG FIX #15: Status filter is now wired up to the query */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, color: G.textMuted, display: 'block', marginBottom: 6 }}>სტატუსი</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyles}>
              <option value="available">ხელმისაწვდომი</option>
              <option value="reserved">დაჯავშნული</option>
              <option value="pending_inspection">შემოწმება</option>
              <option value="consumed">გამოყენებული</option>
              <option value="damaged">დაზიანებული</option>
              <option value="disposed">ჩამოწერილი</option>
              <option value="all">ყველა</option>
            </select>
          </div>

          {/* Grain filter */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, color: G.textMuted, display: 'block', marginBottom: 6 }}>ტექსტურა</label>
            <select value={filterGrain} onChange={e => setFilterGrain(e.target.value)} style={selectStyles}>
              <option value="">ყველა</option>
              <option value="longitudinal">↕ სიგრძეზე</option>
              <option value="transverse">↔ სიგანეზე</option>
              <option value="none">◻ უბრალო</option>
            </select>
          </div>

          {/* Sort */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, color: G.textMuted, display: 'block', marginBottom: 6 }}>სორტირება</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyles}>
              <option value="area_asc">ფართობი ↑</option>
              <option value="area_desc">ფართობი ↓</option>
              <option value="age_asc">ძველი პირველი</option>
              <option value="age_desc">ახალი პირველი</option>
            </select>
          </div>

          <button
            onClick={fetchOffcuts}
            style={{
              padding: '9px 18px', borderRadius: 9,
              border: `1px solid ${G.goldBorder}`,
              background: G.goldDim,
              color: G.goldLight, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              alignSelf: 'flex-end',
            }}
          >
            განახლება
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: G.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            იტვირთება...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: G.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, color: G.text, marginBottom: 8 }}>ნარჩენი ფილები არ მოიძებნა</div>
            <div style={{ fontSize: 13 }}>შეცვალეთ ფილტრი ან დარეგისტრირეთ ახალი ნარჩენი</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {sorted.map(o => (
                <OffcutCard
                  key={o.id}
                  offcut={o}
                  onDispose={handleDisposeRequest}
                  // BUG FIX #14: Properly forward onSelectOffcut prop
                  onSelect={onSelectOffcut}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
