import { Injectable } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_LOGIN,
  BDUI_ROLE_EXTERNAL_CO,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_PROVIDER,
  BDUI_ROLE_USER,
  BDUI_SCHEMA_VERSION,
  BduiVedRoleId,
} from '../bdui.constants';
import { BduiColumn, BduiScreen, BduiWidget } from '../bdui.types';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';

const ROLE_TITLES: Record<BduiVedRoleId, string> = {
  [BDUI_ROLE_USER]: 'Клиент',
  [BDUI_ROLE_INTERNAL_CO]: 'Internal CO',
  [BDUI_ROLE_EXTERNAL_CO]: 'External CO',
  [BDUI_ROLE_MANAGER]: 'Менеджер',
  [BDUI_ROLE_PROVIDER]: 'Провайдер',
};

const LIST_PATHS: Record<BduiVedRoleId, string> = {
  [BDUI_ROLE_USER]: '/form-payment',
  [BDUI_ROLE_INTERNAL_CO]:
    '/admin/internal-compliance-officer/form-payment?statuses=organization_waiting_verification&statuses=organization_verification',
  [BDUI_ROLE_EXTERNAL_CO]:
    '/admin/compliance-officer/form-payment?statuses=form_waiting_verification&statuses=form_verification',
  [BDUI_ROLE_MANAGER]:
    '/admin/manager/form-payment?statuses=form_accepted&statuses=signing_order&statuses=signing_order_waiting_verification&statuses=signing_order_verification&statuses=signing_order_accepted&statuses=payment_received&statuses=payment_processing&statuses=manager_checking',
  [BDUI_ROLE_PROVIDER]:
    '/admin/provider/form-payment?statuses=signing_order_accepted&statuses=payment_received&statuses=payment_processing',
};

const DETAIL_PATHS: Record<BduiVedRoleId, string> = {
  [BDUI_ROLE_USER]: '/form-payment/{formId}',
  [BDUI_ROLE_INTERNAL_CO]: '/admin/internal-compliance-officer/form-payment/{formId}',
  [BDUI_ROLE_EXTERNAL_CO]: '/admin/compliance-officer/form-payment/{formId}',
  [BDUI_ROLE_MANAGER]: '/admin/manager/form-payment/{formId}',
  [BDUI_ROLE_PROVIDER]: '/admin/provider/form-payment/{formId}',
};

/**
 * Builds cabinet screens (login / list / detail) for staff ВИ roles.
 */
@Injectable()
export class RoleCabinetBuilders {
  constructor(private readonly lifecycleResolver: BduiLifecycleActionResolver) {}

  buildLoginScreen(role: BduiVedRoleId): BduiScreen {
    return {
      id: `${role}.login`,
      role,
      page: 'login',
      title: `Вход — ${ROLE_TITLES[role]}`,
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'login_intro',
          content: `BDUI lifecycle — кабинет ${ROLE_TITLES[role]}`,
        },
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

  buildFormsListScreen(role: BduiVedRoleId): BduiScreen {
    if (role === BDUI_ROLE_INTERNAL_CO) {
      return this.buildInternalCoListScreen();
    }
    if (role === BDUI_ROLE_EXTERNAL_CO) {
      return this.buildExternalCoListScreen();
    }
    if (role === BDUI_ROLE_MANAGER) {
      return this.buildManagerListScreen();
    }
    if (role === BDUI_ROLE_PROVIDER) {
      return this.buildProviderListScreen();
    }
    return {
      id: `${role}.forms.list`,
      role,
      page: 'forms.list',
      title: `Заявки — ${ROLE_TITLES[role]}`,
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'list_intro',
          content: `Список заявок — ${ROLE_TITLES[role]}`,
        },
        {
          type: 'data_table',
          id: 'forms_table',
          dataSource: { method: 'GET', path: LIST_PATHS[role] },
          columns: this.defaultListColumns(),
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
        },
      ],
      actions: [],
    };
  }

  buildFormsDetailScreen(role: BduiVedRoleId, status?: FormPaymentStatus | string): BduiScreen {
    if (role === BDUI_ROLE_INTERNAL_CO) {
      return this.buildInternalCoDetailScreen(status);
    }
    if (role === BDUI_ROLE_EXTERNAL_CO) {
      return this.buildExternalCoDetailScreen(status);
    }
    if (role === BDUI_ROLE_MANAGER) {
      return this.buildManagerDetailScreen(status);
    }
    if (role === BDUI_ROLE_PROVIDER) {
      return this.buildProviderDetailScreen(status);
    }
    const actions = this.lifecycleResolver.resolveActions(role, status);
    const actionIds = actions.map((item) => item.id);
    const detailPath = DETAIL_PATHS[role];
    return {
      id: `${role}.forms.detail`,
      role,
      page: 'forms.detail',
      title: `Заявка — ${ROLE_TITLES[role]}`,
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'status_badge',
          id: 'form_status',
          field: 'status',
          dataSource: { method: 'GET', path: detailPath },
        },
        {
          type: 'detail_fields',
          id: 'form_fields',
          dataSource: { method: 'GET', path: detailPath },
          fields: this.defaultDetailFields(),
        },
        { type: 'action_bar', id: 'form_actions', actions: actionIds },
      ],
      actions,
    };
  }

  private buildInternalCoListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_INTERNAL_CO}.forms.list`,
      role: BDUI_ROLE_INTERNAL_CO,
      page: 'forms.list',
      title: 'Очередь Internal CO',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'list_intro',
          content:
            'Очередь первой проверки РФ-организации: waiting → verification. Примите в работу, затем подтвердите / верните / отмените.',
        },
        {
          type: 'data_table',
          id: 'ico_queue',
          dataSource: { method: 'GET', path: LIST_PATHS[BDUI_ROLE_INTERNAL_CO] },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'organization.name', label: 'Организация' },
            { key: 'organization.inn', label: 'ИНН' },
            { key: 'amount', label: 'Сумма' },
          ],
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
        },
      ],
      actions: [],
    };
  }

  private buildInternalCoDetailScreen(status?: FormPaymentStatus | string): BduiScreen {
    const actions = this.lifecycleResolver.resolveActions(BDUI_ROLE_INTERNAL_CO, status);
    const actionIds = actions.map((item) => item.id);
    const detailPath = DETAIL_PATHS[BDUI_ROLE_INTERNAL_CO];
    const widgets: BduiWidget[] = [
      {
        type: 'status_badge',
        id: 'form_status',
        field: 'status',
        dataSource: { method: 'GET', path: detailPath },
      },
      {
        type: 'detail_fields',
        id: 'form_fields',
        dataSource: { method: 'GET', path: detailPath },
        fields: [
          { key: '_id', label: 'ID' },
          { key: 'status', label: 'Статус' },
          { key: 'direction', label: 'Направление' },
          { key: 'amount', label: 'Сумма' },
          { key: 'organization.name', label: 'Организация' },
          { key: 'organization.inn', label: 'ИНН' },
          { key: 'organization.status', label: 'Статус орг.' },
          { key: 'rejectText', label: 'Комментарий' },
        ],
      },
    ];
    if (status === FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION) {
      widgets.push({
        type: 'text',
        id: 'ico_hint_start',
        content: 'Заявка ждёт взятия в работу. Нажмите «Начать проверку».',
      });
    }
    if (status === FormPaymentStatus.ORGANIZATION_VERIFICATION) {
      widgets.push({
        type: 'text',
        id: 'ico_hint_decide',
        content:
          'Проверка организации: подтвердить (→ External CO), вернуть на уточнение клиенту или отменить заявку.',
      });
    }
    widgets.push({ type: 'action_bar', id: 'form_actions', actions: actionIds });
    return {
      id: `${BDUI_ROLE_INTERNAL_CO}.forms.detail`,
      role: BDUI_ROLE_INTERNAL_CO,
      page: 'forms.detail',
      title: 'Проверка организации — Internal CO',
      version: BDUI_SCHEMA_VERSION,
      widgets,
      actions,
    };
  }

  private buildExternalCoListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_EXTERNAL_CO}.forms.list`,
      role: BDUI_ROLE_EXTERNAL_CO,
      page: 'forms.list',
      title: 'Ожидает проверки — External CO',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'list_intro',
          content:
            'Очередь проверки заявки (документы и условия сделки): waiting → verification. Одобрите, верните на доработку или отмените.',
        },
        {
          type: 'data_table',
          id: 'eco_queue',
          dataSource: { method: 'GET', path: LIST_PATHS[BDUI_ROLE_EXTERNAL_CO] },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'platformPaymentCondition', label: 'Условие оплаты' },
            { key: 'organization.name', label: 'Организация' },
            { key: 'amount', label: 'Сумма' },
          ],
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
        },
      ],
      actions: [],
    };
  }

  private buildExternalCoDetailScreen(status?: FormPaymentStatus | string): BduiScreen {
    const actions = this.lifecycleResolver.resolveActions(BDUI_ROLE_EXTERNAL_CO, status);
    const actionIds = actions.map((item) => item.id);
    const detailPath = DETAIL_PATHS[BDUI_ROLE_EXTERNAL_CO];
    const widgets: BduiWidget[] = [
      {
        type: 'status_badge',
        id: 'form_status',
        field: 'status',
        dataSource: { method: 'GET', path: detailPath },
      },
      {
        type: 'detail_fields',
        id: 'form_fields',
        dataSource: { method: 'GET', path: detailPath },
        fields: [
          { key: '_id', label: 'ID' },
          { key: 'status', label: 'Статус' },
          { key: 'direction', label: 'Направление' },
          { key: 'amount', label: 'Сумма' },
          { key: 'currencyClient', label: 'Валюта клиента' },
          { key: 'currencyCounterparty', label: 'Валюта контрагента' },
          { key: 'platformPaymentCondition', label: 'Условие оплаты' },
          { key: 'organization.name', label: 'Организация' },
          { key: 'organization.inn', label: 'ИНН' },
          { key: 'organization.status', label: 'Статус орг.' },
          { key: 'rejectText', label: 'Комментарий' },
        ],
      },
      {
        type: 'text',
        id: 'eco_readonly_note',
        content: 'Документы и условия сделки — только просмотр. Решение фиксируется действиями ниже.',
      },
    ];
    if (status === FormPaymentStatus.FORM_WAITING_VERIFICATION) {
      widgets.push({
        type: 'text',
        id: 'eco_hint_start',
        content: 'Заявка в очереди «Ожидает проверки». Нажмите «Начать проверку».',
      });
    }
    if (status === FormPaymentStatus.FORM_VERIFICATION) {
      widgets.push({
        type: 'text',
        id: 'eco_hint_decide',
        content:
          'Проверка заявки: одобрить (→ Manager), вернуть на доработку с комментарием или отменить.',
      });
    }
    widgets.push({ type: 'action_bar', id: 'form_actions', actions: actionIds });
    return {
      id: `${BDUI_ROLE_EXTERNAL_CO}.forms.detail`,
      role: BDUI_ROLE_EXTERNAL_CO,
      page: 'forms.detail',
      title: 'Проверка заявки — External CO',
      version: BDUI_SCHEMA_VERSION,
      widgets,
      actions,
    };
  }

  private buildManagerListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_MANAGER}.forms.list`,
      role: BDUI_ROLE_MANAGER,
      page: 'forms.list',
      title: 'Активные — Manager',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'list_intro',
          content:
            'Happy-path import+аванс: form_accepted → поручение → оплата → передача Provider. Список отфильтрован по активным статусам менеджера.',
        },
        {
          type: 'data_table',
          id: 'mgr_queue',
          dataSource: { method: 'GET', path: LIST_PATHS[BDUI_ROLE_MANAGER] },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'platformPaymentCondition', label: 'Условие оплаты' },
            { key: 'organization.name', label: 'Организация' },
            { key: 'amount', label: 'Сумма' },
            { key: 'provider', label: 'Provider' },
          ],
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
        },
      ],
      actions: [],
    };
  }

  private buildManagerDetailScreen(status?: FormPaymentStatus | string): BduiScreen {
    const actions = this.lifecycleResolver.resolveActions(BDUI_ROLE_MANAGER, status);
    const actionIds = actions.map((item) => item.id);
    const detailPath = DETAIL_PATHS[BDUI_ROLE_MANAGER];
    const widgets: BduiWidget[] = [
      {
        type: 'status_badge',
        id: 'form_status',
        field: 'status',
        dataSource: { method: 'GET', path: detailPath },
      },
      {
        type: 'detail_fields',
        id: 'form_fields',
        dataSource: { method: 'GET', path: detailPath },
        fields: [
          { key: '_id', label: 'ID' },
          { key: 'status', label: 'Статус' },
          { key: 'direction', label: 'Направление' },
          { key: 'amount', label: 'Сумма' },
          { key: 'platformPaymentCondition', label: 'Условие оплаты' },
          { key: 'organization.name', label: 'Организация' },
          { key: 'organization.inn', label: 'ИНН' },
          { key: 'provider', label: 'Provider' },
          { key: 'agent', label: 'Agent' },
          { key: 'rejectText', label: 'Комментарий' },
        ],
      },
    ];
    if (status === FormPaymentStatus.FORM_ACCEPTED) {
      widgets.push({
        type: 'text',
        id: 'mgr_hint_order',
        content:
          'Стандартный агентский path: сформируйте или прикрепите поручение → отправьте на подпись клиенту. Назначьте Provider до передачи в исполнение.',
      });
    }
    if (status === FormPaymentStatus.SIGNING_ORDER) {
      widgets.push({
        type: 'text',
        id: 'mgr_hint_waiting_user_sign',
        content: 'Поручение у клиента на подписи. User видит CTA «Загрузить поручение».',
      });
    }
    if (status === FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION) {
      widgets.push({
        type: 'text',
        id: 'mgr_hint_order_start',
        content: 'Клиент загрузил подписанное поручение. Начните проверку, затем подтвердите или верните.',
      });
    }
    if (status === FormPaymentStatus.SIGNING_ORDER_VERIFICATION) {
      widgets.push({
        type: 'text',
        id: 'mgr_hint_order_review',
        content: 'Проверка поручения: подтвердите или верните на доработку с комментарием.',
      });
    }
    if (
      status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED ||
      status === FormPaymentStatus.PAYMENT_RECEIVED
    ) {
      widgets.push({
        type: 'text',
        id: 'mgr_hint_payment',
        content:
          'Назначьте Provider (если ещё нет), зафиксируйте оплату клиента и передайте на исполнение → payment_processing.',
      });
    }
    widgets.push({ type: 'action_bar', id: 'form_actions', actions: actionIds });
    return {
      id: `${BDUI_ROLE_MANAGER}.forms.detail`,
      role: BDUI_ROLE_MANAGER,
      page: 'forms.detail',
      title: 'Заявка — Manager',
      version: BDUI_SCHEMA_VERSION,
      widgets,
      actions,
    };
  }

  private buildProviderListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_PROVIDER}.forms.list`,
      role: BDUI_ROLE_PROVIDER,
      page: 'forms.list',
      title: 'Исполнение — Provider',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'list_intro',
          content:
            'Только ваши заявки. Данные клиента ограничены: реквизиты платежа, суммы, поручение/доказательства — без ПДн account.',
        },
        {
          type: 'data_table',
          id: 'prov_queue',
          dataSource: { method: 'GET', path: LIST_PATHS[BDUI_ROLE_PROVIDER] },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'platformPaymentCondition', label: 'Условие' },
            { key: 'amount', label: 'Сумма' },
            { key: 'counterparty.name', label: 'Контрагент' },
          ],
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
        },
      ],
      actions: [],
    };
  }

  private buildProviderDetailScreen(status?: FormPaymentStatus | string): BduiScreen {
    const actions = this.lifecycleResolver.resolveActions(BDUI_ROLE_PROVIDER, status);
    const actionIds = actions.map((item) => item.id);
    const detailPath = DETAIL_PATHS[BDUI_ROLE_PROVIDER];
    const widgets: BduiWidget[] = [
      {
        type: 'status_badge',
        id: 'form_status',
        field: 'status',
        dataSource: { method: 'GET', path: detailPath },
      },
      {
        type: 'detail_fields',
        id: 'form_fields',
        dataSource: { method: 'GET', path: detailPath },
        fields: [
          { key: '_id', label: 'ID' },
          { key: 'status', label: 'Статус' },
          { key: 'direction', label: 'Направление' },
          { key: 'amount', label: 'Сумма' },
          { key: 'totals.coverAmount', label: 'Покрытие' },
          { key: 'platformPaymentCondition', label: 'Условие оплаты' },
          { key: 'counterparty.name', label: 'Контрагент' },
          { key: 'counterparty.bankName', label: 'Банк' },
          { key: 'counterparty.accountNumber', label: 'Счёт' },
          { key: 'counterparty.swiftCode', label: 'SWIFT' },
          { key: 'organization.name', label: 'Орг. (имя)' },
          { key: 'organization.inn', label: 'ИНН' },
          { key: 'docs.paymentOrder', label: 'Поручение' },
          { key: 'rejectText', label: 'Комментарий' },
        ],
      },
      {
        type: 'text',
        id: 'prov_pii_note',
        content: 'Ответ API без client account / manager / email-phone организации (узкий Provider DTO).',
      },
    ];
    if (
      status === FormPaymentStatus.PAYMENT_RECEIVED ||
      status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED
    ) {
      widgets.push({
        type: 'text',
        id: 'prov_hint_start',
        content: 'Начните исполнение или верните заявку менеджеру с комментарием.',
      });
    }
    if (status === FormPaymentStatus.PAYMENT_PROCESSING) {
      widgets.push({
        type: 'text',
        id: 'prov_hint_execute',
        content:
          'Прикрепите подтверждение (файл stub или tx hash), затем «Исполнить платёж» → payment_sent. Либо верните менеджеру.',
      });
    }
    widgets.push({ type: 'action_bar', id: 'form_actions', actions: actionIds });
    return {
      id: `${BDUI_ROLE_PROVIDER}.forms.detail`,
      role: BDUI_ROLE_PROVIDER,
      page: 'forms.detail',
      title: 'Исполнение платежа — Provider',
      version: BDUI_SCHEMA_VERSION,
      widgets,
      actions,
    };
  }

  private defaultListColumns(): BduiColumn[] {
    return [
      { key: '_id', label: 'ID' },
      { key: 'status', label: 'Статус' },
      { key: 'direction', label: 'Направление' },
      { key: 'amount', label: 'Сумма' },
    ];
  }

  private defaultDetailFields(): BduiColumn[] {
    return [
      { key: '_id', label: 'ID' },
      { key: 'status', label: 'Статус' },
      { key: 'direction', label: 'Направление' },
      { key: 'amount', label: 'Сумма' },
    ];
  }
}
