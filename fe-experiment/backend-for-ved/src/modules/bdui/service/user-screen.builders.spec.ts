import { UserScreenBuilders } from './user-screen.builders';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';
import { BduiUserActionResolver } from './bdui-user-action.resolver';
import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CREATE_COUNTERPARTY,
  BDUI_ACTION_CREATE_FORM,
  BDUI_ACTION_CREATE_ORGANIZATION,
  BDUI_ACTION_SAVE_FORM,
  BDUI_ACTION_UPLOAD_FILE,
} from '../bdui.constants';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';

describe('UserScreenBuilders', () => {
  let builders: UserScreenBuilders;

  beforeEach(() => {
    const lifecycleResolver = new BduiLifecycleActionResolver();
    builders = new UserScreenBuilders(new BduiUserActionResolver(lifecycleResolver));
  });

  it('maps create wizard actions to site create/PATCH/upload/accept', () => {
    const screen = builders.buildFormsCreateScreen();
    const byId = Object.fromEntries(screen.actions.map((action) => [action.id, action]));
    expect(byId[BDUI_ACTION_CREATE_FORM]?.method).toBe('POST');
    expect(byId[BDUI_ACTION_CREATE_FORM]?.path).toBe('/form-payment');
    expect(byId[BDUI_ACTION_SAVE_FORM]?.method).toBe('PATCH');
    expect(byId[BDUI_ACTION_SAVE_FORM]?.path).toBe('/form-payment/{formId}/form');
    expect(byId[BDUI_ACTION_UPLOAD_FILE]?.path).toBe('/file-store/upload/pdf');
    expect(byId[BDUI_ACTION_ACCEPT_FORM]?.method).toBe('PUT');
    expect(byId[BDUI_ACTION_ACCEPT_FORM]?.path).toBe('/form-payment/{formId}/form/accept');
  });

  it('builds draft detail with accept action for User', () => {
    const screen = builders.buildFormsDetailScreen(FormPaymentStatus.DRAFT);
    expect(screen.actions.map((action) => action.id)).toContain(BDUI_ACTION_ACCEPT_FORM);
  });

  it('builds creating detail with accept action for User', () => {
    const screen = builders.buildFormsDetailScreen(FormPaymentStatus.CREATING);
    expect(screen.actions.map((action) => action.id)).toContain(BDUI_ACTION_ACCEPT_FORM);
  });

  it('maps list/detail money and currency to domain DTO paths', () => {
    const list = builders.buildFormsListScreen();
    const table = list.widgets.find((widget) => widget.type === 'data_table');
    expect(table?.type).toBe('data_table');
    if (table?.type !== 'data_table') {
      return;
    }
    expect(table.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'status', label: 'Статус' }),
        expect.objectContaining({ key: 'totals.amount', format: 'money_minor' }),
      ]),
    );
    const detail = builders.buildFormsDetailScreen(FormPaymentStatus.DRAFT);
    const fields = detail.widgets.find((widget) => widget.type === 'detail_fields');
    expect(fields?.type).toBe('detail_fields');
    if (fields?.type !== 'detail_fields') {
      return;
    }
    expect(fields.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'status' }),
        expect.objectContaining({ key: 'totals.amount', format: 'money_minor' }),
        expect.objectContaining({ key: 'currency.client' }),
      ]),
    );
  });

  it('E9: list sort defaults, empty state, create PDF/deal hints', () => {
    const list = builders.buildFormsListScreen();
    const table = list.widgets.find((widget) => widget.type === 'data_table');
    expect(table?.type).toBe('data_table');
    if (table?.type !== 'data_table') {
      return;
    }
    expect(table.defaultSort).toEqual({ key: 'createdAt', direction: 'desc' });
    expect(table.sortableKeys).toEqual(expect.arrayContaining(['status', 'createdAt']));
    expect(table.emptyMessage).toMatch(/Новая заявка/);

    const create = builders.buildFormsCreateScreen();
    expect(create.widgets.some((widget) => widget.id === 'create_pdf_hint')).toBe(true);
    const wizard = create.widgets.find((widget) => widget.type === 'wizard');
    expect(wizard?.type).toBe('wizard');
    if (wizard?.type !== 'wizard') {
      return;
    }
    const documents = wizard.steps.find((step) => step.id === 'documents');
    const invoiceField = documents?.fields.find((field) => field.name === 'invoiceFile');
    expect(invoiceField?.hint).toMatch(/15 Мб/);
    const deal = wizard.steps.find((step) => step.id === 'deal');
    const conditionField = deal?.fields.find((field) => field.name === 'platformPaymentCondition');
    expect(conditionField?.hint).toMatch(/Аванс/);
    const shipmentField = deal?.fields.find((field) => field.name === 'deadlineShipment');
    expect(shipmentField?.hint).toMatch(/отгрузк/);
  });

  it('E9: draft detail shows deal fields hint for User', () => {
    const screen = builders.buildFormsDetailScreen(FormPaymentStatus.DRAFT);
    expect(screen.widgets.some((widget) => widget.id === 'deal_fields_hint')).toBe(true);
    expect(screen.widgets.some((widget) => widget.id === 'draft_hint')).toBe(true);
  });

  it('E10: create wizard loads currencies and orgs from API refs', () => {
    const create = builders.buildFormsCreateScreen();
    const wizard = create.widgets.find((widget) => widget.type === 'wizard');
    expect(wizard?.type).toBe('wizard');
    if (wizard?.type !== 'wizard') {
      return;
    }
    expect(wizard.organizationsDataSource.path).toBe('/organization');
    expect(wizard.currenciesDataSource?.path).toBe('/currency');
    const deal = wizard.steps.find((step) => step.id === 'deal');
    const currencyClient = deal?.fields.find((field) => field.name === 'currencyClient');
    expect(currencyClient?.options).toBeUndefined();
    expect(currencyClient?.hint).toMatch(/currency/i);
    const orgStep = wizard.steps.find((step) => step.id === 'organization');
    expect(orgStep?.description).toMatch(/BDUI Экспорт/);
  });

  it('E11: create wizard exposes inline directory create actions and step panels', () => {
    const create = builders.buildFormsCreateScreen();
    const byId = Object.fromEntries(create.actions.map((action) => [action.id, action]));
    expect(byId[BDUI_ACTION_CREATE_ORGANIZATION]?.method).toBe('POST');
    expect(byId[BDUI_ACTION_CREATE_ORGANIZATION]?.path).toBe('/organization');
    expect(byId[BDUI_ACTION_CREATE_ORGANIZATION]?.inlineCreateKind).toBe('organization');
    expect(byId[BDUI_ACTION_CREATE_ORGANIZATION]?.requiresFormFields?.length).toBeGreaterThan(0);
    expect(byId[BDUI_ACTION_CREATE_COUNTERPARTY]?.method).toBe('POST');
    expect(byId[BDUI_ACTION_CREATE_COUNTERPARTY]?.path).toBe('/counterparty/create');
    expect(byId[BDUI_ACTION_CREATE_COUNTERPARTY]?.inlineCreateKind).toBe('counterparty_foreign');

    const wizard = create.widgets.find((widget) => widget.type === 'wizard');
    expect(wizard?.type).toBe('wizard');
    if (wizard?.type !== 'wizard') {
      return;
    }
    expect(wizard.counterpartiesDataSource?.path).toBe('/counterparty/list');
    expect(wizard.inlineCreates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: 'deal',
          actionId: BDUI_ACTION_CREATE_COUNTERPARTY,
          targetField: 'counterpartyRef',
        }),
        expect.objectContaining({
          stepId: 'organization',
          actionId: BDUI_ACTION_CREATE_ORGANIZATION,
          targetField: 'organization',
        }),
      ]),
    );
    const deal = wizard.steps.find((step) => step.id === 'deal');
    expect(deal?.fields.some((field) => field.fieldType === 'counterparty_select')).toBe(true);
  });

  it('E11: draft detail inline_directory widget links counterparty via SAVE_FORM', () => {
    const screen = builders.buildFormsDetailScreen(FormPaymentStatus.DRAFT);
    const inlineWidget = screen.widgets.find((widget) => widget.type === 'inline_directory');
    expect(inlineWidget?.type).toBe('inline_directory');
    if (inlineWidget?.type !== 'inline_directory') {
      return;
    }
    expect(inlineWidget.createActionId).toBe(BDUI_ACTION_CREATE_COUNTERPARTY);
    expect(inlineWidget.linkActionId).toBe(BDUI_ACTION_SAVE_FORM);
    expect(inlineWidget.linkBodyField).toBe('counterpartyRef');
    expect(screen.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([BDUI_ACTION_CREATE_COUNTERPARTY, BDUI_ACTION_CREATE_ORGANIZATION]),
    );
  });

  it('E14: user list has status filter, counterparty column, and row submit action', () => {
    const list = builders.buildFormsListScreen();
    const table = list.widgets.find((widget) => widget.type === 'data_table');
    expect(table?.type).toBe('data_table');
    if (table?.type !== 'data_table') {
      return;
    }
    expect(table.filters?.some((filter) => filter.field === 'status')).toBe(true);
    expect(table.columns.some((column) => column.key === 'counterparty.name')).toBe(true);
    expect(table.rowActions?.some((item) => item.actionId === BDUI_ACTION_ACCEPT_FORM)).toBe(true);
    expect(list.actions.some((action) => action.id === BDUI_ACTION_ACCEPT_FORM)).toBe(true);
  });
});
