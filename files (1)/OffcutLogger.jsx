// src/components/manufacturing/OffcutLogger.jsx
// Kale Group ERP — Post-Production Offcut Logger  (FIXED)
// Obsidian & Gilt glassmorphism design standard

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { createOffcut } from '../../services/offcutService'

// ── Design tokens ─────────────────────────────────────────────
const G = {
  gold:        '#c9a84c',
  goldLight:   '#e8c97a',
  goldDim:     'rgba(201,168,76,0.15)',
  goldBorder:  'rgba(201,168,76,0.3)',
  glass:       'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  surface:     'rgba(255,255,255,0.06)',
  surfaceHover:'rgba(255,255,255,0.09)',
  text:        '#e8e8f0',
  textMuted:   'rgba(232,232,240,0.5)',
  error:       '#e05c5c',
  errorDim:    'rgba(224,92,92,0.15)',
  success:     '#5cb88a',
  successDim:  'rgba(92,184,138,0.15)',
  warning:     '#e0a84c',
}

// ── Grain direction options ───────────────────────────────────
const GRAIN_OPTIONS_WITH_GRAIN = [
  { value: 'longitudinal', label: 'სიგრძეზე ↕', icon: '↕' },
  { value: 'transverse',   label: 'სიგანეზე ↔', icon: '↔' },
]

const GRAIN_OPTIONS_NO_GRAIN = [
  { value: 'none', label: 'უბრალო', icon: '◻' },
]

const QUALITY_OPTIONS = [
  { value: 'A', label: 'A — პირველადი',  color: G.success },
  { value: 'B', label: 'B — მცირე ნაკლი', color: G.warning },
  { value: 'C', label: 'C — დიდი ნაკლი',  color: G.error },
]

// BUG FIX #17: newEntry defined as a pure function OUTSIDE the component.
// Was defined inside as a function declaration after useState call — confusing to read
// and fragile if refactored. Pure factory functions belong outside React components.
function newEntry() {
  return {
    id:             crypto.randomUUID(),
    materialId:     '',
    length:         '',
    width:          '',
    grainDirection: 'none',
    quality:        'A',
    zone:           '',
    shelf:          '',
  }
}

// ── Sub-components ────────────────────────────────────────────

function GlassInput({ label, unit, value, onChange, type = 'number', error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            background: G.glass,
            border: `1px solid ${error ? G.error : G.glassBorder}`,
            borderRadius: 8,
            padding: unit ? '10px 44px 10px 14px' : '10px 14px',
            color: G.text,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e  => (e.target.style.borderColor = G.gold)}
          onBlur={e   => (e.target.style.borderColor = error ? G.error : G.glassBorder)}
          {...props}
        />
        {unit && (
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: G.textMuted, pointerEvents: 'none',
          }}>
            {unit}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: 11, color: G.error }}>{error}</span>}
    </div>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: G.glass,
      border: `1px solid ${G.glassBorder}`,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s',
            background: value === opt.value ? G.goldDim : 'transparent',
            color: value === opt.value ? G.goldLight : G.textMuted,
            outline: value === opt.value ? `1px solid ${G.goldBorder}` : 'none',
          }}
        >
          {opt.icon && <span style={{ marginRight: 4 }}>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Offcut Entry Form ─────────────────────────────────────────

function OffcutEntryForm({ index, entry, materials, onChange, onRemove }) {
  const material = materials.find(m => m.id === entry.materialId)

  // BUG FIX #18: CRITICAL — Grain direction options were BACKWARDS.
  //   Old: has_grain=true → show all; has_grain=false → hide 'none' (show longitudinal + transverse)
  //   That means a no-grain material showed grain options — completely wrong!
  //   Fixed: has_grain=true → show longitudinal + transverse
  //          has_grain=false (or no material) → show only 'none'
  const grainOptions = material?.has_grain ? GRAIN_OPTIONS_WITH_GRAIN : GRAIN_OPTIONS_NO_GRAIN

  // When material changes, reset grainDirection to sensible default
  const handleMaterialChange = (matId) => {
    const newMat = materials.find(m => m.id === matId)
    const defaultGrain = newMat?.has_grain ? 'longitudinal' : 'none'
    onChange({ ...entry, materialId: matId, grainDirection: defaultGrain })
  }

  // BUG FIX #19: Parse to int for dimension comparisons (was comparing string >= number)
  const parsedLength = parseInt(entry.length) || 0
  const parsedWidth  = parseInt(entry.width)  || 0

  const lengthError = entry.length && parsedLength < 50 ? 'მინ. 50mm' : null
  const widthError  = entry.width  && parsedWidth  < 50 ? 'მინ. 50mm' : null

  const belowMinSize = material && parsedLength > 0 && parsedWidth > 0 && (
    parsedLength < material.min_offcut_length_mm || parsedWidth < material.min_offcut_width_mm
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      style={{
        background: G.glass,
        border: `1px solid ${G.glassBorder}`,
        borderRadius: 12,
        padding: '16px 18px',
        position: 'relative',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{
          fontSize: 11, color: G.gold, textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: 600,
        }}>
          ნარჩენი #{index + 1}
        </span>
        <button
          onClick={onRemove}
          style={{
            background: G.errorDim, border: `1px solid rgba(224,92,92,0.3)`,
            borderRadius: 6, color: G.error, cursor: 'pointer',
            padding: '3px 10px', fontSize: 12,
          }}
        >
          წაშლა
        </button>
      </div>

      {/* Material selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
          მასალა
        </label>
        <select
          value={entry.materialId || ''}
          onChange={e => handleMaterialChange(e.target.value)}
          style={{
            width: '100%',
            background: '#111118',
            border: `1px solid ${G.glassBorder}`,
            borderRadius: 8,
            padding: '10px 14px',
            color: G.text,
            fontSize: 14,
            outline: 'none',
          }}
        >
          <option value="">-- მასალა --</option>
          {materials
            .filter(m => m.material_type === 'sheet')
            .map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.thickness_mm}mm)
              </option>
            ))}
        </select>
      </div>

      {/* Dimensions row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <GlassInput
          label="სიგრძე"
          unit="mm"
          value={entry.length}
          onChange={v => onChange({ ...entry, length: v })}
          min={50}
          error={lengthError}
        />
        <GlassInput
          label="სიგანე"
          unit="mm"
          value={entry.width}
          onChange={v => onChange({ ...entry, width: v })}
          min={50}
          error={widthError}
        />
      </div>

      {/* Area preview */}
      {parsedLength > 0 && parsedWidth > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: G.goldDim,
            border: `1px solid ${G.goldBorder}`,
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: G.textMuted }}>ფართობი</span>
          <span style={{ fontSize: 15, color: G.goldLight, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {(parsedLength * parsedWidth / 1_000_000).toFixed(4)} m²
          </span>
        </motion.div>
      )}

      {/* BUG FIX #18: Grain direction — correct options per material */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          ტექსტურის მიმართულება
          {!material?.has_grain && (
            <span style={{ color: G.textMuted, fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>
              (ტექსტურა არ გააჩნია)
            </span>
          )}
        </label>
        <SegmentedControl
          options={grainOptions}
          value={entry.grainDirection || (material?.has_grain ? 'longitudinal' : 'none')}
          onChange={v => onChange({ ...entry, grainDirection: v })}
        />
      </div>

      {/* Quality */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          ხარისხი
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {QUALITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...entry, quality: opt.value })}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 8,
                border: `1px solid ${(entry.quality || 'A') === opt.value ? opt.color : G.glassBorder}`,
                background: (entry.quality || 'A') === opt.value ? `${opt.color}22` : 'transparent',
                color: (entry.quality || 'A') === opt.value ? opt.color : G.textMuted,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all 0.18s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <GlassInput
          label="სექტორი (Rack)"
          type="text"
          value={entry.zone || ''}
          onChange={v => onChange({ ...entry, zone: v })}
          placeholder="RACK-A"
        />
        <GlassInput
          label="შელფი"
          type="text"
          value={entry.shelf || ''}
          onChange={v => onChange({ ...entry, shelf: v })}
          placeholder="Row-3-Slot-7"
        />
      </div>

      {/* Min size warning */}
      {belowMinSize && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 12,
            background: 'rgba(224,168,76,0.1)',
            border: `1px solid rgba(224,168,76,0.3)`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: G.warning,
          }}
        >
          ⚠️ ეს ნარჩენი {material.name}-ის მინიმუმ ზომაზე ({material.min_offcut_length_mm}×{material.min_offcut_width_mm}mm) პატარაა და სკრაპად ჩაეწერება.
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Main OffcutLogger Component ───────────────────────────────

export default function OffcutLogger({ productionOrderId, onComplete, onSkip }) {
  const [step, setStep]       = useState('ask')   // ask → log → done
  const [entries, setEntries] = useState(() => [newEntry()])  // BUG FIX #17: lazy init
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState([])
  const [error, setError]     = useState(null)

  useEffect(() => {
    supabase
      .from('raw_materials')
      .select('id, name, thickness_mm, material_type, has_grain, min_offcut_length_mm, min_offcut_width_mm')
      .eq('material_type', 'sheet')
      .order('name')
      .then(({ data }) => setMaterials(data ?? []))
  }, [])

  // BUG FIX #20: useCallback for mutable handlers to prevent unnecessary child re-renders
  const addEntry = useCallback(() => {
    setEntries(prev => [...prev, newEntry()])
  }, [])

  const updateEntry = useCallback((id, updated) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e))
  }, [])

  const removeEntry = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  // BUG FIX #19: isValid uses parseInt — no more string/number coercion confusion
  const isValid = entries.every(e => {
    const len = parseInt(e.length) || 0
    const wid = parseInt(e.width)  || 0
    return e.materialId && len >= 50 && wid >= 50 && e.grainDirection
  })

  async function handleSave() {
    if (!isValid) return
    setLoading(true)
    setError(null)

    try {
      // BUG FIX #21: Parallel saves with Promise.all (was sequential for-of loop)
      // Sequential approach was O(n) DB round-trips; parallel is O(1) effective latency
      const results = await Promise.all(
        entries.map(entry => {
          const mat = materials.find(m => m.id === entry.materialId)
          return createOffcut({
            parentMaterialId:   entry.materialId,
            generatedByOrderId: productionOrderId,
            thicknessMm:        mat?.thickness_mm ?? 18,
            lengthMm:           parseInt(entry.length),
            widthMm:            parseInt(entry.width),
            grainDirection:     entry.grainDirection,
            qualityGrade:       entry.quality,
            warehouseZone:      entry.zone  || null,
            shelfPosition:      entry.shelf || null,
          })
        })
      )
      setSaved(results)
      setStep('done')
    } catch (err) {
      // BUG FIX #22: Error now shows the specific offcut that failed
      setError(`შეცდომა: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, rgba(18,18,26,0.98) 0%, rgba(12,12,18,0.98) 100%)',
          border: `1px solid ${G.glassBorder}`,
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Gold top accent */}
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${G.gold}, transparent)`,
        }} />

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${G.glassBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 11, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              წარმოების დასრულება
            </div>
            <h2 style={{ margin: 0, fontSize: 20, color: G.text, fontWeight: 600 }}>
              ნარჩენების აღრიცხვა
            </h2>
          </div>
          {productionOrderId && (
            <div style={{
              background: G.goldDim,
              border: `1px solid ${G.goldBorder}`,
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              color: G.gold,
              fontFamily: 'monospace',
            }}>
              {productionOrderId.slice(0, 8).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">

            {/* STEP: ASK */}
            {step === 'ask' && (
              <motion.div
                key="ask"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '16px 0' }}
              >
                <div style={{ fontSize: 48, marginBottom: 8 }}>🪵</div>
                <p style={{ margin: 0, fontSize: 16, color: G.text, lineHeight: 1.6 }}>
                  წარმოებამ დაასრულა. გყავთ <strong style={{ color: G.goldLight }}>გამოსაყენებელი ნარჩენი ფილები</strong>?
                </p>
                <p style={{ margin: 0, fontSize: 13, color: G.textMuted, lineHeight: 1.6 }}>
                  200mm × 150mm-ზე დიდი ნარჩენები შეიძლება მომდევნო შეკვეთებში გამოიყენოს.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
                  <button
                    onClick={onSkip}
                    style={{
                      padding: '12px 28px', borderRadius: 10, border: `1px solid ${G.glassBorder}`,
                      background: 'transparent', color: G.textMuted, cursor: 'pointer', fontSize: 14,
                    }}
                  >
                    ნარჩენი არ არის
                  </button>
                  <button
                    onClick={() => setStep('log')}
                    style={{
                      padding: '12px 28px', borderRadius: 10,
                      border: `1px solid ${G.goldBorder}`,
                      background: G.goldDim,
                      color: G.goldLight, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    }}
                  >
                    დიახ, ვარეგისტრირებ →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP: LOG */}
            {step === 'log' && (
              <motion.div key="log" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence>
                    {entries.map((entry, i) => (
                      <OffcutEntryForm
                        key={entry.id}
                        index={i}
                        entry={entry}
                        materials={materials}
                        onChange={updated => updateEntry(entry.id, updated)}
                        onRemove={() => removeEntry(entry.id)}
                      />
                    ))}
                  </AnimatePresence>

                  <button
                    onClick={addEntry}
                    style={{
                      padding: '10px', borderRadius: 10,
                      border: `1px dashed ${G.glassBorder}`,
                      background: 'transparent',
                      color: G.textMuted,
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'all 0.18s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = G.gold; e.target.style.color = G.gold }}
                    onMouseLeave={e => { e.target.style.borderColor = G.glassBorder; e.target.style.color = G.textMuted }}
                  >
                    + კიდევ ერთი ნარჩენი
                  </button>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        background: G.errorDim,
                        border: `1px solid rgba(224,92,92,0.3)`,
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: G.error,
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP: DONE */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  style={{ fontSize: 56 }}
                >
                  ✅
                </motion.div>
                <h3 style={{ margin: 0, color: G.text }}>
                  {saved.length} ნარჩენი დარეგისტრირდა
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {saved.map(s => (
                    <div key={s.id} style={{
                      background: G.successDim,
                      border: `1px solid rgba(92,184,138,0.25)`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: G.success, fontFamily: 'monospace' }}>
                          {s.offcut_code}
                        </div>
                        <div style={{ fontSize: 12, color: G.textMuted, marginTop: 2 }}>
                          {s.length_mm} × {s.width_mm}mm — {parseFloat(s.area_m2).toFixed(4)} m²
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11, color: G.textMuted,
                        background: G.glass,
                        padding: '2px 8px', borderRadius: 6,
                      }}>
                        {s.grain_direction === 'longitudinal' ? '↕' : s.grain_direction === 'transverse' ? '↔' : '◻'}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${G.glassBorder}`,
          display: 'flex',
          justifyContent: step === 'log' ? 'space-between' : 'flex-end',
          alignItems: 'center',
          gap: 12,
        }}>
          {step === 'log' && (
            <button
              onClick={() => setStep('ask')}
              style={{
                padding: '10px 20px', borderRadius: 10,
                border: `1px solid ${G.glassBorder}`,
                background: 'transparent', color: G.textMuted,
                cursor: 'pointer', fontSize: 13,
              }}
            >
              ← უკან
            </button>
          )}

          {step === 'log' && (
            <button
              onClick={handleSave}
              disabled={!isValid || loading}
              style={{
                padding: '12px 28px', borderRadius: 10,
                border: `1px solid ${isValid ? G.gold : G.glassBorder}`,
                background: isValid ? G.goldDim : 'transparent',
                color: isValid ? G.goldLight : G.textMuted,
                cursor: isValid ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 600,
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'ინახება...' : `შენახვა (${entries.length})`}
            </button>
          )}

          {step === 'done' && (
            <button
              onClick={onComplete}
              style={{
                padding: '12px 28px', borderRadius: 10,
                border: `1px solid ${G.gold}`,
                background: G.goldDim,
                color: G.goldLight,
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}
            >
              დასრულება →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
