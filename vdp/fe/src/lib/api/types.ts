import type { VedRole } from "@/lib/ved/types";

export type AuthSession = {
  token: string;
  refresh_token: string;
  account_id: string;
  role: VedRole;
  account?: Record<string, unknown>;
};

export type AccountProfile = {
  id: string;
  email: string;
  role: VedRole;
  full_name?: string;
  blocked?: boolean;
};

export type CoreForm = {
  id: string;
  account_id: string;
  organization_id?: string;
  provider_id?: string;
  manager_id?: string;
  counterparty_id?: string;
  status: string;
  direction: string;
  kind: string;
  channel?: string;
  invoice_amount?: string;
  currency?: string;
  contract_number?: string;
  contract_date?: string;
  invoice_json?: string;
  docs_json?: string;
  created_at: string;
  updated_at: string;
  allowed_actions?: string[];
  organization_name?: string;
  counterparty_name?: string;
  number?: string;
};

export type FormListItem = CoreForm;

export type FileUploadResponse = {
  id: string;
  storage_key?: string;
};
