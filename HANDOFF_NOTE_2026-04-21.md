# KALE GROUP ERP — Session Handoff Note

> **Date:** 2026-04-21
> **Author:** Claude Opus 4.7 (1M context)
> **For:** Next AI session (any model — Opus / Sonnet / Gemini)
> **Status:** Paused mid-Phase 5 due to session usage limit (~90%)

---

## TL;DR — What's Done, What's Next

**Completed & pushed to `origin/main`:**
- ✅ Phase 1 — Critical Security (4 commits)
- ✅ Phase 2 — Architectural Hardening (14 commits)
- ✅ Phase 3 — Defense-in-Depth (5 commits)
- ✅ Phase 4 — Bundle Optimization (4 commits)
- ✅ Phase 5 — **3 of 4 steps done** (5.2, 5.3, 5.4)

**Remaining:**
- ⏳ **Step 5.1** — RS.ge honest UI (SIMULATED badge + feature-flag banner)
- ⏳ **Phase 6** — Final verification + v5.0 git tag

Last commit on origin/main: `7fefd8f` — `[OPUS][STEP-5.4] Add v5.0 changelog row to project_overview.md`

---

## Current Working Tree State

**Branch:** `main` (in sync with `origin/main`)

**WIP files in working tree (NOT committed — belong to user's parallel invoice-auto-gen feature):**
```
 M src/api/routes/orders.routes.ts         # admin order endpoints + invoice hook
 M src/api/routes/pos.routes.ts            # calls autoCreateInvoiceForOrder after RPC
 M src/components/admin-new/Orders.tsx     # invoice_number UI
 M src/services/rsge/rsge.service.ts       # minor logging tweaks
?? src/api/services/invoice.service.ts     # NEW: autoCreateInvoiceForOrder()
?? scratch_run_sql.js                      # one-off dev script
?? scratch_update_rpc.sql                  # one-off SQL
?? .claude/                                # Claude Code session dir (ignored)
```

**Rule for next AI:** Do NOT commit or revert these WIP files unless the user explicitly asks. They are an in-progress feature the user is developing alongside the v5.0 plan. If you need a clean tree to work, **stash** them (as we did in every Phase):

```bash
git stash push --include-untracked -m "[WIP-next] invoice auto-gen + rsge tweaks" -- \
  src/api/routes/orders.routes.ts \
  src/api/routes/pos.routes.ts \
  src/components/admin-new/Orders.tsx \
  src/services/rsge/rsge.service.ts \
  src/api/services/invoice.service.ts \
  scratch_run_sql.js scratch_update_rpc.sql
```

After your work: `git stash pop`.

**Stash state:** Empty (all previous stashes popped successfully).

**Backup branch:** `backup/pre-v5.0-20260420-223905` exists locally — keep as safety net.

---

## Step 5.1 — RS.ge Honest UI (TODO)

**Goal:** Make it visually clear in admin UI that RS.ge responses are **mocked** (rsge credentials are not configured yet). Prevents confusion for accountants who might think the waybill was really filed.

**Source of mock reality:**
- [src/api/routes/rsge.routes.ts:107](src/api/routes/rsge.routes.ts#L107) generates `mockRsId = 'WB-${Date.now()}-${random}'`
- [src/services/rsge/rsge.soap.client.ts](src/services/rsge/rsge.soap.client.ts) has `RSGE_CONFIG.MOCK_MODE: true` as a flag

**Tasks:**

### 5.1.a — Add `/api/rs-ge/status` feature-flag endpoint

File: [src/api/routes/rsge.routes.ts](src/api/routes/rsge.routes.ts) — add at top, before `/waybills`:

```typescript
// GET /api/rs-ge/status — feature flag for UI to know if RS.ge is in mock or live mode
router.get('/status', async (_req, res) => {
  const hasCredentials = !!(process.env.RS_USERNAME && process.env.RS_PASSWORD && process.env.RS_USER_ID && process.env.RS_COMPANY_ID);
  res.json({
    mock_mode: !hasCredentials,
    credentials_configured: hasCredentials,
    message: hasCredentials
      ? 'RS.ge ინტეგრაცია აქტიურია'
      : 'RS.ge credentials არ არის კონფიგურირებული — ზედნადებები იქმნება მხოლოდ ლოკალურად',
  });
});
```

This endpoint is public (no auth needed — just a flag), or gate with `requireAccountingRead` to keep consistent. Up to your judgment.

### 5.1.b — Show `SIMULATED` badge in Waybills list

File: [src/components/admin-new/accounting/Waybills.tsx](src/components/admin-new/accounting/Waybills.tsx)

Next to each waybill's `rs_waybill_id`, if it starts with `WB-` (matching the mock pattern) show a warning badge:

```tsx
{waybill.rs_waybill_id?.startsWith('WB-') && (
  <span
    title="RS.ge credentials არ არის კონფიგურირებული — ID სიმულირებულია"
    className="ml-2 inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-inset ring-amber-500/20"
  >
    SIMULATED
  </span>
)}
```

### 5.1.c — Banner at top of Waybills tab when mock mode

Fetch `/api/rs-ge/status` once on mount via useQuery (or simple useEffect + useState). When `mock_mode: true`, render an Alert at the top:

```tsx
{rsgeStatus?.mock_mode && (
  <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <h4 className="font-semibold text-amber-900 dark:text-amber-400">დემო რეჟიმი</h4>
        <p className="text-sm text-amber-800/90 dark:text-amber-300 mt-1">
          RS.ge-ს credentials არ არის კონფიგურირებული (.env → RS_USERNAME, RS_PASSWORD, RS_USER_ID, RS_COMPANY_ID).
          ზედნადებები იქმნება მხოლოდ ლოკალურ ბაზაში — **RS.ge-ზე ფაქტიურად არ იგზავნება.**
        </p>
      </div>
    </div>
  </div>
)}
```

### 5.1.d — Verify

```bash
npm run lint && npm run build
# Open /admin, go to accounting → Waybills
# Without .env RS_* vars: banner + SIMULATED badges visible
# Fill .env with fake values: banner disappears, badges still show (mock id pattern)
```

### 5.1.e — Commit

```bash
git add src/api/routes/rsge.routes.ts src/components/admin-new/accounting/Waybills.tsx
git commit -m "[AGENT][STEP-5.1] Honest RS.ge mock mode UI

- Add GET /api/rs-ge/status endpoint exposing credentials_configured flag
- Waybills.tsx: SIMULATED badge on mock-pattern rs_waybill_ids
- Alert banner when credentials are absent
- Prevents accountants mistaking mock receipts for real RS.ge submissions"
```

---

## Phase 6 — Final Verification (TODO)

Per [MASTER_PERFECTION_PLAN_v5.0.md](MASTER_PERFECTION_PLAN_v5.0.md) Phase 6.

### Step 6.1 — Automated Quality Gates

```bash
npm run lint                       # Expected: exit 0
npm run build                      # Expected: exit 0
# Optional if env set up:
# npx tsx tests/simulate_order.ts  # Expected: full order flow passes
```

### Step 6.2 — Security Spot-Checks

```bash
# No client-side mutations in admin UI
grep -rnE "supabase\.from\([^)]+\)\.(insert|update|delete|upsert)" src/components/
# Expected: 0

# No hardcoded secrets
grep -rnE "sk_|eyJhbGciOi|AIzaSy" src/ --exclude-dir=node_modules
# Expected: 0 (.env.example dummy values OK)

# .env never committed
git log --all --oneline -- .env
# Expected: empty

# All admin endpoints require auth
grep -rnE "router\.(post|put|patch|delete)" src/api/routes/ | grep -v requireAuth | grep -v requireAdmin | grep -v requireAccounting | grep -v limiter
# Expected: only /bog/callback, /tbc/callback, /credo/callback (webhooks — gated by IP/signature instead), /orders/create (gated by orderCreateLimiter)
```

### Step 6.3 — Supabase Advisor Rerun (manual)

In Supabase Dashboard → Advisors:
- Security advisor: should show 0 critical issues
- Performance advisor: should show 0 missing-FK-index warnings
- "Leaked Password Protection" skip note still present (Free plan limitation)

### Step 6.4 — Bundle Delta Report

Rough numbers from Phase 4 work (document these in final report):

| Chunk | Before v5.0 | After v5.0 | Delta |
|-------|------------:|-----------:|------:|
| Main `index.js` | 1,645 kB | 538 kB | **-67%** |
| `Accounting` | 810 kB | 118 kB | **-85%** |
| `PaymentSuccessPage` | 406 kB | 16 kB | **-96%** |

New lazy chunks: 8 accounting sub-tabs, 5 public routes, xlsx (cold), jspdf (cold), 7 vendor chunks.

### Step 6.5 — v5.0 Git Tag

**Only after all Phase 5 and 6 work is committed:**

```bash
git tag -a v5.0 -m "Master Perfection Plan executed — 31 commits across Phases 1-6

Summary:
- Security: webhook IP allowlist, CSP hardened, multilingual prompt-injection guard
- Architecture: 59 admin mutations → 16 API endpoints, 2 atomic RPCs, schema aligned
- Defense: ProtectedRoute, ErrorBoundary, AuthContext retry, console gate
- Bundle: main -67%, Accounting -85%, PaymentSuccess -96%
- Cleanup: dead code removed, docs archived"

# DO NOT push tag without user's explicit approval:
# git push origin v5.0
```

### Step 6.6 — Phase 6 Commit + Push

```bash
git add project_overview.md  # if any updates
git commit -m "[AGENT][STEP-6] v5.0 final verification report"
git push origin main
# Then ask user: "Push v5.0 tag?"
```

---

## Context the Next AI Needs

### User preferences learned this session

- Speaks Georgian; code comments/commit messages in English; user-facing strings in Georgian.
- Prefers sequential phase execution with a commit per sub-step (atomic, reviewable).
- Wants verification (`npm run lint` + `npm run build`) after each meaningful change.
- Confirms before destructive git operations (push was explicitly requested each time).
- Uses the `/model` slash command to switch between Opus and Sonnet — honor model assignments in the plan, but Opus can do any phase.

### Hard constraints — **DO NOT attempt these**

1. **TBC/Credo HMAC signature verification** — API keys not yet received by the business. Current defense is IP allowlist via `TBC_ALLOWED_IPS` / `CREDO_ALLOWED_IPS` env vars.
2. **RS.ge real SOAP integration** — credentials not configured. See Step 5.1 above for the honest-UI approach.
3. **Supabase Leaked Password Protection** — requires Pro plan; user is on Free.
4. **Force push to main** — never. Backup branch exists for rollback.
5. **Deleting the WIP files in the working tree** — user's parallel work.

### Key files & their purpose

| File | Purpose |
|------|---------|
| `MASTER_PERFECTION_PLAN_v5.0.md` | Full execution plan, source of truth |
| `project_overview.md` | Current project state; has v5.0 changelog row |
| `docs/archive/` | Superseded planning docs (REMEDIATION, implementation_plan v4) |
| `src/api/routes/*.routes.ts` | 16 server endpoints (Zod-validated, auth-gated) |
| `src/utils/safeFetch.ts` | Frontend wrapper — always use for admin mutations |
| `src/components/ProtectedRoute.tsx` | RBAC wrapper for admin tabs |
| `src/api/services/promptGuard.service.ts` | Multilingual AI injection filter |
| `migrations/20260420_*.sql` | Phase 2 SQL migrations (schema alignment + atomic RPCs) |

### Commit message convention

`[AGENT-NAME][STEP-X.Y] <short description>` where AGENT is OPUS / SONNET / GEMINI / AGENT (neutral). Keep the prefix format so commit history stays parseable.

---

## How to Resume

1. Read this file + `MASTER_PERFECTION_PLAN_v5.0.md` (Phase 5.1 and Phase 6 sections).
2. Verify state: `git status`, `git log origin/main..main` (should be empty — in sync), `git stash list` (should be empty).
3. If user says "continue" → stash WIP → execute Step 5.1 → restore WIP → push → execute Phase 6 → push.
4. If user asks something else → do that first, this handoff is just a pointer.

**Estimated remaining work:** ~45 min (5.1 = 25 min, Phase 6 = 20 min).

---

## Session Statistics

- **This session:** Phases 2.6 (partial continuation) → 5.2/5.3/5.4 (7 hours wall-clock across multiple pauses)
- **Commits added to origin/main this session:** 31 total across the 5 phases
- **Lint passes:** every step
- **Build passes:** every step
- **Bundle wins:** main `-67%`, Accounting `-85%`, PaymentSuccess `-96%`
- **Admin UI mutations migrated:** 59 → 0

**Good luck, next agent. Be kind to the user's limits — they're Pro tier, resetting weekly.**

— Opus 4.7
