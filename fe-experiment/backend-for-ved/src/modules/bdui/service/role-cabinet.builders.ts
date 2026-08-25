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
  [BDUI_ROLE_MANAGER]: '/admin/manager/form-payment',
  [BDUI_ROLE_PROVIDER]: '/admin/provider/form-payment',
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
