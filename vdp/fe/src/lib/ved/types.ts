/** UI-модель VDP: проекция для экранов app и demo (не контракт API core). */

export type VedRole =
  | "user"
  | "internal_compliance_officer"
  | "compliance_officer"
  | "manager"
  | "provider"
  | "root";

export type FormDirection = "import" | "export";
export type FormKind = "good" | "service";
export type FormCondition = "advance" | "postPayment";

export type StatusTone = "wait" | "work" | "return" | "done" | "neutral";

export type StageId =
  | "new"
  | "organization_verification"
  | "form_verification"
  | "agency_contract"
  | "signing_order"
  | "payment"
  | "agent_report"
  | "shipment"
  | "completed";

export type FormStatus = string;

export type AttachedDocument = {
  id: string;
  title: string;
  ext: "PDF" | "JPG" | "XLSX" | "DOCX";
  size: string;
  uploadedAt: string;
  kind: "invoice" | "contract" | "order" | "payment" | "report" | "shipment" | "other";
};

export type TimelineEntry = {
  id: string;
  title: string;
  at: string;
  actorRole: VedRole;
  done: boolean;
};

export type Organization = {
  id: string;
  name: string;
  inn: string;
  legalAddress: string;
  status: "approved" | "not_approved" | "waiting_verification" | "blocked";
  clientType?: "ui" | "bank";
  bankFixedCommissionPercent?: string;
  applyPlatformMarkup?: boolean;
  defaultAgentId?: string;
  bankWebhookUrl?: string;
  createdAt: string;
};

export type Counterparty = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  bank: string;
  swift: string;
  scope: "foreign" | "russian";
  status: "approved" | "not_approved";
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: VedRole;
  organization?: string | undefined;
  blocked: boolean;
  createdAt: string;
};

export type PaymentForm = {
  id: string;
  number: string;
  status: FormStatus;
  direction: FormDirection;
  kind: FormKind;
  condition: FormCondition;
  amountMinor: number;
  currency: string;
  organizationId: string;
  counterpartyId: string;
  hsCode: string;
  invoiceNumber: string;
  ownerName: string;
  managerName?: string | undefined;
  providerId?: string | undefined;
  providerName?: string | undefined;
  channel?: "ui" | "bank" | undefined;
  correlationId?: string | undefined;
  agentId?: string | undefined;
  contractId?: string | undefined;
  clientCurrency?: string | undefined;
  counterpartyCurrency?: string | undefined;
  shipmentDate?: string | undefined;
  noDocuments?: boolean | undefined;
  rejectText?: string | undefined;
  /** Код отметки комплаенс при возврате на доработку. */
  rejectMark?: string | undefined;
  createdAt: string;
  updatedAt: string;
  documents: AttachedDocument[];
  timeline: TimelineEntry[];
};

export type ActionTone = "primary" | "accent" | "quiet" | "danger";

export type FormAction = {
  id: string;
  label: string;
  tone: ActionTone;
  /** Требуется текст причины возврата/отклонения. */
  requiresReason?: boolean | undefined;
  /** Требуется отметка из справочника «Инструменты комплаенс». */
  requiresMark?: boolean | undefined;
  /** Требуется загрузка документа. */
  requiresFile?: boolean | undefined;
  /** Статус, в который переходит заявка. */
  nextStatus: FormStatus;
  confirm?: string | undefined;
};
