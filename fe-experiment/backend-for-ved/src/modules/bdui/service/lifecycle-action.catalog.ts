import { BduiAction, BduiHttpMethod } from '../bdui.types';
import {
  BDUI_ACTION_ACCEPT_CORRECTIONS,
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
  BDUI_ACTION_ECO_ACCEPT,
  BDUI_ACTION_ECO_CANCEL,
  BDUI_ACTION_ECO_REJECT,
  BDUI_ACTION_ECO_START,
  BDUI_ACTION_ECO_STOP,
  BDUI_ACTION_ICO_ACCEPT,
  BDUI_ACTION_ICO_CANCEL,
  BDUI_ACTION_ICO_REJECT,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_ICO_STOP,
  BDUI_ACTION_MGR_ASSIGN_PROVIDER,
  BDUI_ACTION_MGR_CANCEL,
  BDUI_ACTION_MGR_COMPLETED,
  BDUI_ACTION_MGR_ORDER_ACCEPT,
  BDUI_ACTION_MGR_ORDER_ATTACH,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ACTION_MGR_ORDER_REJECT,
  BDUI_ACTION_MGR_ORDER_SIGNING,
  BDUI_ACTION_MGR_ORDER_START,
  BDUI_ACTION_MGR_ORDER_STOP,
  BDUI_ACTION_MGR_PAYMENT_RECEIVED,
  BDUI_ACTION_MGR_PAYMENT_START,
  BDUI_ACTION_MGR_REPORT_ACCEPT,
  BDUI_ACTION_MGR_REPORT_SIGNING,
  BDUI_ACTION_MGR_REPORT_START,
  BDUI_ACTION_MGR_REPORT_STOP,
  BDUI_ACTION_MGR_SHIPMENT_ACCEPT,
  BDUI_ACTION_MGR_SHIPMENT_START,
  BDUI_ACTION_MGR_SHIPMENT_STOP,
  BDUI_SEED_STUB_FILE_ID,
  BDUI_ACTION_PROV_ATTACH_HASH,
  BDUI_ACTION_PROV_ATTACH_PROOF,
  BDUI_ACTION_PROV_PAYMENT_RETURN,
  BDUI_ACTION_PROV_PAYMENT_SENT,
  BDUI_ACTION_PROV_PAYMENT_START,
  BDUI_ACTION_UPLOAD_CONTRACT,
  BDUI_ACTION_UPLOAD_ORDER,
  BDUI_ACTION_UPLOAD_PAYMENTS,
  BDUI_ACTION_UPLOAD_REPORT,
  BDUI_ACTION_UPLOAD_SHIPMENT,
} from '../bdui.constants';

type CatalogEntry = Omit<BduiAction, 'id'> & { id: string };

function action(
  id: string,
  label: string,
  method: BduiHttpMethod,
  path: string,
  navigateTo = 'forms.detail',
): CatalogEntry {
  return { id, label, method, path, bodyFrom: 'none', navigateTo };
}

const CATALOG: Record<string, CatalogEntry> = {
  [BDUI_ACTION_ACCEPT_FORM]: action(
    BDUI_ACTION_ACCEPT_FORM,
    'Отправить на проверку',
    'PUT',
    '/form-payment/{formId}/form/accept',
  ),
  [BDUI_ACTION_ACCEPT_CORRECTIONS]: action(
    BDUI_ACTION_ACCEPT_CORRECTIONS,
    'Отправить исправления',
    'PUT',
    '/form-payment/{formId}/form/accept-corrections',
  ),
  [BDUI_ACTION_CANCEL_FORM]: action(
    BDUI_ACTION_CANCEL_FORM,
    'Отменить заявку',
    'PUT',
    '/form-payment/{formId}/cancel',
    'forms.list',
  ),
  [BDUI_ACTION_UPLOAD_CONTRACT]: action(
    BDUI_ACTION_UPLOAD_CONTRACT,
    'Загрузить договор',
    'PUT',
    '/form-payment/{formId}/form',
  ),
  [BDUI_ACTION_UPLOAD_ORDER]: {
    ...action(
      BDUI_ACTION_UPLOAD_ORDER,
      'Загрузить поручение',
      'PUT',
      '/form-payment/{formId}/order',
    ),
    staticBody: {
      paymentOrderSigned: BDUI_SEED_STUB_FILE_ID,
    },
  },
  [BDUI_ACTION_UPLOAD_PAYMENTS]: {
    ...action(
      BDUI_ACTION_UPLOAD_PAYMENTS,
      'Загрузить подтверждение оплаты',
      'PUT',
      '/form-payment/{formId}/payments',
    ),
    staticBody: {
      addPayments: [BDUI_SEED_STUB_FILE_ID],
    },
  },
  [BDUI_ACTION_UPLOAD_REPORT]: {
    ...action(
      BDUI_ACTION_UPLOAD_REPORT,
      'Загрузить отчёт',
      'PUT',
      '/form-payment/{formId}/report',
    ),
    staticBody: {
      reportSigned: BDUI_SEED_STUB_FILE_ID,
    },
  },
  [BDUI_ACTION_UPLOAD_SHIPMENT]: {
    ...action(
      BDUI_ACTION_UPLOAD_SHIPMENT,
      'Отправить документы отгрузки',
      'PUT',
      '/form-payment/{formId}/shipment/accept',
    ),
    staticBody: {
      addClosing: [BDUI_SEED_STUB_FILE_ID],
    },
  },
  [BDUI_ACTION_ICO_START]: action(
    BDUI_ACTION_ICO_START,
    'Начать проверку',
    'PUT',
    '/admin/internal-compliance-officer/form-payment/{formId}/form/start',
  ),
  [BDUI_ACTION_ICO_STOP]: action(
    BDUI_ACTION_ICO_STOP,
    'Остановить проверку',
    'PUT',
    '/admin/internal-compliance-officer/form-payment/{formId}/form/stop',
  ),
  [BDUI_ACTION_ICO_ACCEPT]: {
    ...action(
      BDUI_ACTION_ICO_ACCEPT,
      'Подтвердить организацию',
      'PUT',
      '/admin/internal-compliance-officer/form-payment/{formId}/form/accept',
    ),
    approveOrganizationFirst: true,
  },
  [BDUI_ACTION_ICO_REJECT]: {
    ...action(
      BDUI_ACTION_ICO_REJECT,
      'Вернуть на уточнение',
      'PUT',
      '/admin/internal-compliance-officer/form-payment/{formId}/form/reject',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_ICO_CANCEL]: {
    ...action(
      BDUI_ACTION_ICO_CANCEL,
      'Отменить заявку',
      'PUT',
      '/admin/internal-compliance-officer/form-payment/{formId}/cancel',
      'forms.list',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_ECO_START]: action(
    BDUI_ACTION_ECO_START,
    'Начать проверку',
    'PUT',
    '/admin/compliance-officer/form-payment/{formId}/form/start',
  ),
  [BDUI_ACTION_ECO_STOP]: action(
    BDUI_ACTION_ECO_STOP,
    'Остановить проверку',
    'PUT',
    '/admin/compliance-officer/form-payment/{formId}/form/stop',
  ),
  [BDUI_ACTION_ECO_ACCEPT]: action(
    BDUI_ACTION_ECO_ACCEPT,
    'Одобрить заявку',
    'PUT',
    '/admin/compliance-officer/form-payment/{formId}/form/accept',
  ),
  [BDUI_ACTION_ECO_REJECT]: {
    ...action(
      BDUI_ACTION_ECO_REJECT,
      'Вернуть на доработку',
      'PUT',
      '/admin/compliance-officer/form-payment/{formId}/form/reject',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_ECO_CANCEL]: {
    ...action(
      BDUI_ACTION_ECO_CANCEL,
      'Отклонить заявку',
      'PUT',
      '/admin/compliance-officer/form-payment/{formId}/cancel',
      'forms.list',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_MGR_ORDER_GENERATE]: {
    ...action(
      BDUI_ACTION_MGR_ORDER_GENERATE,
      'Сформировать поручение',
      'PUT',
      '/admin/manager/form-payment/{formId}/order/generate',
    ),
    staticBody: {
      clientOrganization: 'ООО BDUI Тест',
      organizationName: 'ООО BDUI Тест',
      signer: 'Иванов Иван Иванович',
      isAdvance: false,
    },
  },
  [BDUI_ACTION_MGR_ORDER_ATTACH]: {
    ...action(
      BDUI_ACTION_MGR_ORDER_ATTACH,
      'Прикрепить поручение (stub)',
      'PATCH',
      '/admin/manager/form-payment/{formId}',
    ),
    staticBody: {
      paymentOrder: BDUI_SEED_STUB_FILE_ID,
    },
    injectSigningOrderDate: true,
  },
  [BDUI_ACTION_MGR_ORDER_SIGNING]: action(
    BDUI_ACTION_MGR_ORDER_SIGNING,
    'Отправить поручение на подпись',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/signing',
  ),
  [BDUI_ACTION_MGR_ORDER_START]: action(
    BDUI_ACTION_MGR_ORDER_START,
    'Начать проверку поручения',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/start',
  ),
  [BDUI_ACTION_MGR_ORDER_STOP]: action(
    BDUI_ACTION_MGR_ORDER_STOP,
    'Остановить проверку поручения',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/stop',
  ),
  [BDUI_ACTION_MGR_ORDER_ACCEPT]: action(
    BDUI_ACTION_MGR_ORDER_ACCEPT,
    'Подтвердить поручение',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/accept',
  ),
  [BDUI_ACTION_MGR_ORDER_REJECT]: {
    ...action(
      BDUI_ACTION_MGR_ORDER_REJECT,
      'Вернуть поручение',
      'PUT',
      '/admin/manager/form-payment/{formId}/order/reject',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_MGR_ASSIGN_PROVIDER]: {
    ...action(
      BDUI_ACTION_MGR_ASSIGN_PROVIDER,
      'Назначить Provider',
      'PATCH',
      '/admin/manager/form-payment/{formId}',
    ),
    requiresProviderId: true,
  },
  [BDUI_ACTION_MGR_PAYMENT_RECEIVED]: action(
    BDUI_ACTION_MGR_PAYMENT_RECEIVED,
    'Подтвердить получение оплаты',
    'PUT',
    '/admin/manager/form-payment/{formId}/payment/received',
  ),
  [BDUI_ACTION_MGR_PAYMENT_START]: action(
    BDUI_ACTION_MGR_PAYMENT_START,
    'Передать на исполнение',
    'PUT',
    '/admin/manager/form-payment/{formId}/payment/start',
  ),
  [BDUI_ACTION_MGR_REPORT_SIGNING]: action(
    BDUI_ACTION_MGR_REPORT_SIGNING,
    'Отправить отчёт клиенту',
    'PUT',
    '/admin/manager/form-payment/{formId}/report/signing',
  ),
  [BDUI_ACTION_MGR_REPORT_START]: action(
    BDUI_ACTION_MGR_REPORT_START,
    'Начать проверку отчёта',
    'PUT',
    '/admin/manager/form-payment/{formId}/report/start',
  ),
  [BDUI_ACTION_MGR_REPORT_STOP]: action(
    BDUI_ACTION_MGR_REPORT_STOP,
    'Остановить проверку отчёта',
    'PUT',
    '/admin/manager/form-payment/{formId}/report/stop',
  ),
  [BDUI_ACTION_MGR_REPORT_ACCEPT]: action(
    BDUI_ACTION_MGR_REPORT_ACCEPT,
    'Подтвердить отчёт',
    'PUT',
    '/admin/manager/form-payment/{formId}/report/accept',
  ),
  [BDUI_ACTION_MGR_SHIPMENT_START]: action(
    BDUI_ACTION_MGR_SHIPMENT_START,
    'Начать проверку отгрузки',
    'PUT',
    '/admin/manager/form-payment/{formId}/shipment/start',
  ),
  [BDUI_ACTION_MGR_SHIPMENT_STOP]: action(
    BDUI_ACTION_MGR_SHIPMENT_STOP,
    'Остановить проверку отгрузки',
    'PUT',
    '/admin/manager/form-payment/{formId}/shipment/stop',
  ),
  [BDUI_ACTION_MGR_SHIPMENT_ACCEPT]: action(
    BDUI_ACTION_MGR_SHIPMENT_ACCEPT,
    'Подтвердить отгрузку',
    'PUT',
    '/admin/manager/form-payment/{formId}/shipment/accept',
  ),
  [BDUI_ACTION_MGR_COMPLETED]: action(
    BDUI_ACTION_MGR_COMPLETED,
    'Завершить заявку',
    'PUT',
    '/admin/manager/form-payment/{formId}/completed',
    'forms.list',
  ),
  [BDUI_ACTION_MGR_CANCEL]: {
    ...action(
      BDUI_ACTION_MGR_CANCEL,
      'Отменить заявку',
      'PUT',
      '/admin/manager/form-payment/{formId}/cancel',
      'forms.list',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_PROV_PAYMENT_START]: action(
    BDUI_ACTION_PROV_PAYMENT_START,
    'Начать исполнение',
    'PUT',
    '/admin/provider/form-payment/{formId}/payment/start',
  ),
  [BDUI_ACTION_PROV_ATTACH_PROOF]: {
    ...action(
      BDUI_ACTION_PROV_ATTACH_PROOF,
      'Прикрепить подтверждение (stub)',
      'PATCH',
      '/admin/provider/form-payment/{formId}',
    ),
    staticBody: {
      addPayments: [BDUI_SEED_STUB_FILE_ID],
    },
  },
  [BDUI_ACTION_PROV_ATTACH_HASH]: {
    ...action(
      BDUI_ACTION_PROV_ATTACH_HASH,
      'Добавить tx hash',
      'PATCH',
      '/admin/provider/form-payment/{formId}',
    ),
    requiresTxHash: true,
  },
  [BDUI_ACTION_PROV_PAYMENT_RETURN]: {
    ...action(
      BDUI_ACTION_PROV_PAYMENT_RETURN,
      'Вернуть менеджеру',
      'PUT',
      '/admin/provider/form-payment/{formId}/form/manager',
    ),
    bodyFrom: 'form',
    requiresTextReason: true,
  },
  [BDUI_ACTION_PROV_PAYMENT_SENT]: action(
    BDUI_ACTION_PROV_PAYMENT_SENT,
    'Исполнить платёж',
    'PUT',
    '/admin/provider/form-payment/{formId}/payment/sent',
  ),
};

/**
 * Resolves catalog actions for the given action ids (order preserved).
 */
export function getCatalogActions(actionIds: readonly string[]): BduiAction[] {
  return actionIds
    .map((id) => CATALOG[id])
    .filter((entry): entry is CatalogEntry => Boolean(entry));
}
