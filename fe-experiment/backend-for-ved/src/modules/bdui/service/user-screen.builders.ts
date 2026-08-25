import { Injectable } from '@nestjs/common';
import { FormPaymentDirection, FormPaymentPaymentMethod, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_CORRECTIONS,
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
  BDUI_ACTION_CREATE_FORM,
  BDUI_ACTION_GO_CREATE,
  BDUI_ACTION_LOGIN,
  BDUI_ROLE_USER,
  BDUI_SCHEMA_VERSION,
} from '../bdui.constants';
import { BduiAction, BduiScreen } from '../bdui.types';
import { BduiUserActionResolver } from './bdui-user-action.resolver';

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
        { type: 'text', id: 'create_intro', content: 'Упрощённое создание заявки (эксперимент BDUI)' },
        {
          type: 'form',
          id: 'create_form',
          submitAction: BDUI_ACTION_CREATE_FORM,
          fields: [
            {
              name: 'direction',
              label: 'Направление',
              fieldType: 'select',
              required: false,
              options: [
                { value: FormPaymentDirection.IMPORT, label: 'Импорт' },
                { value: FormPaymentDirection.EXPORT, label: 'Экспорт' },
              ],
            },
            {
              name: 'paymentMethod',
              label: 'Способ оплаты',
              fieldType: 'select',
              required: false,
              options: [
                { value: FormPaymentPaymentMethod.PAY_IN_RUBLES, label: 'В рублях' },
                { value: FormPaymentPaymentMethod.PAY_FROM_EXPORT, label: 'Из экспорта' },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_CREATE_FORM,
          label: 'Создать',
          method: 'POST',
          path: '/form-payment',
          bodyFrom: 'form',
          navigateTo: 'forms.detail',
        },
      ],
    };
  }

  buildFormsDetailScreen(status?: FormPaymentStatus | string): BduiScreen {
    const availableActionIds = this.actionResolver.resolveActionIds(status);
    const detailActions = this.buildDetailActions();
    return {
      id: 'user.forms.detail',
      role: BDUI_ROLE_USER,
      page: 'forms.detail',
      title: 'Заявка',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
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
            { key: 'createdAt', label: 'Создана' },
          ],
        },
        {
          type: 'action_bar',
          id: 'form_actions',
          actions: availableActionIds,
        },
      ],
      actions: detailActions.filter((action) => availableActionIds.includes(action.id)),
    };
  }

  private buildDetailActions(): BduiAction[] {
    return [
      {
        id: BDUI_ACTION_ACCEPT_FORM,
        label: 'Отправить на проверку',
        method: 'PUT',
        path: '/form-payment/{formId}/form/accept',
        bodyFrom: 'none',
        navigateTo: 'forms.detail',
      },
      {
        id: BDUI_ACTION_ACCEPT_CORRECTIONS,
        label: 'Отправить исправления',
        method: 'PUT',
        path: '/form-payment/{formId}/form/accept-corrections',
        bodyFrom: 'none',
        navigateTo: 'forms.detail',
      },
      {
        id: BDUI_ACTION_CANCEL_FORM,
        label: 'Отменить заявку',
        method: 'PUT',
        path: '/form-payment/{formId}/cancel',
        bodyFrom: 'none',
        navigateTo: 'forms.list',
      },
    ];
  }
}
