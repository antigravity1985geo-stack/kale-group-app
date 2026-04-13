# Kale Group ERP — Cutting & Offcut Logic: Full Implementation Plan

> **ATTENTION AI AGENT:** Follow this plan step-by-step, in exact order.
> Do NOT skip steps. Do NOT improvise. Every step has been validated against
> the actual codebase. If something is unclear, re-read this document.

---

## 0. EXECUTIVE SUMMARY

We are adding advanced furniture manufacturing logic to the Kale Group ERP:
- **Grain/texture direction** tracking on raw materials
- **Rotation permission** and **waste percentage** per recipe ingredient
- **Edge banding (კრომკა)** per ingredient edge
- **Offcut (ნარჩენი) inventory** — log, browse, reserve, consume remnants
- **Yield calculator** — physics-based gross area calculation
- **Post-production waste tracking** with efficiency metrics

Source files are in: `c:\Users\jabam\OneDrive\Desktop\Kale-group--main\files (1)\`

---

## 1. CRITICAL ERRORS FOUND IN SOURCE FILES (MUST FIX)

### 1.1 SQL Schema (`001_cutting_offcuts_schema.sql`)

| Line(s) | Bug | Fix |
|---------|-----|-----|
| 341, 357 | Views `v_available_offcuts` and `v_all_offcuts` reference `m.unit_of_measure` | Change to `m.unit` — our `raw_materials` table uses column `unit`, NOT `unit_of_measure` |
| 30 | `material_type` column added with `NOT NULL DEFAULT 'sheet'` | OK as-is, but existing rows will get `'sheet'` — which is correct for laminate/DDP materials but wrong for "ხრახნები", "წებო" etc. After migration, manually update non-sheet materials. |
| 513 | Seed data uses `unit_of_measure` column | Change to `unit` |
| 284-290 | Creates function `set_updated_at()` | Our DB already has `trigger_set_updated_at()`. Check for conflict; if `set_updated_at()` doesn't exist yet, creation is fine. If it does, wrap in `CREATE OR REPLACE`. Already uses `CREATE OR REPLACE` — OK. |
| 77 | `CHECK (thickness_mm IN (0.4, 1.0, 2.0, 3.0))` on edge bands | Too restrictive. Change to `CHECK (thickness_mm > 0 AND thickness_mm <= 5.0)` for flexibility |
| 21 | `grain_direction` CHECK allows only 3 values | OK as-is |
| 34-36 | Constraint `chk_grain_direction` | May fail if existing rows have `has_grain = TRUE` and `grain_direction IS NULL`. Since `has_grain` defaults to FALSE, all existing rows pass. **Safe.** |

### 1.2 Service File (`offcutService.js`)

| Line(s) | Bug | Fix |
|---------|-----|-----|
| 1 (filename) | Plain JavaScript `.js` | Rename to `.ts` and add TypeScript types |
| 5 | Import `'../lib/supabase'` | Change to `'@/src/lib/supabase'` (project convention) |
| 271 | `ingredient.quantity` referenced in `calculateYield` | Our schema uses `quantity_required`. Change to `ingredient.quantity_required` OR rename the destructured variable |

### 1.3 UI Components (`OffcutLogger.jsx`, `OffcutInventory.jsx`)

| File | Bug | Fix |
|------|-----|-----|
| Both | Plain JSX, not TSX | Convert to `.tsx` with TypeScript types |
| Both | Import `'../../lib/supabase'` | Change to `'@/src/lib/supabase'` |
| Both | Import `'../../services/offcutService'` | Change to correct path after moving service file |
| Both | Inline styles (dark Obsidian theme) | Our admin-new panel uses **Tailwind CSS**. These work standalone but clash visually with the existing panel. **Decision: keep inline styles for now** since these are modal overlays. In Phase 2, convert to Tailwind. |
| `OffcutLogger.jsx:225` | Filters `material_type === 'sheet'` | This column only exists AFTER migration runs. The component will show empty list if migration hasn't been applied. **Must run migration first.** |
| `OffcutInventory.jsx:304` | Same `material_type` filter issue | Same fix |

---

## 2. IMPLEMENTATION STEPS (EXACT ORDER)

### STEP 1: Fix and Apply SQL Migration

**File:** `files (1)/001_cutting_offcuts_schema.sql`

**Actions:**
1. Open **Supabase SQL Editor** (project: `cjvhoadkvjqsmoiypndw`)
2. Apply the fixed SQL (with corrections below)

**Corrections to make before running:**

```sql
-- LINE 341: Fix v_available_offcuts view
-- WRONG:  m.unit_of_measure AS material_uom,
-- RIGHT:  m.unit AS material_uom,

-- LINE 357: Fix v_all_offcuts view  
-- WRONG:  m.unit_of_measure AS material_uom,
-- RIGHT:  m.unit AS material_uom,

-- LINE 77: Fix edge band thickness constraint
-- WRONG:  CHECK (thickness_mm IN (0.4, 1.0, 2.0, 3.0)),
-- RIGHT:  CHECK (thickness_mm > 0 AND thickness_mm <= 5.0),

-- LINE 513: Fix seed data column name
-- WRONG:  INSERT INTO raw_materials (name, material_type, thickness_mm, unit_of_measure, has_grain)
-- RIGHT:  INSERT INTO raw_materials (name, material_type, thickness_mm, unit, has_grain)
```

**Verification:** After applying, run:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'raw_materials' AND column_name IN ('has_grain', 'thickness_mm', 'material_type');
-- Should return 3 rows

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'material_offcuts';
-- Should return 20+ rows

SELECT * FROM v_available_offcuts LIMIT 1;
-- Should NOT error (even if empty)
```

---

### STEP 2: Move and Fix Service File

**Source:** `files (1)/offcutService.js`
**Target:** `src/services/offcutService.ts`

**Actions:**
1. Create directory `src/services/` if it doesn't exist
2. Copy `offcutService.js` → `src/services/offcutService.ts`
3. Apply these fixes:

```diff
- import { supabase } from '../lib/supabase'
+ import { supabase } from '@/src/lib/supabase'
```

In the `calculateYield` function (around line 267-275), fix the destructured field name:
```diff
  const {
    finished_length_mm,
    finished_width_mm,
-   quantity,
+   quantity_required: quantity,
    can_rotate,
    edge_bands     = [],
    waste_percentage = 0,
  } = ingredient
```

Add minimal TypeScript interfaces at the top of the file (after imports):
```typescript
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
```

**Verification:** File compiles without TypeScript errors in the Vite dev server.

---

### STEP 3: Move and Fix UI Components

**Source files:**
- `files (1)/OffcutLogger.jsx` → `src/components/admin-new/OffcutLogger.tsx`
- `files (1)/OffcutInventory.jsx` → `src/components/admin-new/OffcutInventory.tsx`

**Actions for BOTH files:**

1. Copy and rename `.jsx` → `.tsx`
2. Fix imports:

```diff
- import { supabase } from '../../lib/supabase'
+ import { supabase } from '@/src/lib/supabase'

- import { createOffcut } from '../../services/offcutService'
+ import { createOffcut } from '@/src/services/offcutService'

- import { disposeOffcut } from '../../services/offcutService'
+ import { disposeOffcut } from '@/src/services/offcutService'
```

3. Add `React` import at the top:
```typescript
import React from 'react'
```

4. Add basic prop types for TypeScript:

**OffcutLogger.tsx:**
```typescript
interface OffcutLoggerProps {
  productionOrderId?: string
  onComplete: () => void
  onSkip: () => void
}
export default function OffcutLogger({ productionOrderId, onComplete, onSkip }: OffcutLoggerProps) {
```

**OffcutInventory.tsx:**
```typescript
interface OffcutInventoryProps {
  onSelectOffcut?: (offcut: any) => void
}
export default function OffcutInventory({ onSelectOffcut }: OffcutInventoryProps) {
```

**Verification:** Both files compile without errors. Components render when imported.

---

### STEP 4: Integrate into Manufacturing.tsx

**File:** `src/components/admin-new/Manufacturing.tsx`

**4a. Add Offcuts tab to the navigation:**

Update the `ModuleTab` type:
```diff
- type ModuleTab = "recipes" | "raw-materials" | "suppliers" | "purchases"
+ type ModuleTab = "recipes" | "raw-materials" | "suppliers" | "purchases" | "offcuts"
```

Add import at the top:
```typescript
import OffcutInventory from './OffcutInventory'
```

Add the tab button to the navigation array (inside the `motion.div` tabs):
```typescript
{ id: "offcuts", label: "ნარჩენები (Offcuts)", icon: <Package size={16} /> },
```

Add the tab content renderer:
```typescript
{activeTab === "offcuts" && <OffcutInventory />}
```

**4b. Add grain fields to Raw Materials form:**

In the `materialForm` state, add new fields:
```typescript
has_grain: false,
grain_direction: 'none' as string,
thickness_mm: 18,
sheet_length_mm: 2800,
sheet_width_mm: 2070,
material_type: 'sheet' as string,
```

In the material save handler (`handleSaveMaterial`), add to `payload`:
```typescript
has_grain: materialForm.has_grain,
grain_direction: materialForm.has_grain ? materialForm.grain_direction : 'none',
thickness_mm: materialForm.thickness_mm,
sheet_length_mm: materialForm.sheet_length_mm,
sheet_width_mm: materialForm.sheet_width_mm,
material_type: materialForm.material_type,
```

In the Material Modal form, add UI fields after the packaging section:
```tsx
{/* Grain/Texture Section */}
<div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20">
  <label className="flex items-center gap-3 text-base font-bold text-blue-700 cursor-pointer mb-4">
    <input type="checkbox" checked={materialForm.has_grain}
      onChange={e => setMaterialForm({...materialForm, has_grain: e.target.checked})}
      className="w-5 h-5 rounded" />
    ამ მასალას აქვს ტექსტურა/უზორი (grain direction)
  </label>
  
  {materialForm.has_grain && (
    <div className="grid grid-cols-2 gap-4 p-4 bg-white/50 rounded-xl">
      <div>
        <label className="block text-xs font-bold mb-1 uppercase">ტექსტურის მიმართულება</label>
        <select value={materialForm.grain_direction}
          onChange={e => setMaterialForm({...materialForm, grain_direction: e.target.value})}
          className="w-full px-4 py-3 border rounded-xl">
          <option value="longitudinal">სიგრძეზე ↕</option>
          <option value="transverse">სიგანეზე ↔</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1 uppercase">სისქე (mm)</label>
        <input type="number" step="0.1" value={materialForm.thickness_mm}
          onChange={e => setMaterialForm({...materialForm, thickness_mm: parseFloat(e.target.value) || 18})}
          className="w-full px-4 py-3 border rounded-xl" />
      </div>
    </div>
  )}
</div>
```

**4c. Add grain/rotation fields to Recipe Ingredients:**

In `recipeIngredients` state type, add:
```typescript
can_rotate?: boolean,
waste_percentage?: number,
required_grain_direction?: string,
```

In the recipe ingredient form, after the dimension calculator, add: 
- Checkbox: "მობრუნება დაშვებულია" (can_rotate)
- Number input: "დანაკარგის % (waste)" 
- Select: "ტექსტურის მოთხოვნა" (along_length / along_width / any)

These should only show when the selected raw material has `has_grain = true`.

In `handleSaveRecipe`, include new fields in the ingredient insert:
```typescript
const validIngs = recipeIngredients
  .filter(i => i.raw_material_ref_id && i.quantity_required > 0)
  .map(i => ({
    recipe_id: recData.id,
    raw_material_ref_id: i.raw_material_ref_id,
    raw_material_id: i.raw_material_ref_id,
    quantity_required: i.quantity_required,
    can_rotate: i.can_rotate ?? true,
    waste_percentage: i.waste_percentage ?? 0,
    required_grain_direction: i.required_grain_direction ?? 'any',
    finished_length_mm: i.use_dimensions ? i.length_mm : null,
    finished_width_mm: i.use_dimensions ? i.width_mm : null,
  }))
```

---

### STEP 5: Wire OffcutLogger into Production Completion

**Context:** When a user completes production (runs a recipe), the OffcutLogger modal should appear asking "Did you produce any usable offcuts?"

In `Manufacturing.tsx`, add:
1. Import: `import OffcutLogger from './OffcutLogger'`
2. State: `const [showOffcutLogger, setShowOffcutLogger] = useState(false)`
3. State: `const [currentProductionOrderId, setCurrentProductionOrderId] = useState<string | null>(null)`
4. After successful recipe production, call: `setShowOffcutLogger(true)`
5. Render the modal:
```tsx
{showOffcutLogger && (
  <OffcutLogger
    productionOrderId={currentProductionOrderId || undefined}
    onComplete={() => { setShowOffcutLogger(false); fetchData(); }}
    onSkip={() => { setShowOffcutLogger(false); fetchData(); }}
  />
)}
```

---

## 3. FILE PLACEMENT SUMMARY

```
src/
├── services/
│   └── offcutService.ts          ← NEW (from files(1)/offcutService.js, fixed)
├── components/
│   └── admin-new/
│       ├── Manufacturing.tsx      ← MODIFIED (add grain fields, offcuts tab, logger)
│       ├── OffcutLogger.tsx       ← NEW (from files(1)/OffcutLogger.jsx, fixed)
│       └── OffcutInventory.tsx    ← NEW (from files(1)/OffcutInventory.jsx, fixed)
```

---

## 4. VERIFICATION CHECKLIST

After all steps are complete:

- [ ] `npm run dev` runs without compilation errors
- [ ] Manufacturing page loads with 4 tabs: რეცეპტები, ნედლეული, მომწოდებლები, ნარჩენები
- [ ] New raw material can be created with grain/texture fields
- [ ] New recipe ingredient shows dimension calculator for მ² materials
- [ ] Recipe ingredient shows rotation/waste fields for grain materials
- [ ] Offcuts tab renders the OffcutInventory browser
- [ ] SQL views `v_available_offcuts` and `v_all_offcuts` return valid results
- [ ] `reserve_best_offcut()` function exists in Supabase

---

## 5. PHASE 2 (FUTURE — NOT NOW)

These are deferred to a follow-up session:
- Convert OffcutLogger/OffcutInventory from inline styles to Tailwind CSS
- Add edge banding (კრომკა) UI per ingredient edge
- Add yield calculator display in recipe detail view
- Integrate `calculateYield()` into recipe cost estimation
- Add barcode/QR printing for offcut labels
- Add pg_cron job for stale reservation cleanup
- Add real-time offcut matching suggestions when creating recipes

---

> **TO THE AI AGENT:** When you complete all steps, run `npm run dev` and
> verify the app loads. Then open the browser and navigate to the admin panel's
> Manufacturing section to confirm all tabs render correctly.
