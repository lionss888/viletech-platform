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
  BDUI_ACTION_CREATE_COUNTERPARTY,
  BDUI_ACTION_CREATE_FORM,
  BDUI_ACTION_CREATE_ORGANIZATION,
  BDUI_ACTION_GO_CREATE,
  BDUI_ACTION_LIST_ORGANIZATIONS,
  BDUI_ACTION_LOGIN,
  BDUI_ACTION_SAVE_FORM,
  BDUI_ACTION_SET_HS_CODES,
  BDUI_ACTION_UPLOAD_FILE,
  BDUI_ROLE_USER,
  BDUI_SCHEMA_VERSION,
} from '../bdui.constants';
import { BduiDataTableWidget, BduiField, BduiScreen } from '../bdui.types';
import { enrichFormListTable } from './list-table.helpers';
import { OrganizationBusinessFormType } from 'lib/enums/models/organization.enums';
import { BduiUserActionResolver } from './bdui-user-action.resolver';
import { getCatalogActions } from './lifecycle-action.catalog';

function buildOrganizationInlineFields(): BduiField[] {
  return [
    { name: 'orgName', label: 'Название', fieldType: 'text', required: true },
    {
      name: 'orgInn',
      label: 'ИНН',
      fieldType: 'text',
      required: true,
      hint: '10 или 12 цифр',
    },
    { name: 'orgEmail', label: 'Email', fieldType: 'email', required: true, defaultValue: 'new-org@bdui.local' },
    { name: 'orgPhone', label: 'Телефон', fieldType: 'text', required: true, defaultValue: '+74950001122' },
    { name: 'orgSignerName', label: 'Подписант', fieldType: 'text', required: true },
    {
      name: 'orgBusinessForm',
      label: 'Форма',
      fieldType: 'select',
      required: true,
      defaultValue: OrganizationBusinessFormType.OOO,
      options: [
        { value: OrganizationBusinessFormType.OOO, label: 'ООО' },
        { value: OrganizationBusinessFormType.IP, label: 'ИП' },
      ],
    },
    {
      name: 'orgLegalAddress',
      label: 'Юридический адрес',
      fieldType: 'text',
      required: false,
      hint: 'Город и адрес для справочника / wizard',
    },
  ];
}

function buildCounterpartyInlineFields(): BduiField[] {
  return [
    { name: 'cpName', label: 'Название контрагента', fieldType: 'text', required: true },
    { name: 'cpCountry', label: 'Страна (код или название)', fieldType: 'text', required: true, defaultValue: 'DE' },
    { name: 'cpLegalAddress', label: 'Юридический адрес', fieldType: 'text', required: false },
    { name: 'cpBankName', label: 'Банк', fieldType: 'text', required: true },
    { name: 'cpBankCountry', label: 'Страна банка', fieldType: 'text', required: true, defaultValue: 'DE' },
    { name: 'cpAccountNumber', label: 'Номер счёта', fieldType: 'text', required: true },
    {
      name: 'cpAccountCurrency',
      label: 'Валюта счёта',
      fieldType: 'select',
      required: true,
      defaultValue: AllCurrencies.USD,
      options: [
        { value: AllCurrencies.USD, label: 'USD' },
        { value: AllCurrencies.EUR, label: 'EUR' },
        { value: AllCurrencies.CNY, label: 'CNY' },
      ],
    },
  ];
}

function buildInlineDirectoryActions(): BduiScreen['actions'] {
  return [
    {
      id: BDUI_ACTION_CREATE_ORGANIZATION,
      label: 'Сохранить организацию',
      method: 'POST',
      path: '/organization',
      bodyFrom: 'form',
      inlineCreateKind: 'organization',
      inlineCreateTargetField: 'organization',
      requiresFormFields: buildOrganizationInlineFields(),
    },
    {
      id: BDUI_ACTION_CREATE_COUNTERPARTY,
      label: 'Сохранить контрагента',
      method: 'POST',
      path: '/counterparty/create',
      bodyFrom: 'form',
      inlineCreateKind: 'counterparty_foreign',
      inlineCreateTargetField: 'counterpartyRef',
      requiresFormFields: buildCounterpartyInlineFields(),
    },
  ];
}

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
    const baseTable: BduiDataTableWidget = {
      type: 'data_table',
      id: 'forms_table',
      dataSource: { method: 'GET', path: '/form-payment' },
      columns: [
        { key: '_id', label: 'ID' },
        { key: 'status', label: 'Статус' },
        { key: 'direction', label: 'Направление' },
        { key: 'platformPaymentCondition', label: 'Оплата' },
        { key: 'organization.name', label: 'Организация' },
        { key: 'counterparty.name', label: 'Контрагент' },
        { key: 'totals.amount', label: 'Сумма', format: 'money_minor' },
        { key: 'createdAt', label: 'Создана' },
      ],
      rowNavigateTo: 'forms.detail',
      rowIdField: '_id',
      defaultSort: { key: 'createdAt', direction: 'desc' },
      sortableKeys: ['status', 'createdAt', 'totals.amount'],
      emptyMessage:
        'Пока нет заявок. Нажмите «Новая заявка» ниже — wizard проведёт через документы, условия сделки и организацию.',
    };
    const { table, listActions } = enrichFormListTable(baseTable, BDUI_ROLE_USER);
    return {
      id: 'user.forms.list',
      role: BDUI_ROLE_USER,
      page: 'forms.list',
      title: 'Мои заявки',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'list_intro',
          content:
            'Фильтр по статусу и быстрые действия на строке. Откройте карточку для полного набора CTA. Новая заявка — кнопка ниже.',
        },
        table,
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
        ...listActions,
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
          content:
            'Wizard создания заявки: документы → условия сделки (import / аванс / товар) → организация → отправка. «К списку» — вверху страницы.',
        },
        {
          type: 'text',
          id: 'create_pdf_hint',
          content:
            'Файлы: только PDF, до 15 Мб каждый. Инвойс и контракт можно загрузить на первом шаге или отметить «нет документов».',
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
          currenciesDataSource: { method: 'GET', path: '/currency' },
          counterpartiesDataSource: { method: 'GET', path: '/counterparty/list' },
          inlineCreates: [
            {
              stepId: 'deal',
              actionId: BDUI_ACTION_CREATE_COUNTERPARTY,
              targetField: 'counterpartyRef',
              panelTitle: 'Добавить контрагента',
            },
            {
              stepId: 'organization',
              actionId: BDUI_ACTION_CREATE_ORGANIZATION,
              targetField: 'organization',
              panelTitle: 'Добавить организацию',
            },
          ],
          steps: [
            {
              id: 'documents',
              title: 'Документы',
              description:
                'Загрузите инвойс и контракт (PDF до 15 Мб) или отметьте «нет документов» для продолжения без файлов.',
              fields: [
                {
                  name: 'invoiceFile',
                  label: 'Инвойс (PDF)',
                  fieldType: 'file',
                  required: false,
                  accept: 'application/pdf,.pdf',
                  hint: 'application/pdf, максимум 15 Мб',
                },
                {
                  name: 'contractFile',
                  label: 'Контракт (PDF)',
                  fieldType: 'file',
                  required: false,
                  accept: 'application/pdf,.pdf',
                  hint: 'application/pdf, максимум 15 Мб',
                },
                {
                  name: 'noDocuments',
                  label: 'Нет документов',
                  fieldType: 'checkbox',
                  required: false,
                  hint: 'Если документов пока нет — заявку можно создать и дозагрузить позже на карточке.',
                },
              ],
            },
            {
              id: 'deal',
              title: 'Условия сделки',
              description:
                'Канонический happy-path: import + аванс + товар. Условие оплаты и дата отгрузки влияют на этапы после принятия заявки.',
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
                  hint: 'Аванс — оплата до отгрузки; постоплата — доп. поручение и отчёт после поставки.',
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
                  hint: 'Список из seed-курсов (GET /currency): rub, usd, eur, cny…',
                },
                {
                  name: 'currencyCounterparty',
                  label: 'Валюта контрагента',
                  fieldType: 'select',
                  required: true,
                  defaultValue: AllCurrencies.USD,
                  hint: 'Валюта расчёта с иностранным контрагентом — из справочника курсов.',
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
                  hint: 'Товар — типовой импортный сценарий с кодом ТН ВЭД и датой отгрузки.',
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
                  hint: 'Плановая дата поставки/отгрузки — используется в условиях сделки и этапе shipment.',
                },
                {
                  name: 'counterpartyRef',
                  label: 'Контрагент (foreign)',
                  fieldType: 'counterparty_select',
                  required: false,
                  hint: 'Необязательно на MVP; можно добавить inline или выбрать из seed.',
                },
              ],
            },
            {
              id: 'organization',
              title: 'Организация',
              description:
                'Выберите организацию плательщика. Seed: «ООО BDUI Тест» (Москва, ICO) и «ООО BDUI Экспорт» (СПб, approved).',
              fields: [
                {
                  name: 'organization',
                  label: 'Организация',
                  fieldType: 'organization_select',
                  required: true,
                  hint: 'В списке — название, ИНН и юридический адрес из seed.',
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
        ...buildInlineDirectoryActions(),
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
    const isCanceledByUser = status === FormPaymentStatus.CANCELED_BY_USER;
    const isCanceledByManager = status === FormPaymentStatus.CANCELED_BY_MANAGER;
    const isCanceledByIco = status === FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER;
    const isTerminalCanceled =
      isCanceledByEco || isCanceledByUser || isCanceledByManager || isCanceledByIco;
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
          { key: 'totals.amount', label: 'Сумма', format: 'money_minor' },
          { key: 'currency.client', label: 'Валюта' },
          { key: 'platformPaymentCondition', label: 'Условие оплаты' },
          { key: 'organization.name', label: 'Организация' },
          { key: 'organization.status', label: 'Статус орг.' },
          { key: 'rejectText', label: 'Комментарий проверки' },
          { key: 'docs.paymentOrder', label: 'Поручение (файл)' },
          { key: 'docs.paymentOrderSigned', label: 'Поручение подписанное' },
          { key: 'docs.reportSigned', label: 'Отчёт подписанный' },
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
      widgets.push({
        type: 'text',
        id: 'deal_fields_hint',
        content:
          'Условия сделки: направление import/export, аванс/постоплата, тип товара и дата отгрузки — см. поля ниже. Документы — PDF до 15 Мб при загрузке с диска.',
      });
      widgets.push({
        type: 'inline_directory',
        id: 'draft_counterparty_inline',
        title: 'Контрагент',
        description:
          'Добавьте иностранного контрагента по месту или выберите из seed — запись сохранится в домене и привяжется к заявке.',
        createActionId: BDUI_ACTION_CREATE_COUNTERPARTY,
        listDataSource: { method: 'GET', path: '/counterparty/list' },
        linkActionId: BDUI_ACTION_SAVE_FORM,
        linkBodyField: 'counterpartyRef',
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
    if (
      status === FormPaymentStatus.SIGNING_ORDER ||
      status === FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS
    ) {
      widgets.push({
        type: 'text',
        id: 'signing_order_hint',
        content: 'Менеджер отправил поручение на подпись. Скачайте/подпишите и загрузите PDF поручения с диска.',
      });
    }
    if (status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED) {
      widgets.push({
        type: 'text',
        id: 'payments_hint',
        content:
          'Поручение принято. Загрузите PDF подтверждения оплаты с диска, затем менеджер передаст заявку Provider.',
      });
    }
    if (
      status === FormPaymentStatus.REPORT_WAITING ||
      status === FormPaymentStatus.REPORT_WAITING_CORRECTIONS
    ) {
      widgets.push({
        type: 'text',
        id: 'report_hint',
        content: 'Загрузите подписанный отчёт агента (PDF с диска) — заявка уйдёт на проверку менеджеру.',
      });
    }
    if (
      status === FormPaymentStatus.SHIPMENT_WAITING ||
      status === FormPaymentStatus.SHIPMENT_WAITING_CORRECTIONS
    ) {
      widgets.push({
        type: 'text',
        id: 'shipment_hint',
        content: 'Аванс: приложите документы отгрузки (PDF с диска) и отправьте на проверку менеджеру.',
      });
    }
    if (
      status === FormPaymentStatus.ADVANCE_SIGNING_ORDER ||
      status === FormPaymentStatus.ADVANCE_SIGNING_ORDER_WAITING_CORRECTIONS
    ) {
      widgets.push({
        type: 'text',
        id: 'advance_order_hint',
        content: 'Постоплата: загрузите подписанное дополнительное поручение (PDF с диска).',
      });
    }
    if (status === FormPaymentStatus.CONTRACT_WAITING || status === FormPaymentStatus.CONTRACT_WAITING_CORRECTION) {
      widgets.push({
        type: 'text',
        id: 'contract_hint',
        content:
          'Нужен агентский договор: загрузите подписанный PDF или дождитесь ручной загрузки менеджером.',
      });
    }
    if (status === FormPaymentStatus.COMPLETED) {
      widgets.push({
        type: 'text',
        id: 'completed_hint',
        content: 'Заявка завершена. Действия изменения недоступны.',
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
    if (isCanceledByUser) {
      widgets.push({
        type: 'text',
        id: 'user_canceled_hint',
        content: 'Вы отменили заявку. Дальнейшие изменения недоступны.',
      });
    }
    if (isCanceledByManager) {
      widgets.push({
        type: 'text',
        id: 'manager_canceled_hint',
        content: 'Заявка отменена менеджером. Дальнейшие изменения недоступны.',
      });
    }
    if (isCanceledByIco) {
      widgets.push({
        type: 'text',
        id: 'ico_canceled_hint',
        content: 'Заявка отменена Internal CO. Дальнейшие изменения недоступны.',
      });
    }
    if (isTerminalCanceled) {
      widgets.push({
        type: 'text',
        id: 'terminal_canceled_hint',
        content: 'Терминальный статус отмены: mutate CTA скрыты.',
      });
    }
    widgets.push({
      type: 'action_bar',
      id: 'form_actions',
      actions: availableActionIds,
    });
    const inlineActions = isDraftLike
      ? [
          ...buildInlineDirectoryActions(),
          {
            id: BDUI_ACTION_SAVE_FORM,
            label: 'Привязать к заявке',
            method: 'PATCH' as const,
            path: '/form-payment/{formId}/form',
            bodyFrom: 'form' as const,
          },
        ]
      : [];
    return {
      id: 'user.forms.detail',
      role: BDUI_ROLE_USER,
      page: 'forms.detail',
      title: 'Заявка',
      version: BDUI_SCHEMA_VERSION,
      widgets,
      actions: [...detailActions, ...inlineActions],
    };
  }
}
