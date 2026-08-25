import { Injectable } from '@nestjs/common';
import { AllCurrencies } from 'lib/enums/common.enums';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentKind,
  FormPaymentPaymentMethod,
  FormPaymentStatus,
} from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_ADD_INVOICE,
  BDUI_ACTION_CREATE_FORM,
  BDUI_ACTION_GO_CREATE,
  BDUI_ACTION_LIST_ORGANIZATIONS,
  BDUI_ACTION_LOGIN,
  BDUI_ACTION_SAVE_FORM,
  BDUI_ACTION_SET_HS_CODES,
  BDUI_ACTION_UPLOAD_FILE,
  BDUI_ROLE_USER,
  BDUI_SCHEMA_VERSION,
} from '../bdui.constants';
import { BduiScreen } from '../bdui.types';
import { BduiUserActionResolver } from './bdui-user-action.resolver';
import { getCatalogActions } from './lifecycle-action.catalog';

/**
 * Builds BDUI screen schemas for the User role experiment pages.
 */
@Injectable()
export class UserScreenBuilders {
  constructor(private readonly actionResolver: BduiUserActionResolver) {}

  buildLoginScreen(): BduiScreen {
    return {
      id: 'user.login',
      role: BDUI_ROLE_USER,
      page: 'login',
      title: 'Вход',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        { type: 'text', id: 'login_intro', content: 'BDUI experiment — кабинет клиента' },
        { type: 'login_form', id: 'login_form', submitAction: BDUI_ACTION_LOGIN },
      ],
      actions: [
        {
          id: BDUI_ACTION_LOGIN,
          label: 'Войти',
          method: 'POST',
          path: '/auth/login',
          bodyFrom: 'form',
          navigateTo: 'forms.list',
        },
      ],
    };
  }

  buildFormsListScreen(): BduiScreen {
    return {
      id: 'user.forms.list',
      role: BDUI_ROLE_USER,
      page: 'forms.list',
      title: 'Мои заявки',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        { type: 'text', id: 'list_intro', content: 'Список ваших заявок на платёж' },
        {
          type: 'data_table',
          id: 'forms_table',
          dataSource: { method: 'GET', path: '/form-payment' },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'amount', label: 'Сумма' },
            { key: 'createdAt', label: 'Создана' },
          ],
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_GO_CREATE,
          label: 'Новая заявка',
          method: 'GET',
          path: '/bdui/schema/user/forms.create',
          bodyFrom: 'none',
          navigateTo: 'forms.create',
        },
      ],
    };
  }

  buildFormsCreateScreen(): BduiScreen {
    return {
      id: 'user.forms.create',
      role: BDUI_ROLE_USER,
      page: 'forms.create',
      title: 'Новая заявка',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'create_intro',
          content: 'Wizard создания заявки: документы → условия сделки (import / аванс / товар) → организация → отправка',
        },
        {
          type: 'wizard',
          id: 'create_wizard',
          createAction: BDUI_ACTION_CREATE_FORM,
          saveAction: BDUI_ACTION_SAVE_FORM,
          uploadAction: BDUI_ACTION_UPLOAD_FILE,
          invoiceAction: BDUI_ACTION_ADD_INVOICE,
          hsCodesAction: BDUI_ACTION_SET_HS_CODES,
          submitAction: BDUI_ACTION_ACCEPT_FORM,
          organizationsDataSource: { method: 'GET', path: '/organization' },
          steps: [
            {
              id: 'documents',
              title: 'Документы',
              description: 'Загрузите инвойс и контракт (PDF) или отметьте «нет документов».',
              fields: [
                {
                  name: 'invoiceFile',
                  label: 'Инвойс (PDF)',
                  fieldType: 'file',
                  required: false,
                  accept: 'application/pdf,.pdf',
                },
                {
                  name: 'contractFile',
                  label: 'Контракт (PDF)',
                  fieldType: 'file',
                  required: false,
                  accept: 'application/pdf,.pdf',
                },
                {
                  name: 'noDocuments',
                  label: 'Нет документов',
                  fieldType: 'checkbox',
                  required: false,
                },
              ],
            },
            {
              id: 'deal',
              title: 'Условия сделки',
              description: 'Канонический happy-path: import + аванс + товар.',
              fields: [
                {
                  name: 'direction',
                  label: 'Направление',
                  fieldType: 'select',
                  required: true,
                  defaultValue: FormPaymentDirection.IMPORT,
                  options: [
                    { value: FormPaymentDirection.IMPORT, label: 'Импорт' },
                    { value: FormPaymentDirection.EXPORT, label: 'Экспорт' },
                  ],
                },
                {
                  name: 'paymentMethod',
                  label: 'Способ оплаты',
                  fieldType: 'select',
                  required: true,
                  defaultValue: FormPaymentPaymentMethod.PAY_IN_RUBLES,
                  options: [
                    { value: FormPaymentPaymentMethod.PAY_IN_RUBLES, label: 'В рублях' },
                    { value: FormPaymentPaymentMethod.PAY_FROM_EXPORT, label: 'Из экспорта' },
                  ],
                },
                {
                  name: 'platformPaymentCondition',
                  label: 'Условие оплаты с платформой',
                  fieldType: 'select',
                  required: true,
                  defaultValue: FormPaymentCondition.ADVANCE,
                  options: [
                    { value: FormPaymentCondition.ADVANCE, label: 'Аванс' },
                    { value: FormPaymentCondition.POST_PAYMENT, label: 'Постоплата' },
                  ],
                },
                {
                  name: 'currencyClient',
                  label: 'Валюта клиента',
                  fieldType: 'select',
                  required: true,
                  defaultValue: AllCurrencies.RUB,
                  options: [
                    { value: AllCurrencies.RUB, label: 'RUB' },
                    { value: AllCurrencies.USD, label: 'USD' },
                    { value: AllCurrencies.CNY, label: 'CNY' },
                    { value: AllCurrencies.USDT, label: 'USDT' },
                  ],
                },
                {
                  name: 'currencyCounterparty',
                  label: 'Валюта контрагента',
                  fieldType: 'select',
                  required: true,
                  defaultValue: AllCurrencies.USD,
                  options: [
                    { value: AllCurrencies.USD, label: 'USD' },
                    { value: AllCurrencies.CNY, label: 'CNY' },
                    { value: AllCurrencies.RUB, label: 'RUB' },
                    { value: AllCurrencies.USDT, label: 'USDT' },
                  ],
                },
                {
                  name: 'amount',
                  label: 'Сумма',
                  fieldType: 'number',
                  required: true,
                  defaultValue: '1000',
                },
                {
                  name: 'kind',
                  label: 'Тип (товар/услуга)',
                  fieldType: 'select',
                  required: true,
                  defaultValue: FormPaymentKind.GOOD,
                  options: [
                    { value: FormPaymentKind.GOOD, label: 'Товар' },
                    { value: FormPaymentKind.SERVICE, label: 'Услуга' },
                  ],
                },
                {
                  name: 'hsCode',
                  label: 'Код ТН ВЭД (HS)',
                  fieldType: 'text',
                  required: true,
                  defaultValue: '0101210000',
                },
                {
                  name: 'deadlineShipment',
                  label: 'Дата отгрузки',
                  fieldType: 'date',
                  required: true,
                },
              ],
            },
            {
              id: 'organization',
              title: 'Организация',
              description: 'Выберите организацию плательщика. Для seed: ООО BDUI Тест.',
              fields: [
                {
                  name: 'organization',
                  label: 'Организация',
                  fieldType: 'organization_select',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_CREATE_FORM,
          label: 'Создать черновик',
          method: 'POST',
          path: '/form-payment',
          bodyFrom: 'form',
          navigateTo: 'forms.detail',
        },
        {
          id: BDUI_ACTION_SAVE_FORM,
          label: 'Сохранить',
          method: 'PATCH',
          path: '/form-payment/{formId}/form',
          bodyFrom: 'form',
        },
        {
          id: BDUI_ACTION_UPLOAD_FILE,
          label: 'Загрузить файл',
          method: 'POST',
          path: '/file-store/upload/pdf',
          bodyFrom: 'multipart',
        },
        {
          id: BDUI_ACTION_ADD_INVOICE,
          label: 'Добавить инвойс',
          method: 'POST',
          path: '/form-payment/{formId}/invoices',
          bodyFrom: 'form',
        },
        {
          id: BDUI_ACTION_SET_HS_CODES,
          label: 'Указать ТН ВЭД',
          method: 'PATCH',
          path: '/form-payment/{formId}/invoice/{invoiceUuid}/hs-codes',
          bodyFrom: 'form',
        },
        {
          id: BDUI_ACTION_ACCEPT_FORM,
          label: 'Отправить на проверку',
          method: 'PUT',
          path: '/form-payment/{formId}/form/accept',
          bodyFrom: 'none',
          navigateTo: 'forms.detail',
        },
        {
          id: BDUI_ACTION_LIST_ORGANIZATIONS,
          label: 'Организации',
          method: 'GET',
          path: '/organization',
          bodyFrom: 'none',
        },
      ],
    };
  }

  buildFormsDetailScreen(status?: FormPaymentStatus | string): BduiScreen {
    const availableActionIds = this.actionResolver.resolveActionIds(status);
    const detailActions = getCatalogActions(availableActionIds);
    const isDraftLike =
      status === FormPaymentStatus.DRAFT ||
      status === FormPaymentStatus.CREATING ||
      status === undefined;
    const isOrgUnderReview =
      status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION ||
      status === FormPaymentStatus.ORGANIZATION_VERIFICATION;
    const isOrgLockedAfterDecision =
      status === FormPaymentStatus.FORM_WAITING_VERIFICATION ||
      status === FormPaymentStatus.FORM_VERIFICATION ||
      status === FormPaymentStatus.FORM_ACCEPTED ||
      status === FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER;
    const isCanceledByEco = status === FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER;
    const widgets: BduiScreen['widgets'] = [
      {
        type: 'status_badge',
        id: 'form_status',
        field: 'status',
        dataSource: { method: 'GET', path: '/form-payment/{formId}' },
      },
      {
        type: 'detail_fields',
        id: 'form_fields',
        dataSource: { method: 'GET', path: '/form-payment/{formId}' },
        fields: [
          { key: '_id', label: 'ID' },
          { key: 'status', label: 'Статус' },
          { key: 'direction', label: 'Направление' },
          { key: 'amount', label: 'Сумма' },
          { key: 'currencyClient', label: 'Валюта' },
          { key: 'platformPaymentCondition', label: 'Условие оплаты' },
          { key: 'organization.name', label: 'Организация' },
          { key: 'organization.status', label: 'Статус орг.' },
          { key: 'rejectText', label: 'Комментарий проверки' },
          { key: 'createdAt', label: 'Создана' },
        ],
      },
    ];
    if (isDraftLike) {
      widgets.push({
        type: 'text',
        id: 'draft_hint',
        content:
          'Черновик: проверьте поля и отправьте на проверку (Internal CO для первой орг / External CO иначе).',
      });
    }
    if (isOrgUnderReview) {
      widgets.push({
        type: 'text',
        id: 'org_lock_review',
        content:
          'Организация на проверке Internal CO: ключевые поля организации недоступны для редактирования.',
      });
    }
    if (isOrgLockedAfterDecision) {
      widgets.push({
        type: 'text',
        id: 'org_lock_decided',
        content:
          'После решения Internal CO (accept/block) клиент не редактирует ключевые поля организации.',
      });
    }
    if (status === FormPaymentStatus.FORM_WAITING_CORRECTIONS) {
      widgets.push({
        type: 'text',
        id: 'corrections_hint',
        content:
          'Заявка возвращена на уточнение. Исправьте данные и отправьте повторно (accept-corrections).',
      });
    }
    if (isCanceledByEco) {
      widgets.push({
        type: 'text',
        id: 'eco_canceled_hint',
        content:
          'Заявка отклонена External CO. Повторная отправка на проверку недоступна; создайте новую заявку при необходимости.',
      });
    }
    widgets.push({
      type: 'action_bar',
      id: 'form_actions',
      actions: availableActionIds,
    });
    return {
      id: 'user.forms.detail',
      role: BDUI_ROLE_USER,
      page: 'forms.detail',
      title: 'Заявка',
      version: BDUI_SCHEMA_VERSION,
      widgets,
      actions: detailActions,
    };
  }
}
