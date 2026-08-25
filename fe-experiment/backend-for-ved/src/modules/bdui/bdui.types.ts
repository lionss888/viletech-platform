import type { BduiVedRoleId } from './bdui.constants';

export type BduiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type BduiApiRef = {
  method: BduiHttpMethod;
  path: string;
};

export type BduiColumn = {
  key: string;
  label: string;
};

export type BduiFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'select'
  | 'file'
  | 'checkbox'
  | 'date'
  | 'organization_select';

export type BduiFieldOption = {
  value: string;
  label: string;
};

export type BduiField = {
  name: string;
  label: string;
  fieldType: BduiFieldType;
  required?: boolean;
  options?: BduiFieldOption[];
  /** Hint for file fields (e.g. application/pdf). */
  accept?: string;
  /** Default string value prefilled in the client. */
  defaultValue?: string;
};

/** Client uploads a PDF then puts file id into the action JSON body. */
export type BduiFileUploadSpec = {
  uploadPath: string;
  bodyField: string;
  /** When true, body value is `[fileId]` (e.g. addPayments / addClosing). */
  asArray?: boolean;
  accept?: string;
};

export type BduiAction = {
  id: string;
  label: string;
  method: BduiHttpMethod;
  path: string;
  bodyFrom?: 'form' | 'none' | 'multipart';
  navigateTo?: string;
  /** Prompt operator for rejectText before calling API. */
  requiresTextReason?: boolean;
  /** Before accept: approve embedded org via ICO organization API. */
  approveOrganizationFirst?: boolean;
  /** Fixed JSON body merged into the request (e.g. order/generate). */
  staticBody?: Record<string, unknown>;
  /** Prompt for provider Account._id → PATCH { provider }. */
  requiresProviderId?: boolean;
  /** Prefill for requiresProviderId (seed Provider account id). */
  defaultProviderId?: string;
  /** Inject signingOrderCreateDate (ISO) into body for stub order attach. */
  injectSigningOrderDate?: boolean;
  /** Prompt for crypto tx hash → PATCH { addTransactions: [{ hash, chain }] }. */
  requiresTxHash?: boolean;
  /** Upload PDF(s) and map file ids into request body (UI path; no seed stub ids). */
  requiresFileUpload?: BduiFileUploadSpec | BduiFileUploadSpec[];
  /** Prompt for contract number + date (mgr_contract_attach). */
  requiresContractMeta?: boolean;
};

export type BduiLoginFormWidget = {
  type: 'login_form';
  id: string;
  submitAction: string;
};

export type BduiDataTableWidget = {
  type: 'data_table';
  id: string;
  dataSource: BduiApiRef;
  columns: BduiColumn[];
  rowNavigateTo?: string;
  rowIdField?: string;
};

export type BduiFormWidget = {
  type: 'form';
  id: string;
  fields: BduiField[];
  submitAction: string;
};

export type BduiWizardStep = {
  id: string;
  title: string;
  description?: string;
  fields: BduiField[];
};

export type BduiWizardWidget = {
  type: 'wizard';
  id: string;
  steps: BduiWizardStep[];
  createAction: string;
  saveAction: string;
  uploadAction: string;
  invoiceAction: string;
  hsCodesAction: string;
  submitAction: string;
  organizationsDataSource: BduiApiRef;
};

export type BduiStatusBadgeWidget = {
  type: 'status_badge';
  id: string;
  field: string;
  dataSource: BduiApiRef;
};

export type BduiActionBarWidget = {
  type: 'action_bar';
  id: string;
  actions: string[];
};

export type BduiTextWidget = {
  type: 'text';
  id: string;
  content: string;
};

export type BduiDetailFieldsWidget = {
  type: 'detail_fields';
  id: string;
  dataSource: BduiApiRef;
  fields: BduiColumn[];
};

export type BduiWidget =
  | BduiLoginFormWidget
  | BduiDataTableWidget
  | BduiFormWidget
  | BduiWizardWidget
  | BduiStatusBadgeWidget
  | BduiActionBarWidget
  | BduiTextWidget
  | BduiDetailFieldsWidget;

export type BduiScreen = {
  id: string;
  role: BduiVedRoleId;
  page: string;
  title: string;
  version: number;
  widgets: BduiWidget[];
  actions: BduiAction[];
};

export type BduiUserPage = 'login' | 'forms.list' | 'forms.create' | 'forms.detail';

export type BduiCabinetPage = 'login' | 'forms.list' | 'forms.detail';
