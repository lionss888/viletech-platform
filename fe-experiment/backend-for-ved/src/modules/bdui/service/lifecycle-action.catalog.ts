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
  BDUI_ACTION_MGR_CANCEL,
  BDUI_ACTION_MGR_COMPLETED,
  BDUI_ACTION_MGR_ORDER_ACCEPT,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ACTION_MGR_ORDER_REJECT,
  BDUI_ACTION_MGR_ORDER_SIGNING,
  BDUI_ACTION_MGR_PAYMENT_RECEIVED,
  BDUI_ACTION_MGR_PAYMENT_START,
  BDUI_ACTION_MGR_REPORT_ACCEPT,
  BDUI_ACTION_MGR_REPORT_SIGNING,
  BDUI_ACTION_MGR_SHIPMENT_ACCEPT,
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
  [BDUI_ACTION_UPLOAD_ORDER]: action(
    BDUI_ACTION_UPLOAD_ORDER,
    'Загрузить поручение',
    'PUT',
    '/form-payment/{formId}/order',
  ),
  [BDUI_ACTION_UPLOAD_PAYMENTS]: action(
    BDUI_ACTION_UPLOAD_PAYMENTS,
    'Загрузить подтверждение оплаты',
    'PUT',
    '/form-payment/{formId}/payments',
  ),
  [BDUI_ACTION_UPLOAD_REPORT]: action(
    BDUI_ACTION_UPLOAD_REPORT,
    'Загрузить отчёт',
    'PUT',
    '/form-payment/{formId}/report',
  ),
  [BDUI_ACTION_UPLOAD_SHIPMENT]: action(
    BDUI_ACTION_UPLOAD_SHIPMENT,
    'Загрузить документы отгрузки',
    'PUT',
    '/form-payment/{formId}/shipment',
  ),
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
  [BDUI_ACTION_ECO_REJECT]: action(
    BDUI_ACTION_ECO_REJECT,
    'Вернуть на доработку',
    'PUT',
    '/admin/compliance-officer/form-payment/{formId}/form/reject',
  ),
  [BDUI_ACTION_ECO_CANCEL]: action(
    BDUI_ACTION_ECO_CANCEL,
    'Отклонить заявку',
    'PUT',
    '/admin/compliance-officer/form-payment/{formId}/cancel',
    'forms.list',
  ),
  [BDUI_ACTION_MGR_ORDER_GENERATE]: action(
    BDUI_ACTION_MGR_ORDER_GENERATE,
    'Сформировать поручение',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/generate',
  ),
  [BDUI_ACTION_MGR_ORDER_SIGNING]: action(
    BDUI_ACTION_MGR_ORDER_SIGNING,
    'Отправить поручение на подпись',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/signing',
  ),
  [BDUI_ACTION_MGR_ORDER_ACCEPT]: action(
    BDUI_ACTION_MGR_ORDER_ACCEPT,
    'Подтвердить поручение',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/accept',
  ),
  [BDUI_ACTION_MGR_ORDER_REJECT]: action(
    BDUI_ACTION_MGR_ORDER_REJECT,
    'Вернуть поручение',
    'PUT',
    '/admin/manager/form-payment/{formId}/order/reject',
  ),
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
  [BDUI_ACTION_MGR_REPORT_ACCEPT]: action(
    BDUI_ACTION_MGR_REPORT_ACCEPT,
    'Подтвердить отчёт',
    'PUT',
    '/admin/manager/form-payment/{formId}/report/accept',
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
  [BDUI_ACTION_MGR_CANCEL]: action(
    BDUI_ACTION_MGR_CANCEL,
    'Отменить заявку',
    'PUT',
    '/admin/manager/form-payment/{formId}/cancel',
    'forms.list',
  ),
  [BDUI_ACTION_PROV_PAYMENT_START]: action(
    BDUI_ACTION_PROV_PAYMENT_START,
    'Начать исполнение',
    'PUT',
    '/admin/provider/form-payment/{formId}/payment/start',
  ),
  [BDUI_ACTION_PROV_PAYMENT_RETURN]: action(
    BDUI_ACTION_PROV_PAYMENT_RETURN,
    'Вернуть менеджеру',
    'PUT',
    '/admin/provider/form-payment/{formId}/form/manager',
  ),
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
