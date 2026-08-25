import { UserScreenBuilders } from './user-screen.builders';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';
import { BduiUserActionResolver } from './bdui-user-action.resolver';
import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CREATE_FORM,
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
});
