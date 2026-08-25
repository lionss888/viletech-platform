export const BDUI_SCHEMA_VERSION = 1;

export const BDUI_VED_ROLES = [
  'user',
  'internal_compliance_officer',
  'compliance_officer',
  'manager',
  'provider',
] as const;

export type BduiVedRoleId = (typeof BDUI_VED_ROLES)[number];

export const BDUI_ROLE_USER = 'user' as const;
export const BDUI_ROLE_INTERNAL_CO = 'internal_compliance_officer' as const;
export const BDUI_ROLE_EXTERNAL_CO = 'compliance_officer' as const;
export const BDUI_ROLE_MANAGER = 'manager' as const;
export const BDUI_ROLE_PROVIDER = 'provider' as const;

/** Shared */
export const BDUI_ACTION_LOGIN = 'login';
export const BDUI_ACTION_GO_CREATE = 'go_create';

/** User */
export const BDUI_ACTION_CREATE_FORM = 'create_form';
export const BDUI_ACTION_SAVE_FORM = 'save_form';
export const BDUI_ACTION_ADD_INVOICE = 'add_invoice';
export const BDUI_ACTION_SET_HS_CODES = 'set_hs_codes';
export const BDUI_ACTION_UPLOAD_FILE = 'upload_file';
export const BDUI_ACTION_ACCEPT_FORM = 'accept_form';
export const BDUI_ACTION_ACCEPT_CORRECTIONS = 'accept_corrections';
export const BDUI_ACTION_CANCEL_FORM = 'cancel_form';
export const BDUI_ACTION_UPLOAD_CONTRACT = 'upload_contract';
export const BDUI_ACTION_UPLOAD_ORDER = 'upload_order';
export const BDUI_ACTION_UPLOAD_PAYMENTS = 'upload_payments';
export const BDUI_ACTION_UPLOAD_REPORT = 'upload_report';
export const BDUI_ACTION_UPLOAD_SHIPMENT = 'upload_shipment';
export const BDUI_ACTION_LIST_ORGANIZATIONS = 'list_organizations';

/** Internal CO */
export const BDUI_ACTION_ICO_START = 'ico_form_start';
export const BDUI_ACTION_ICO_STOP = 'ico_form_stop';
export const BDUI_ACTION_ICO_ACCEPT = 'ico_form_accept';
export const BDUI_ACTION_ICO_REJECT = 'ico_form_reject';
export const BDUI_ACTION_ICO_CANCEL = 'ico_cancel';

/** External CO */
export const BDUI_ACTION_ECO_START = 'eco_form_start';
export const BDUI_ACTION_ECO_STOP = 'eco_form_stop';
export const BDUI_ACTION_ECO_ACCEPT = 'eco_form_accept';
export const BDUI_ACTION_ECO_REJECT = 'eco_form_reject';
export const BDUI_ACTION_ECO_CANCEL = 'eco_cancel';

/** Manager */
export const BDUI_ACTION_MGR_ORDER_GENERATE = 'mgr_order_generate';
export const BDUI_ACTION_MGR_ORDER_ATTACH = 'mgr_order_attach';
export const BDUI_ACTION_MGR_ORDER_SIGNING = 'mgr_order_signing';
export const BDUI_ACTION_MGR_ORDER_START = 'mgr_order_start';
export const BDUI_ACTION_MGR_ORDER_STOP = 'mgr_order_stop';
export const BDUI_ACTION_MGR_ORDER_ACCEPT = 'mgr_order_accept';
export const BDUI_ACTION_MGR_ORDER_REJECT = 'mgr_order_reject';
export const BDUI_ACTION_MGR_ASSIGN_PROVIDER = 'mgr_assign_provider';
export const BDUI_ACTION_MGR_PAYMENT_RECEIVED = 'mgr_payment_received';
export const BDUI_ACTION_MGR_PAYMENT_START = 'mgr_payment_start';
  export const BDUI_ACTION_MGR_REPORT_SIGNING = 'mgr_report_signing';
  export const BDUI_ACTION_MGR_REPORT_START = 'mgr_report_start';
  export const BDUI_ACTION_MGR_REPORT_STOP = 'mgr_report_stop';
  export const BDUI_ACTION_MGR_REPORT_ACCEPT = 'mgr_report_accept';
  export const BDUI_ACTION_MGR_SHIPMENT_START = 'mgr_shipment_start';
  export const BDUI_ACTION_MGR_SHIPMENT_STOP = 'mgr_shipment_stop';
  export const BDUI_ACTION_MGR_SHIPMENT_ACCEPT = 'mgr_shipment_accept';
  export const BDUI_ACTION_MGR_COMPLETED = 'mgr_completed';
  export const BDUI_ACTION_MGR_CANCEL = 'mgr_cancel';

/** Fixed ids from scripts/seed-bdui-lifecycle.js (agent/contract/stub file). */
export const BDUI_SEED_STUB_FILE_ID = '6a8dbd010000000000000001';
export const BDUI_SEED_AGENT_ID = '6a8dbd020000000000000001';

/** Provider */
export const BDUI_ACTION_PROV_PAYMENT_START = 'prov_payment_start';
export const BDUI_ACTION_PROV_PAYMENT_RETURN = 'prov_payment_return';
export const BDUI_ACTION_PROV_ATTACH_PROOF = 'prov_attach_proof';
export const BDUI_ACTION_PROV_ATTACH_HASH = 'prov_attach_hash';
export const BDUI_ACTION_PROV_PAYMENT_SENT = 'prov_payment_sent';
