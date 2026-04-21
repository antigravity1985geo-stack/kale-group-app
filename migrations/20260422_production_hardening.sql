-- ============================================================================
-- Production Hardening Migration
-- Created: 2026-04-22
-- Applied via: FINAL_EXECUTION_PLAN_v2.0.md Phase 1
-- ============================================================================

BEGIN;

-- FIX 1: Remove dangerous open INSERT on order_items
DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;

-- FIX 2: Restrict contact_messages SELECT to admin only
DROP POLICY IF EXISTS "Authenticated users can select contact messages" ON public.contact_messages;

CREATE POLICY "contact_messages_admin_select"
  ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

-- FIX 3: Journal idempotency unique index
-- NOTE: Columns are reference_type/reference_id (NOT source_type/source_id)
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_ref_uniq
  ON public.journal_entries (reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- FIX 4: Payments replay-protection unique index
-- NOTE: Column is external_id (NOT provider_payment_id)
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_tx_uniq
  ON public.payments (provider, external_id)
  WHERE external_id IS NOT NULL;

COMMIT;
