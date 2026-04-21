# ⛔ STRICT ARCHITECTURAL MASTER PLAN: DB & BACKEND ALIGNMENT
**Author:** Senior AI Developer & Architect  
**Status:** SELF-REVIEWED v4.0 — PRODUCTION-SAFE — READY FOR EXECUTION  
**Date:** 18 აპრილი, 2026  
**Version:** 4.0 — FINAL (Self-reviewed, Bug-Fixed over v3.0)  
**Target AI:** Google AntiGravity — Gemini 3.1 Pro  

---

## ⚠️ v3.0 → v4.0 SELF-REVIEW: FOUND & FIXED

| # | სიმძიმე | სად | პრობლემა | გამოსწორება v4.0-ში |
|---|---------|-----|----------|---------------------|
| F1 | **CRITICAL** | Step 1.3b | DROP SQL მთლიანად კომენტარში იყო — Gemini-ი ვერ გაუშვებდა | Step 1.3b გადაწერილია: executable 2-ეტაპიანი flow |
| F2 | **CRITICAL** | ROLLBACK-1 | RPC definition DROP-ამდე არ ინახებოდა — Rollback შეუძლებელი | Step 1.3-ს წინ — SAVE definition ნაბიჯი დამატებულია |
| F3 | **CRITICAL** | ყველა Phase | DB Backup ინსტრუქცია სრულად გამოტოვებული | **PHASE 0** — Pre-Execution Backup დამატებულია |
| F4 | **CRITICAL** | Step 1.1, 1.2, 1.4a | `information_schema` query-ებში `table_schema = 'public'` აკლდა | ყველა query განახლებულია |
| F5 | **HIGH** | Step 2.0c | `offcuts.id = material_offcuts.id` კორელაციის ვარაუდი — შეიძლება მცდარი | Step 2.0 გადაწერილია: schema comparison + row count |
| F6 | **HIGH** | ROLLBACK-2 | offcuts DROP-ამდე data backup ინსტრუქცია არ იყო | Step 2.3-ს წინ — data dump ნაბიჯი დამატებულია |
| F7 | **MEDIUM** | Step 1.1 | NOT NULL + DEFAULT ერთ ALTER-ში — production lock-ის რისკი | 3-ეტაპიანი safe migration pattern გამოიყენება |

---

## 🤖 GEMINI — MANDATORY EXECUTION PROTOCOL

> **ეს პროტოკოლი სავალდებულოა. ყოველი სიტყვა — ინსტრუქციაა.**

1. **Phase 0 → Phase 1 → Phase 2 → Phase 3** — მკაცრი თანმიმდევრობა. გამოტოვება = FORBIDDEN.
2. **ყოველი Step-ის შემდეგ** — შეასრულე VERIFY query. მოსალოდნელ შედეგს რომ არ ემთხვეოდეს — **STOP. მომხმარებელს მოახსენე.**
3. **ყოველი Phase-ის ბოლოს** — გაჩერდი. Phase Report გამოუგზავნე მომხმარებელს. დასტური სთხოვე.
4. **ახალი features, refactoring, ან სხვა ცვლილებები** — FORBIDDEN სანამ Phase 3 არ დასრულდა.
5. **`DROP` ბრძანება** — მხოლოდ RESTRICT-ით. CASCADE = FORBIDDEN.
6. **SQL-ში `[BRACKET]` placeholder** — literal-ად არასდროს გაუშვა. Inspect ნაბიჯის შედეგი ჩასვი.
7. **Inspect → Save Result → Decide → Execute** — ეს თანმიმდევრობა ყველა Inspect ნაბიჯისთვის.

---

## 🚨 VERIFIED CRITICAL ISSUES

| # | სიმძიმე | პრობლემა | აღწერა |
|---|---------|----------|--------|
| 1 | CRITICAL | **Missing Columns — Backend Crash** | `server.ts`-ში `processSuccessfulOrder` ცდილობს `orders`-ში განაახლოს `accounting_status` და `accounting_error` — ეს ველები ბაზაში **არ არსებობს**. ასევე `cost_price` არ არსებობს `products`-ში. |
| 2 | CRITICAL | **RPC Overload Conflict** | `process_order_transaction`-ის **ორი ვერსია** ბაზაშია. Supabase ვერ განასხვავებს — runtime კონფლიქტი გარდაუვალია. |
| 3 | HIGH | **Orphaned inventory_transactions risk** | `inventory_transactions.product_id`-ს **Foreign Key არ აქვს**. hard delete → orphan ჩანაწერები. |
| 4 | MEDIUM | **Duplicate offcuts Tables** | `public.offcuts` (მარტივი) და `material_offcuts` (კომპლექსური) — ორივე არსებობს. |

---

# PHASE 0: Pre-Execution Backup (სავალდებულო!)

> **⚠️ ეს Phase v3.0-ში სრულად გამოტოვებული იყო — კრიტიკული შეცდომა.**  
> **Gemini: Phase 1-ის დაწყება Phase 0-ის გარეშე — FORBIDDEN.**

---

### Step 0.1 — შეამოწმე ბაზის მდგომარეობა (Baseline Snapshot)

```sql
-- Step 0.1: Baseline — record current state of all affected tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'products', 'inventory_transactions', 'offcuts', 'material_offcuts', 'manufacturing_orders')
ORDER BY table_name;
```

```sql
-- Step 0.1b: Record row counts for all affected tables
SELECT 'orders'                AS tbl, COUNT(*) AS rows FROM public.orders
UNION ALL
SELECT 'products',                      COUNT(*) FROM public.products
UNION ALL
SELECT 'inventory_transactions',        COUNT(*) FROM public.inventory_transactions
UNION ALL
SELECT 'offcuts',                       COUNT(*) FROM public.offcuts
UNION ALL
SELECT 'material_offcuts',              COUNT(*) FROM public.material_offcuts
UNION ALL
SELECT 'manufacturing_orders',          COUNT(*) FROM public.manufacturing_orders;
```

> **Gemini:** ამ query-ების შედეგი შეინახე. Phase 3 Sanity Check-ში ამ Baseline-ს შეადარებ. row count-ები მნიშვნელოვნად შეიცვლება ← ეს წითელი დროშაა.

---

### Step 0.2 — Supabase Backup

> **ეს ნაბიჯი SQL-ით ვერ შესრულდება — მომხმარებლის ქმედება სჭირდება.**

```
მომხმარებელს გადასცე ეს ინსტრუქცია:

"Phase 1-ის დაწყებამდე გთხოვთ შეასრულოთ:
 1. Supabase Dashboard → Settings → Database → Backups → 'Create backup'
    ან
 2. Terminal-ში: pg_dump -h [HOST] -U [USER] -d [DB] > backup_pre_kalegorup_18042026.sql

Phase 0 დასრულებულია? მომეცით დასტური."
```

**Gemini: Phase 1 — FORBIDDEN სანამ მომხმარებელი backup-ს არ დაადასტურებს.**

---

## ✅ PHASE 0 CHECKPOINT

```
GEMINI — STOP HERE.

[ ] Step 0.1: Baseline row counts შენახულია ✅
[ ] Step 0.2: მომხმარებელმა backup დაადასტურა ✅

მომხმარებელს მოახსენე:
"PHASE 0 (Backup) დასრულებულია. Phase 1-ის დასაწყებად თქვენი დასტური სჭირდება."
```

---

# PHASE 1: Database Schema Alignment (ბაზის სინქრონიზაცია)

> **ინსტრუმენტი:** `mcp_supabase-mcp-server_execute_sql`  
> **წინაპირობა:** Phase 0 სრულად დასრულებული.  
> **Rollback:** ფაილის ბოლოს იხ. ROLLBACK-1.

---

### Step 1.1 — დაამატე დაკარგული ველები `orders` ცხრილში

> **⚠️ v3.0-ში ერთ ALTER-ში იყო NOT NULL + DEFAULT — production lock-ის რისკი.**  
> **v4.0: 3-ეტაპიანი safe migration pattern.**

**Step 1.1a — დაამატე ველები NULL-ად (zero-downtime):**

```sql
-- Step 1.1a: Add columns as nullable first (no lock risk)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accounting_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS accounting_error  TEXT NULL;
```

**Step 1.1b — შეავსე არსებული ჩანაწერები:**

```sql
-- Step 1.1b: Backfill existing rows with default value
UPDATE public.orders
SET accounting_status = 'pending'
WHERE accounting_status IS NULL;
```

**Step 1.1c — დაამატე NOT NULL constraint:**

```sql
-- Step 1.1c: Now safely add NOT NULL constraint with default
ALTER TABLE public.orders
  ALTER COLUMN accounting_status SET NOT NULL,
  ALTER COLUMN accounting_status SET DEFAULT 'pending';
```

```sql
-- ✅ VERIFY 1.1:
SELECT column_name, data_type, column_default, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'        -- ← F4 fix: table_schema filter დამატებულია
  AND  table_name   = 'orders'
  AND  column_name  IN ('accounting_status', 'accounting_error')
ORDER BY column_name;
```

**✅ მოსალოდნელი შედეგი (2 სტრიქონი):**

| column_name | data_type | column_default | is_nullable |
|-------------|-----------|----------------|-------------|
| accounting_error | text | null | YES |
| accounting_status | text | 'pending'::text | NO |

**❌ თუ 0 ან 1 სტრიქონი — STOP. მომხმარებელს მოახსენე. Phase 1 ნუ გააგრძელებ.**

---

### Step 1.2 — დაამატე `cost_price` ველი `products` ცხრილში

```sql
-- Step 1.2a: Add as nullable first
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NULL;

-- Step 1.2b: Backfill
UPDATE public.products
SET cost_price = 0
WHERE cost_price IS NULL;

-- Step 1.2c: Add NOT NULL + DEFAULT
ALTER TABLE public.products
  ALTER COLUMN cost_price SET NOT NULL,
  ALTER COLUMN cost_price SET DEFAULT 0;
```

```sql
-- ✅ VERIFY 1.2:
SELECT column_name, data_type, numeric_precision, numeric_scale, column_default, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'        -- ← F4 fix
  AND  table_name   = 'products'
  AND  column_name  = 'cost_price';
```

**✅ მოსალოდნელი შედეგი:** 1 სტრიქონი — `cost_price`, numeric, precision=10, scale=2, default=0, NOT NULL.  
**❌ თუ 0 სტრიქონი — STOP.**

---

### Step 1.3 — RPC Overload კონფლიქტის გადაჭრა

> ⚠️ **სავალდებულო თანმიმდევრობა: INSPECT → SAVE DEFINITION → IDENTIFY → DROP → VERIFY**

**Step 1.3a — INSPECT: ნახე ყველა ვერსია:**

```sql
-- Step 1.3a: Inspect ALL overloads
SELECT
  p.oid,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS full_arg_signature
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  p.proname = 'process_order_transaction'
  AND  n.nspname = 'public'
ORDER BY p.oid;
```

**Gemini — ამ Query-ის შემდეგ:**
1. შედეგი **2 სტრიქონი** უნდა იყოს. თუ 1 — კონფლიქტი გადაჭრილია, 1.3b/c გამოტოვე, 1.3d-ით გადაამოწმე. თუ 0 — STOP.
2. იდენტიფიცირე სტრიქონი, რომლის `full_arg_signature` **არ შეიცავს** `p_inventory_transactions` — ეს **წასაშლელი ვერსიაა**. მის `oid` გადაწერე.
3. გადაწერე ასევე **წასაშლელი ვერსიის** `full_arg_signature` — 1.3c-ში გამოიყენება.

**Step 1.3b — SAVE: წაშლამდე ფუნქციის definition შეინახე:**

> **⚠️ ეს ნაბიჯი v3.0-ში სრულად გამოტოვებული იყო — Rollback შეუძლებელი ხდებოდა.**

```sql
-- Step 1.3b: Save definition of the function to be dropped (for rollback if needed)
-- შეცვალე [WRONG_OID] Step 1.3a-ში მიღებული წასაშლელი ვერსიის oid-ით:
SELECT pg_get_functiondef([WRONG_OID_FROM_1.3a]);
```

> **Gemini:** ამ query-ის შედეგი (function definition) — **სრულად გადაწერე და მომხმარებელს გაუგზავნე** Rollback-ისთვის. მომხმარებლის დასტური მიიღე და შემდეგ გააგრძელე 1.3c-ზე.

**Step 1.3c — DROP: წაშალე მხოლოდ არასწორი ვერსია:**

> **⚠️ v3.0-ში ეს SQL კომენტარში იყო — Gemini-ი ვერ გაუშვებდა (F1 fix).**

```sql
-- Step 1.3c: DROP the wrong version.
-- Gemini: ქვემოთ [WRONG_ARG_SIGNATURE] ჩაანაცვლე Step 1.3a-ს შედეგით.
-- მაგალითი: DROP FUNCTION IF EXISTS public.process_order_transaction(uuid, text, numeric);
-- ⚠️ გამოიყენე ᲛᲮᲝᲚᲝᲓ ვერსიის args, რომელსაც p_inventory_transactions არ ჰქონდა.

DROP FUNCTION IF EXISTS public.process_order_transaction([WRONG_ARG_SIGNATURE_FROM_1.3a]);
```

**Step 1.3d — VERIFY: მხოლოდ 1 ვერსია უნდა დარჩეს:**

```sql
-- Step 1.3d: Confirm exactly ONE version remains
SELECT
  pg_get_function_identity_arguments(p.oid) AS remaining_signature
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  p.proname = 'process_order_transaction'
  AND  n.nspname = 'public';
```

**✅ მოსალოდნელი შედეგი:** **1 სტრიქონი**, signature-ში `p_inventory_transactions` სიტყვა.  
**❌ თუ 2** — DROP-ი ვერ შესრულდა. STOP.  
**❌ თუ 0** — ორივე წაიშალა. **ROLLBACK-1 (RPC section) დაუყოვნებლივ გაუშვი.**

---

### Step 1.4 — `inventory_transactions` Orphan Audit + Trigger

**Step 1.4a — AUDIT: orphan ჩანაწერების შემოწმება:**

```sql
-- Step 1.4a: Check for existing orphaned records
SELECT COUNT(*) AS orphaned_count
FROM   public.inventory_transactions it
WHERE  NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = it.product_id
);
```

```sql
-- Step 1.4a-detail: Show first 10 orphaned records (if any)
SELECT it.id, it.product_id, it.created_at
FROM   public.inventory_transactions it
WHERE  NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = it.product_id
)
LIMIT 10;
```

**Gemini — შედეგის მიხედვით:**
- **`orphaned_count = 0`** — კარგი. გააგრძელე 1.4b-ზე.
- **`orphaned_count > 0`** — **STOP.** მომხმარებელს გაუგზავნე: "X orphaned ჩანაწერი აღმოჩენილია inventory_transactions-ში. თქვენი გადაწყვეტილება სჭირდება: გასუფთავება თუ შენარჩუნება?" Phase 1-ის გაგრძელება — მომხმარებლის დასტურის შემდეგ.

> **შენიშვნა Gemini-სთვის:** FK constraint პირდაპირ ვერ დაემატება სანამ orphan ჩანაწერები არსებობს. გამოიყენება Trigger-Based Protection. Trigger მხოლოდ **ახალ** hard delete-ებს ბლოკავს — RLS bypass ან direct DB access-ზე trigger ვერ მუშაობს. ეს სისუსტე მომხმარებელმა უნდა იცოდეს.

**Step 1.4b — შექმენი Trigger ფუნქცია:**

```sql
-- Step 1.4b: Create trigger function
CREATE OR REPLACE FUNCTION public.prevent_product_hard_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.inventory_transactions
    WHERE product_id = OLD.id
  ) THEN
    RAISE EXCEPTION
      'Cannot delete product % — referenced in inventory_transactions. Use soft delete (is_deleted=true) instead.', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;
```

**Step 1.4c — Trigger-ი მიამაგრე:**

```sql
-- Step 1.4c: Attach trigger (idempotent — safe to re-run)
DROP TRIGGER IF EXISTS trg_prevent_product_hard_delete ON public.products;
CREATE TRIGGER trg_prevent_product_hard_delete
  BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.prevent_product_hard_delete();
```

```sql
-- ✅ VERIFY 1.4:
SELECT trigger_name, event_manipulation, action_timing
FROM   information_schema.triggers
WHERE  event_object_schema = 'public'     -- ← F4 fix: schema filter
  AND  event_object_table  = 'products'
  AND  trigger_name        = 'trg_prevent_product_hard_delete';
```

**✅ მოსალოდნელი შედეგი:** 1 სტრიქონი — DELETE, BEFORE.  
**❌ თუ 0 — STOP.**

---

## ✅ PHASE 1 CHECKPOINT

```
GEMINI — STOP HERE.

[ ] Step 1.1 VERIFY: 2 სტრიქონი (accounting_status NOT NULL, accounting_error NULL) ✅
[ ] Step 1.2 VERIFY: cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 ✅
[ ] Step 1.3b: Wrong RPC definition შენახულია და მომხმარებელს გაეგზავნა ✅
[ ] Step 1.3d VERIFY: 1 RPC ვერსია რჩება p_inventory_transactions-ით ✅
[ ] Step 1.4a AUDIT: orphaned_count = 0 (ან მომხმარებლის დასტური მიღებულია) ✅
[ ] Step 1.4 VERIFY: trigger exists, DELETE, BEFORE ✅

მომხმარებელს მოახსენე:
"PHASE 1 დასრულებულია. [✅/❌ სია]. Phase 2-ისთვის თქვენი დასტური სჭირდება."
```

---

# PHASE 2: Table Consolidation (`offcuts` → `material_offcuts`)

> **წინაპირობა:** Phase 0 და Phase 1 სრულად დასრულებული.

---

### Step 2.0 — DATA AUDIT: `offcuts` შემოწმება

**Step 2.0a — Row Count:**

```sql
-- Step 2.0a: offcuts row count
SELECT COUNT(*) AS offcuts_row_count FROM public.offcuts;
```

**Step 2.0b — Schema Comparison (v3.0-ში გამოტოვებული — F5 fix):**

```sql
-- Step 2.0b: Compare column structures of both tables
SELECT
  'offcuts'         AS source_table,
  column_name,
  data_type,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'offcuts'

UNION ALL

SELECT
  'material_offcuts',
  column_name,
  data_type,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'material_offcuts'

ORDER BY source_table, ordinal_position;
```

**Step 2.0c — Data Preview:**

```sql
-- Step 2.0c: Preview offcuts data (top 10 rows)
SELECT * FROM public.offcuts LIMIT 10;
```

**Gemini — შედეგის მიხედვით:**
- **`offcuts_row_count = 0`** — ცხრილი ცარიელია. Migration არ სჭირდება. Step 2.1-ზე გააგრძელე.
- **`offcuts_row_count > 0`** — **STOP.** მომხმარებელს გაუგზავნე column comparison (2.0b) და row count. **Data Migration სჭირდება — მომხმარებლის გადაწყვეტილება.** Phase 2 ნუ გააგრძელებ Migration-ის გადაწყვეტილების გარეშე.

---

### Step 2.1 — INSPECT: `manufacturing_orders` → `offcuts` FK

```sql
-- Step 2.1: Find ALL FKs from any table pointing to offcuts
SELECT
  tc.table_name            AS from_table,
  tc.constraint_name,
  kcu.column_name          AS fk_column,
  ccu.table_name           AS to_table,
  ccu.column_name          AS to_column
FROM   information_schema.table_constraints tc
JOIN   information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema   = tc.table_schema
JOIN   information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
WHERE  tc.constraint_type = 'FOREIGN KEY'
  AND  ccu.table_schema   = 'public'
  AND  ccu.table_name     = 'offcuts';
```

**Gemini:**
- შეინახე ყოველი სტრიქონის: `from_table`, `constraint_name`, `fk_column`.
- **თუ 0 სტრიქონი** — FK არ მოიძებნა. STOP. მომხმარებელს მოახსენე — DROP უსაფრთხო შეიძლება იყოს, მაგრამ backend კოდის შემოწმება სჭირდება. მომხმარებლის დასტური მიიღე.
- **თუ 1+ სტრიქონი** — ყოველი სტრიქონისთვის Step 2.2 გაიმეოარე.

---

### Step 2.2 — FK გადაიტანე `material_offcuts`-ზე

> **⚠️ v3.0-ში hardcoded `offcut_id` იყო — F1/B1 fix. Gemini-ი ᲛᲮᲝᲚᲝᲓ Step 2.1-ის შედეგს იყენებს.**

**Step 2.2a — DROP ძველი FK:**

```sql
-- Step 2.2a: Drop old FK.
-- ⚠️ GEMINI: [CONSTRAINT_NAME] → Step 2.1-ის constraint_name
-- [FROM_TABLE] → Step 2.1-ის from_table
-- მაგ: ALTER TABLE public.manufacturing_orders DROP CONSTRAINT IF EXISTS fk_mfg_offcuts;
ALTER TABLE public.[FROM_TABLE_FROM_2.1]
  DROP CONSTRAINT IF EXISTS [CONSTRAINT_NAME_FROM_2.1];
```

**Step 2.2b — ADD ახალი FK:**

```sql
-- Step 2.2b: Add new FK pointing to material_offcuts.
-- ⚠️ GEMINI: [FROM_TABLE] → Step 2.1 from_table | [FK_COLUMN] → Step 2.1 fk_column
-- მაგ: ALTER TABLE public.manufacturing_orders ADD CONSTRAINT ... FOREIGN KEY (offcut_id) ...
ALTER TABLE public.[FROM_TABLE_FROM_2.1]
  ADD CONSTRAINT fk_[FROM_TABLE_FROM_2.1]_material_offcuts
  FOREIGN KEY ([FK_COLUMN_FROM_2.1])
  REFERENCES public.material_offcuts(id)
  ON DELETE RESTRICT;
```

```sql
-- ✅ VERIFY 2.2:
SELECT constraint_name, column_name
FROM   information_schema.key_column_usage
WHERE  table_schema    = 'public'
  AND  table_name      = '[FROM_TABLE_FROM_2.1]'
  AND  constraint_name = 'fk_[FROM_TABLE_FROM_2.1]_material_offcuts';
```

**✅ მოსალოდნელი შედეგი:** 1 სტრიქონი — ახალი constraint.

**Step 2.2c — Backend Code Review:**

```
Gemini: server.ts-სა და სხვა backend ფაილებში მოძებნე 'offcuts' string-ები.
ყოველი reference-ი მომხმარებელს ანახე სანამ შეცვლი.
მხოლოდ მომხმარებლის დასტურის შემდეგ 'offcuts' → 'material_offcuts'.
```

---

### Step 2.3 — `offcuts` ცხრილის Data Backup + DROP

> **⚠️ v3.0-ში backup ნაბიჯი სრულად გამოტოვებული იყო — F6 fix.**

**Step 2.3a — Data Backup (DROP-ამდე სავალდებულო):**

```sql
-- Step 2.3a: Create backup table before DROP (not a substitute for pg_dump!)
CREATE TABLE IF NOT EXISTS public.offcuts_backup_18042026
AS SELECT * FROM public.offcuts;

-- Verify backup:
SELECT COUNT(*) AS backup_count FROM public.offcuts_backup_18042026;
```

> **Gemini:** backup_count = offcuts row count (Step 2.0a). თუ არ ემთხვევა — STOP. DROP ნუ შეასრულებ. მომხმარებელს მოახსენე.

**Step 2.3b — DROP:**

```sql
-- Step 2.3b: Drop redundant offcuts table (RESTRICT only — CASCADE FORBIDDEN)
DROP TABLE IF EXISTS public.offcuts RESTRICT;
```

```sql
-- ✅ VERIFY 2.3:
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name   = 'offcuts';
```

**✅ მოსალოდნელი შედეგი:** **0 სტრიქონი.**  
**❌ RESTRICT error** — FK ჯერ კიდევ მიდის. STOP. Step 2.1 სხვა ცხრილებზეც გაიმეოარე.

---

## ✅ PHASE 2 CHECKPOINT

```
GEMINI — STOP HERE.

[ ] Step 2.0: offcuts data audit ✅ (row count + schema comparison)
[ ] Step 2.1: ყველა FK constraint_name და fk_column შენახულია ✅
[ ] Step 2.2 VERIFY: ახალი FK material_offcuts-ზე ✅
[ ] Step 2.2c: Backend code reviewed (მომხმარებლის დასტური) ✅
[ ] Step 2.3a: offcuts_backup_18042026 შეიქმნა, row count ემთხვევა ✅
[ ] Step 2.3 VERIFY: offcuts table dropped ✅

მომხმარებელს მოახსენე:
"PHASE 2 დასრულებულია. [✅/❌ სია]. Phase 3-ისთვის თქვენი დასტური სჭირდება."
```

---

# PHASE 3: Backend Validation (`server.ts`)

> **წინაპირობა:** Phase 0, 1, 2 — სრულად დასრულებული.

---

### Step 3.1 — `processSuccessfulOrder` ვერიფიკაცია

**Step 3.1a — INSPECT ყველა RPC პარამეტრი:**

```sql
-- Step 3.1a: Get ALL parameters + body of remaining RPC
SELECT
  p.proname                                 AS function_name,
  pg_get_function_identity_arguments(p.oid) AS all_parameters,
  pg_get_functiondef(p.oid)                 AS function_body
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  p.proname = 'process_order_transaction'
  AND  n.nspname = 'public';
```

> **Gemini:** `all_parameters` — ყველა `p_*` პარამეტრი სიაში შეინახე. `function_body` — server.ts-ის RPC call-ს შეადარე. სინქრონი უნდა იყოს.

**Step 3.1b — server.ts-ში 3 წერტილის შემოწმება:**

```typescript
// ✅ CHECK 1: orders update (Phase 1.1-ში ველები დაემატა)
await supabase
  .from('orders')
  .update({
    accounting_status: 'processed',
    accounting_error: null
  })
  .eq('id', orderId);

// ✅ CHECK 2: products query (Phase 1.2-ში cost_price დაემატა)
await supabase
  .from('products')
  .select('id, cost_price, ...')
  .eq('id', productId);

// ✅ CHECK 3: RPC call — ყველა პარამეტრი Step 3.1a-დან
// Gemini: Step 3.1a-ს all_parameters სიის ყველა p_* პარამეტრი აქ უნდა იყოს
await supabase.rpc('process_order_transaction', {
  p_inventory_transactions: [...],
  // + ყველა სხვა პარამეტრი Step 3.1a-ს შედეგიდან
});
```

**❌ თუ CHECK 1, 2, ან 3 არასწორია — გაასწორე. STOP სანამ სამივე ✅ არ გახდება.**

---

### Step 3.2 — TypeScript კომპილაცია

```bash
# Project root-დან:
npx tsc --noEmit
```

**✅ empty output = 0 errors.**  
**❌ errors — ყოველი error გაასწორე. 0 errors სანამ არ გახდება — Phase 3 ვერ დაიხურება.**

---

### Step 3.3 — E2E Sanity Check

```sql
-- Step 3.3: Confirm baseline row counts unchanged (compare to Phase 0 baseline)
SELECT 'orders'                AS tbl, COUNT(*) AS rows FROM public.orders
UNION ALL
SELECT 'products',                      COUNT(*) FROM public.products
UNION ALL
SELECT 'inventory_transactions',        COUNT(*) FROM public.inventory_transactions
UNION ALL
SELECT 'material_offcuts',              COUNT(*) FROM public.material_offcuts
UNION ALL
SELECT 'manufacturing_orders',          COUNT(*) FROM public.manufacturing_orders;
```

**Gemini:** Phase 0-ის baseline-ს შეადარე. `offcuts` გაქრა (მოსალოდნელია). სხვა ცხრილების row count-ები მნიშვნელოვნად არ უნდა შეცვლილიყო.

**Development გარემოში test order:**

| შემოწმება | მოსალოდნელი შედეგი |
|-----------|--------------------|
| `orders.accounting_status` | `'processed'` |
| `orders.accounting_error` | `null` (success case) |
| `products.cost_price` | გამოყენებულია, NOT NULL |
| `inventory_transactions` | product_id სწორი, ჩანაწერი შეიქმნა |
| Hard delete trigger | Dev test product-ზე DELETE → exception message |
| RPC version count | 1 row |

> **Hard delete trigger test:** გამოიყენე **test product**, რომელიც **მხოლოდ test გარემოშია** და production მონაცემს არ წარმოადგენს. production-ის real product-ზე DELETE-ის გაშვება — FORBIDDEN.

---

## ✅ PHASE 3 CHECKPOINT — FINAL

```
GEMINI — FINAL STOP.

[ ] Step 3.1a: ყველა RPC პარამეტრი inspected ✅
[ ] Step 3.1b: CHECK 1 ✅ CHECK 2 ✅ CHECK 3 ✅
[ ] Step 3.2: npx tsc --noEmit = 0 errors ✅
[ ] Step 3.3: baseline row counts OK, E2E test passed ✅

მომხმარებელს მოახსენე:
"MASTER PLAN v4.0 — 100% შესრულებულია და ვერიფიცირებულია. ✅"
```

---

# 🔁 ROLLBACK PLANS

---

### ROLLBACK-1 (Phase 1 Undo)

```sql
-- R1-1: Remove added columns
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS accounting_status,
  DROP COLUMN IF EXISTS accounting_error;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS cost_price;

-- R1-2: Remove trigger
DROP TRIGGER IF EXISTS trg_prevent_product_hard_delete ON public.products;
DROP FUNCTION IF EXISTS public.prevent_product_hard_delete();

-- R1-3: RPC restore (if wrong version was dropped)
-- Step 1.3b-ში შენახული function definition-ი აქ გამოიყენე:
-- [PASTE_SAVED_FUNCTION_DEFINITION_FROM_1.3b]
```

### ROLLBACK-2 (Phase 2 Undo)

```sql
-- R2-1: Remove new FK
ALTER TABLE public.[FROM_TABLE]
  DROP CONSTRAINT IF EXISTS fk_[FROM_TABLE]_material_offcuts;

-- R2-2: Restore old FK (Step 2.1-ის მნიშვნელობებით)
ALTER TABLE public.[FROM_TABLE]
  ADD CONSTRAINT [OLD_CONSTRAINT_NAME]
  FOREIGN KEY ([FK_COLUMN]) REFERENCES public.offcuts(id);

-- R2-3: Restore offcuts table from backup
CREATE TABLE IF NOT EXISTS public.offcuts
AS SELECT * FROM public.offcuts_backup_18042026;
-- ⚠️ Constraints და Indexes ხელით სჭირდება pg_dump backup-დან
```

---

# ⛔ GEMINI — MANDATORY RULES (სრული სია v4.0)

1. **Phase 0 → 1 → 2 → 3 თანმიმდევრობა** — გამოტოვება FORBIDDEN
2. **Phase 1-ის დაწყება Phase 0 backup-ის გარეშე** — FORBIDDEN
3. **`offcuts` DROP Step 2.0 audit და Step 2.2 remapping-ამდე** — FORBIDDEN
4. **`offcuts` DROP Step 2.3a backup-ის გარეშე** — FORBIDDEN
5. **ახალი feature-ები ამ გეგმის 100%-ამდე** — FORBIDDEN
6. **ყოველი VERIFY query-ის გამოტოვება** — FORBIDDEN
7. **Phase Checkpoint-ის გამოტოვება** — FORBIDDEN
8. **RPC ორივე ვერსიის DROP** — FORBIDDEN. მხოლოდ p_inventory_transactions-ის გარეშე ვერსია
9. **`DROP TABLE CASCADE`** — FORBIDDEN. გამოიყენე RESTRICT
10. **Step 1.3b-ის definition შენახვის გარეშე DROP** — FORBIDDEN
11. **Step 2.2-ში Step 2.1-ის inspect-ის გარეშე SQL გაშვება** — FORBIDDEN
12. **Step 3.1a inspect-ის გარეშე RPC call** — FORBIDDEN
13. **`[BRACKET]` placeholder-ების literal-ად გაშვება** — FORBIDDEN
14. **Hard delete trigger test production product-ზე** — FORBIDDEN
15. **მომხმარებლისთვის Phase Report-ის არარეგზავნა** — FORBIDDEN

---

*გეგმა შემუშავებულია: Senior AI Developer & Architect | KALEGORUP | 18.04.2026*  
*v4.0 — Production-Safe, Self-Reviewed Edition (7 bug fixed over v3.0)*
