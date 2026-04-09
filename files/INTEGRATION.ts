// ============================================================
// INTEGRATION GUIDE — RS.ge Phase 4
// Copy the relevant snippets into your existing files
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. server.ts — Add to processSuccessfulOrder()
//    After your existing journal_entries + stock sync block
// ─────────────────────────────────────────────────────────────
//
// import { autoCreateAndSendEInvoice } from './src/services/rsge/rsge.service';
//
// async function processSuccessfulOrder(orderId: string, paymentData: PaymentData) {
//   // ... your existing code: confirm order, generate invoice, COGS, double-entry, stock ...
//
//   // ── Phase 4: RS.ge Auto E-Invoice ──────────────────────
//   try {
//     const { data: invoice } = await supabase
//       .from('invoices')
//       .select('id')
//       .eq('order_id', orderId)
//       .single();
//
//     if (invoice?.id) {
//       const rsgeResult = await autoCreateAndSendEInvoice(orderId, invoice.id);
//       console.log('[RS.ge]', rsgeResult.success ? '✅' : '❌', rsgeResult.message);
//       // rsge_sync_log is written automatically inside the service
//     }
//   } catch (rsgeErr) {
//     // RS.ge failure MUST NOT block the order confirmation
//     console.error('[RS.ge] Non-blocking error:', rsgeErr);
//   }
//   // ────────────────────────────────────────────────────────
// }


// ─────────────────────────────────────────────────────────────
// 2. AdminDashboard.tsx (or wherever your tab routing lives)
//    Add the RSGeModule tab
// ─────────────────────────────────────────────────────────────
//
// import RSGeModule from './accounting/RSGeModule';
//
// // In your tab list:
// { id: 'rsge', label: 'RS.ge', icon: '🏛️' },
//
// // In your render switch:
// {activeTab === 'rsge' && <RSGeModule />}


// ─────────────────────────────────────────────────────────────
// 3. .env (local) — Add these variables
// ─────────────────────────────────────────────────────────────
//
// VITE_RSGE_USERNAME=        # RS.ge პორტალის მომხმარებელი
// VITE_RSGE_PASSWORD=        # RS.ge პორტალის პაროლი
// VITE_RSGE_TIN=             # ს/ნ (საიდენტიფიკაციო)
// VITE_RSGE_MOCK=true        # false — real API, true — mock


// ─────────────────────────────────────────────────────────────
// 4. Vercel — Environment Variables (production)
//    Settings → Environment Variables → Add:
//    VITE_RSGE_USERNAME, VITE_RSGE_PASSWORD, VITE_RSGE_TIN
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// 5. Supabase — Run migration SQL
//    Copy from RSGeModule.tsx Settings panel → "Supabase Migration"
//    Or run: supabase db push
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// 6. Go LIVE checklist (when you have real credentials)
// ─────────────────────────────────────────────────────────────
//
// [ ] Fill .env / Vercel vars with real credentials
// [ ] In rsge.soap.client.ts: set MOCK_MODE: false
// [ ] Uncomment LIVE sections (marked with // TODO: Uncomment)
// [ ] Install XML parser: npm i fast-xml-parser
// [ ] Implement parseXmlValue() helper for SOAP response parsing
// [ ] Test auth: rsgeAuthenticate() returns real token
// [ ] Test with 1 order end-to-end before full rollout
// [ ] Enable rsge_sync_log in Supabase dashboard for monitoring
//
// SOAP Response parsing helper (add to rsge.soap.client.ts):
//
// import { XMLParser } from 'fast-xml-parser';
// function parseXmlValue(xml: string, tagName: string): string | undefined {
//   const parser = new XMLParser({ ignoreAttributes: false });
//   const result = parser.parse(xml);
//   // Navigate result object to find tagName
//   // Structure varies per action — log rawXml in dev to inspect
//   return result?.['soapenv:Envelope']?.['soapenv:Body']?.[`rs:${tagName}Response`]?.[`rs:${tagName}`];
// }


// ─────────────────────────────────────────────────────────────
// File structure created:
//
// src/
// ├── types/
// │   └── rsge.types.ts              ← All TypeScript interfaces
// ├── services/
// │   └── rsge/
// │       ├── rsge.soap.client.ts    ← SOAP layer (mock + live stubs)
// │       └── rsge.service.ts        ← Business logic + Supabase sync
// └── components/
//     └── admin/
//         └── accounting/
//             └── RSGeModule.tsx     ← Full admin UI panel
// ─────────────────────────────────────────────────────────────
