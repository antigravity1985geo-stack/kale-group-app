// ============================================================
// RS.GE SOAP Integration — TypeScript Types & Interfaces
// Phase 4: RS.ge SOAP Integration — ელ-ინვოისი, ზედნადები, VAT
// ============================================================
// TODO: Fill real credentials in src/config/rsge.config.ts
// ============================================================

export interface RSGeCredentials {
  username: string;       // RS.ge პორტალის მომხმარებელი
  password: string;       // RS.ge პორტალის პაროლი
  tin: string;            // საიდენტიფიკაციო ნომერი (ს/ნ)
  certificatePath?: string; // სერტიფიკატი (საჭიროებისამებრ)
}

// ─── SOAP Envelope Base ────────────────────────────────────
export interface SOAPRequest {
  action: string;
  body: Record<string, unknown>;
}

export interface SOAPResponse<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  rawXml?: string;
}

// ─── E-Invoice (ელ-ინვოისი) ───────────────────────────────

export type EInvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export type EInvoiceType =
  | 'STANDARD'        // ჩვეულებრივი
  | 'CREDIT_NOTE'     // კრედიტ ნოტა
  | 'DEBIT_NOTE'      // დებეტ ნოტა
  | 'PROFORMA';       // პროფორმა

export interface EInvoiceParty {
  tin: string;              // ს/ნ
  name: string;             // სახელი/დასახელება
  address?: string;         // მისამართი
  vatPayerStatus?: boolean; // დღგ-ის გადამხდელი
}

export interface EInvoiceItem {
  lineNumber: number;
  productCode?: string;     // პროდუქტის კოდი
  description: string;      // დასახელება
  unit: string;             // ზომის ერთეული (ც, კგ, მ²...)
  quantity: number;         // რაოდენობა
  unitPrice: number;        // ერთეულის ფასი (დღგ-ს გარეშე)
  discountPercent?: number; // ფასდაკლება %
  vatRate: 0 | 18;          // დღგ-ის განაკვეთი
  vatAmount: number;        // დღგ-ის თანხა
  totalWithVat: number;     // სულ დღგ-ს ჩათვლით
}

export interface EInvoiceCreatePayload {
  invoiceType: EInvoiceType;
  issueDate: string;        // ISO date: "2025-01-15"
  dueDate?: string;         // გადახდის ვადა
  currency: 'GEL' | 'USD' | 'EUR';
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  items: EInvoiceItem[];
  comment?: string;
  // Linked to internal DB
  internalOrderId?: string;
  internalInvoiceId?: string;
}

export interface EInvoiceRecord {
  rsgeId: string;           // RS.ge-ს მიერ მინიჭებული ID
  internalId: string;       // შიდა invoice ID
  status: EInvoiceStatus;
  invoiceNumber: string;    // ინვოისის ნომერი
  issueDate: string;
  dueDate?: string;
  sellerTin: string;
  buyerTin: string;
  buyerName: string;
  totalAmount: number;
  vatAmount: number;
  currency: string;
  createdAt: string;
  sentAt?: string;
  confirmedAt?: string;
}

export interface EInvoiceStatusResponse {
  rsgeId: string;
  status: EInvoiceStatus;
  statusMessage?: string;
  confirmedAt?: string;
  rejectionReason?: string;
}

// ─── Waybill / TTN (ზედნადები) ────────────────────────────

export type WaybillStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'CLOSED'
  | 'DELETED'
  | 'CANCELLED';

export type WaybillType =
  | 'STANDARD'          // საქონლის გადაზიდვა
  | 'RETURN'            // დაბრუნება
  | 'INTERNAL'          // შიდა გადაადგილება
  | 'EXPORT'            // ექსპორტი
  | 'IMPORT';           // იმპორტი

export interface WaybillTransportInfo {
  transportType?: string;   // სატრანსპორტო საშუალების ტიპი
  transportNumber?: string; // (Legacy) 
  carNumber?: string;       // სატრანსპორტო საშუალების ნომერი
  driverName?: string;      // მძღოლის სახელი
  driverIdNumber?: string;  // (Legacy)
  driverTin?: string;       // მძღოლის პ/ნ
}

export interface WaybillItem {
  lineNumber: number;
  productCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: 0 | 18;
  vatAmount: number;
}

export interface WaybillCreatePayload {
  waybillType: WaybillType;
  activationDate: string;   // გააქტიურების თარიღი
  sender: EInvoiceParty;
  receiver: EInvoiceParty;
  startAddress: string;     // გამგზავნი მისამართი
  endAddress: string;       // მიმღები მისამართი
  transport?: WaybillTransportInfo;
  items: WaybillItem[];
  comment?: string;
  linkedEInvoiceId?: string;  // დაკავშირებული ელ-ინვოისი
  internalOrderId?: string;
}

export interface WaybillRecord {
  rsgeId: string;
  internalOrderId?: string;
  status: WaybillStatus;
  waybillNumber: string;
  waybillType: WaybillType;
  activationDate: string;
  senderTin: string;
  receiverTin: string;
  receiverName: string;
  totalAmount: number;
  createdAt: string;
  activatedAt?: string;
  closedAt?: string;
}

// ─── VAT Return (დღგ-ის დეკლარაცია) ──────────────────────

export type VATReturnStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AMENDED';

export interface VATReturnPeriod {
  year: number;
  month: number; // 1–12
}

export interface VATTransaction {
  transactionType: 'SALE' | 'PURCHASE';
  documentNumber: string;
  documentDate: string;
  counterpartyTin: string;
  counterpartyName: string;
  taxableAmount: number;
  vatAmount: number;
  vatRate: 0 | 18;
}

export interface VATReturnPayload {
  period: VATReturnPeriod;
  tin: string;
  outputVAT: number;        // გამოსასვლელი დღგ (გაყიდვები)
  inputVAT: number;         // შესასვლელი დღგ (შესყიდვები)
  netVAT: number;           // გადასახდელი = output - input
  transactions: VATTransaction[];
}

export interface VATReturnRecord {
  rsgeId?: string;
  period: VATReturnPeriod;
  status: VATReturnStatus;
  outputVAT: number;
  inputVAT: number;
  netVAT: number;
  submittedAt?: string;
  acceptedAt?: string;
  rejectionReason?: string;
}

// ─── UI State Types ────────────────────────────────────────

export type RSGeTab = 'dashboard' | 'einvoice' | 'waybill' | 'vat' | 'settings';

export interface RSGeModuleState {
  activeTab: RSGeTab;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RSGeSyncResult {
  type: 'einvoice' | 'waybill' | 'vat';
  action: string;
  success: boolean;
  rsgeId?: string;
  message: string;
  timestamp: string;
}
