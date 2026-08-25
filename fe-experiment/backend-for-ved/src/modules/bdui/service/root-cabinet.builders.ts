import { Injectable } from '@nestjs/common';
import { AccountRole } from 'lib/enums/models/account.enums';
import {
  BDUI_ACTION_LOGIN,
  BDUI_ACTION_ROOT_BLOCK_USER,
  BDUI_ACTION_ROOT_CANCEL_FORM,
  BDUI_ACTION_ROOT_CREATE_USER,
  BDUI_ACTION_ROOT_UNBLOCK_USER,
  BDUI_BULK_MAX_SELECTION,
  BDUI_ROLE_ROOT,
  BDUI_SCHEMA_VERSION,
} from '../bdui.constants';
import { BduiScreen } from '../bdui.types';

const FORM_BULK_CANCEL_INELIGIBLE_STATUSES = [
  'completed',
  'canceled',
  'canceled_by_user',
  'canceled_by_manager',
  'canceled_by_compliance_officer',
  'canceled_by_internal_compliance_officer',
] as const;

const ACCOUNT_ROLE_OPTIONS = [
  { value: AccountRole.USER, label: 'User' },
  { value: AccountRole.INTERNAL_COMPLIANCE_OFFICER, label: 'Internal CO' },
  { value: AccountRole.COMPLIANCE_OFFICER, label: 'External CO' },
  { value: AccountRole.MANAGER, label: 'Manager' },
  { value: AccountRole.PROVIDER, label: 'Provider' },
  { value: AccountRole.ROOT, label: 'Root' },
];

/**
 * BDUI screens for platform root (SuperAdmin) on existing admin/root APIs.
 */
@Injectable()
export class RootCabinetBuilders {
  buildLoginScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.login`,
      role: BDUI_ROLE_ROOT,
      page: 'login',
      title: 'Вход — SuperAdmin',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'login_intro',
          content:
            'BDUI root: пользователи, справочники (валюты), заявки (admin cancel). AuthZ на API — UI не единственная защита.',
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
          navigateTo: 'users.list',
        },
      ],
    };
  }

  buildUsersListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.users.list`,
      role: BDUI_ROLE_ROOT,
      page: 'users.list',
      title: 'Пользователи',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'users_intro',
          content: 'Аккаунты платформы: просмотр, создание, блокировка. Мутации пишутся в admin activity.',
        },
        {
          type: 'data_table',
          id: 'users_table',
          dataSource: { method: 'GET', path: '/admin/account?limit=50' },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'email', label: 'Email' },
            { key: 'fullName', label: 'Имя' },
            { key: 'roles', label: 'Роли' },
            { key: 'blocked', label: 'Заблокирован' },
            { key: 'createDate', label: 'Создан' },
          ],
          rowNavigateTo: 'users.detail',
          rowIdField: '_id',
          rowNavigateParam: 'userId',
          selectable: true,
          bulkMaxSelection: BDUI_BULK_MAX_SELECTION,
          bulkActions: [
            {
              actionId: BDUI_ACTION_ROOT_BLOCK_USER,
              label: 'Заблокировать выбранных',
              pathParam: 'userId',
              eligibility: { field: 'blocked', notIn: [true] },
              requiresConfirmation: true,
              confirmMessage: 'Заблокировать {eligible} пользователей?',
            },
            {
              actionId: BDUI_ACTION_ROOT_UNBLOCK_USER,
              label: 'Разблокировать выбранных',
              pathParam: 'userId',
              eligibility: { field: 'blocked', in: [true] },
              requiresConfirmation: true,
              confirmMessage: 'Разблокировать {eligible} пользователей?',
            },
          ],
          defaultSort: { key: 'createDate', direction: 'desc' },
          sortableKeys: ['email', 'createDate', 'blocked'],
          emptyMessage: 'Нет пользователей — создайте первого через «Новый пользователь».',
        },
      ],
      actions: [
        {
          id: 'go_users_create',
          label: 'Новый пользователь',
          method: 'GET',
          path: '/bdui/schema/root/users.create',
          bodyFrom: 'none',
          navigateTo: 'users.create',
        },
        {
          id: BDUI_ACTION_ROOT_BLOCK_USER,
          label: 'Заблокировать',
          method: 'PATCH',
          path: '/admin/account/{userId}',
          bodyFrom: 'form',
          staticBody: { blocked: true },
        },
        {
          id: BDUI_ACTION_ROOT_UNBLOCK_USER,
          label: 'Разблокировать',
          method: 'PATCH',
          path: '/admin/account/{userId}',
          bodyFrom: 'form',
          staticBody: { blocked: false },
        },
      ],
    };
  }

  buildUsersCreateScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.users.create`,
      role: BDUI_ROLE_ROOT,
      page: 'users.create',
      title: 'Новый пользователь',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'users_create_intro',
          content: 'POST /admin/account — только root. Пароль задаётся явно.',
        },
        {
          type: 'form',
          id: 'users_create_form',
          fields: [
            { name: 'email', label: 'Email', fieldType: 'email', required: true },
            { name: 'fullName', label: 'Имя', fieldType: 'text', required: true },
            { name: 'password', label: 'Пароль', fieldType: 'password', required: true },
            {
              name: 'roles',
              label: 'Роль',
              fieldType: 'select',
              required: true,
              defaultValue: AccountRole.USER,
              options: ACCOUNT_ROLE_OPTIONS,
            },
            { name: 'phone', label: 'Телефон', fieldType: 'text', required: false },
          ],
          submitAction: BDUI_ACTION_ROOT_CREATE_USER,
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_ROOT_CREATE_USER,
          label: 'Создать',
          method: 'POST',
          path: '/admin/account',
          bodyFrom: 'form',
          navigateTo: 'users.detail',
        },
      ],
    };
  }

  buildUsersDetailScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.users.detail`,
      role: BDUI_ROLE_ROOT,
      page: 'users.detail',
      title: 'Пользователь',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'detail_fields',
          id: 'user_fields',
          dataSource: { method: 'GET', path: '/admin/account/{userId}' },
          fields: [
            { key: '_id', label: 'ID' },
            { key: 'email', label: 'Email' },
            { key: 'fullName', label: 'Имя' },
            { key: 'roles', label: 'Роли' },
            { key: 'blocked', label: 'Заблокирован' },
            { key: 'phone', label: 'Телефон' },
            { key: 'createDate', label: 'Создан' },
          ],
        },
        {
          type: 'action_bar',
          id: 'user_actions',
          actions: [BDUI_ACTION_ROOT_BLOCK_USER, BDUI_ACTION_ROOT_UNBLOCK_USER],
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_ROOT_BLOCK_USER,
          label: 'Заблокировать',
          method: 'PATCH',
          path: '/admin/account/{userId}',
          bodyFrom: 'form',
          staticBody: { blocked: true },
        },
        {
          id: BDUI_ACTION_ROOT_UNBLOCK_USER,
          label: 'Разблокировать',
          method: 'PATCH',
          path: '/admin/account/{userId}',
          bodyFrom: 'form',
          staticBody: { blocked: false },
        },
      ],
    };
  }

  buildDirectoriesListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.directories.list`,
      role: BDUI_ROLE_ROOT,
      page: 'directories.list',
      title: 'Справочники — организации',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'directories_intro',
          content:
            'Админ-справочник организаций (GET/PATCH /admin/manager/organization). Seed E10: BDUI Тест / BDUI Экспорт.',
        },
        {
          type: 'data_table',
          id: 'organizations_table',
          dataSource: { method: 'GET', path: '/admin/manager/organization?limit=50' },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'name', label: 'Название' },
            { key: 'inn', label: 'ИНН' },
            { key: 'status', label: 'Статус' },
            { key: 'legalAddress', label: 'Адрес' },
          ],
          rowNavigateTo: 'directories.detail',
          rowIdField: '_id',
          defaultSort: { key: 'name', direction: 'asc' },
          sortableKeys: ['name', 'status', 'inn'],
          emptyMessage: 'Список организаций пуст — проверьте seed.',
        },
      ],
      actions: [],
    };
  }

  buildDirectoriesDetailScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.directories.detail`,
      role: BDUI_ROLE_ROOT,
      page: 'directories.detail',
      title: 'Организация',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'detail_fields',
          id: 'organization_fields',
          dataSource: { method: 'GET', path: '/admin/manager/organization/{orgId}' },
          fields: [
            { key: '_id', label: 'ID' },
            { key: 'name', label: 'Название' },
            { key: 'inn', label: 'ИНН' },
            { key: 'status', label: 'Статус' },
            { key: 'email', label: 'Email' },
            { key: 'legalAddress', label: 'Юр. адрес' },
          ],
        },
        {
          type: 'form',
          id: 'organization_edit_form',
          fields: [
            {
              name: 'legalAddress',
              label: 'Новый юридический адрес',
              fieldType: 'text',
              required: true,
              hint: 'PATCH /admin/manager/organization/{orgId}',
            },
          ],
          submitAction: 'root_org_update_address',
        },
      ],
      actions: [
        {
          id: 'root_org_update_address',
          label: 'Сохранить адрес',
          method: 'PATCH',
          path: '/admin/manager/organization/{orgId}',
          bodyFrom: 'form',
        },
      ],
    };
  }

  buildFormsListScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.forms.list`,
      role: BDUI_ROLE_ROOT,
      page: 'forms.list',
      title: 'Заявки (admin)',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'text',
          id: 'forms_intro',
          content: 'Все заявки через GET /admin/form-payment. Force cancel — manager endpoint (audit в admin activity).',
        },
        {
          type: 'data_table',
          id: 'forms_table',
          dataSource: { method: 'GET', path: '/admin/form-payment?limit=50' },
          columns: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'organization.name', label: 'Организация' },
            { key: 'totals.amount', label: 'Сумма', format: 'money_minor' },
            { key: 'updateDate', label: 'Обновлена' },
          ],
          rowNavigateTo: 'forms.detail',
          rowIdField: '_id',
          rowNavigateParam: 'formId',
          selectable: true,
          bulkMaxSelection: BDUI_BULK_MAX_SELECTION,
          bulkActions: [
            {
              actionId: BDUI_ACTION_ROOT_CANCEL_FORM,
              label: 'Отменить выбранные',
              pathParam: 'formId',
              eligibility: {
                field: 'status',
                notIn: [...FORM_BULK_CANCEL_INELIGIBLE_STATUSES],
              },
              requiresConfirmation: true,
              confirmMessage: 'Отменить {eligible} заявок? Необратимо для активных статусов.',
            },
          ],
          defaultSort: { key: 'updateDate', direction: 'desc' },
          sortableKeys: ['status', 'updateDate', 'totals.amount'],
          emptyMessage: 'Нет заявок.',
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_ROOT_CANCEL_FORM,
          label: 'Отменить (manager cancel)',
          method: 'PUT',
          path: '/admin/manager/form-payment/{formId}/cancel',
          bodyFrom: 'form',
          requiresTextReason: true,
        },
      ],
    };
  }

  buildFormsDetailScreen(): BduiScreen {
    return {
      id: `${BDUI_ROLE_ROOT}.forms.detail`,
      role: BDUI_ROLE_ROOT,
      page: 'forms.detail',
      title: 'Заявка (admin)',
      version: BDUI_SCHEMA_VERSION,
      widgets: [
        {
          type: 'status_badge',
          id: 'form_status',
          field: 'status',
          dataSource: { method: 'GET', path: '/admin/form-payment/{formId}' },
        },
        {
          type: 'detail_fields',
          id: 'form_fields',
          dataSource: { method: 'GET', path: '/admin/form-payment/{formId}' },
          fields: [
            { key: '_id', label: 'ID' },
            { key: 'status', label: 'Статус' },
            { key: 'direction', label: 'Направление' },
            { key: 'totals.amount', label: 'Сумма', format: 'money_minor' },
            { key: 'currency.client', label: 'Валюта' },
            { key: 'organization.name', label: 'Организация' },
            { key: 'organization.inn', label: 'ИНН' },
            { key: 'updateDate', label: 'Обновлена' },
          ],
        },
        {
          type: 'action_bar',
          id: 'form_actions',
          actions: [BDUI_ACTION_ROOT_CANCEL_FORM],
        },
      ],
      actions: [
        {
          id: BDUI_ACTION_ROOT_CANCEL_FORM,
          label: 'Отменить (manager cancel)',
          method: 'PUT',
          path: '/admin/manager/form-payment/{formId}/cancel',
          bodyFrom: 'form',
          requiresTextReason: true,
        },
      ],
    };
  }
}
