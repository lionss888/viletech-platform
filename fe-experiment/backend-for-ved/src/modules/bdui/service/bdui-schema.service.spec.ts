import { NotFoundException } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_ADD_INVOICE,
  BDUI_ACTION_CANCEL_FORM,
  BDUI_ACTION_CREATE_FORM,
  BDUI_ACTION_ECO_START,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_LOGIN,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ACTION_SAVE_FORM,
  BDUI_ROLE_EXTERNAL_CO,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_PROVIDER,
  BDUI_SCHEMA_VERSION,
} from '../bdui.constants';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';
import { BduiSchemaService } from './bdui-schema.service';
import { BduiUserActionResolver } from './bdui-user-action.resolver';
import { RoleCabinetBuilders } from './role-cabinet.builders';
import { UserScreenBuilders } from './user-screen.builders';

describe('BduiSchemaService', () => {
  let service: BduiSchemaService;

  beforeEach(() => {
    const lifecycleResolver = new BduiLifecycleActionResolver();
    const userActionResolver = new BduiUserActionResolver(lifecycleResolver);
    const userBuilders = new UserScreenBuilders(userActionResolver);
    const cabinetBuilders = new RoleCabinetBuilders(lifecycleResolver);
    service = new BduiSchemaService(userBuilders, cabinetBuilders);
  });

  it('builds login screen with login action', () => {
    const actualScreen = service.getUserScreen('login');
    expect(actualScreen.id).toBe('user.login');
    expect(actualScreen.version).toBe(BDUI_SCHEMA_VERSION);
    expect(actualScreen.widgets.some((widget) => widget.type === 'login_form')).toBe(true);
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_LOGIN);
  });

  it('builds forms.list with data_table', () => {
    const actualScreen = service.getUserScreen('forms.list');
    expect(actualScreen.page).toBe('forms.list');
    const table = actualScreen.widgets.find((widget) => widget.type === 'data_table');
    expect(table).toBeDefined();
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toBe('/form-payment');
    }
  });

  it('builds forms.create wizard mapped to create/PATCH/accept', () => {
    const actualScreen = service.getUserScreen('forms.create');
    const actionIds = actualScreen.actions.map((action) => action.id);
    expect(actionIds).toEqual(
      expect.arrayContaining([
        BDUI_ACTION_CREATE_FORM,
        BDUI_ACTION_SAVE_FORM,
        BDUI_ACTION_ADD_INVOICE,
        BDUI_ACTION_ACCEPT_FORM,
      ]),
    );
    const wizard = actualScreen.widgets.find((widget) => widget.type === 'wizard');
    expect(wizard).toBeDefined();
    if (wizard?.type === 'wizard') {
      expect(wizard.steps.map((step) => step.id)).toEqual(['documents', 'deal', 'organization']);
      expect(wizard.createAction).toBe(BDUI_ACTION_CREATE_FORM);
      expect(wizard.saveAction).toBe(BDUI_ACTION_SAVE_FORM);
      expect(wizard.submitAction).toBe(BDUI_ACTION_ACCEPT_FORM);
      const dealFields = wizard.steps.find((step) => step.id === 'deal')?.fields.map((field) => field.name) ?? [];
      expect(dealFields).toEqual(
        expect.arrayContaining([
          'direction',
          'platformPaymentCondition',
          'amount',
          'kind',
          'hsCode',
          'deadlineShipment',
        ]),
      );
    }
  });

  it('builds forms.detail draft hint and accept for draft status', () => {
    const actualScreen = service.getUserScreen('forms.detail', FormPaymentStatus.DRAFT);
    expect(actualScreen.widgets.some((widget) => widget.type === 'text' && widget.id === 'draft_hint')).toBe(
      true,
    );
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_ACCEPT_FORM);
  });

  it('locks org edit hint for User while org under ICO review', () => {
    const actualScreen = service.getUserScreen(
      'forms.detail',
      FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
    );
    expect(actualScreen.widgets.some((widget) => widget.id === 'org_lock_review')).toBe(true);
    expect(actualScreen.actions.map((action) => action.id)).not.toContain(BDUI_ACTION_ICO_START);
  });

  it('builds forms.detail actions from draft status', () => {
    const actualScreen = service.getUserScreen('forms.detail', FormPaymentStatus.DRAFT);
    const actionBar = actualScreen.widgets.find((widget) => widget.type === 'action_bar');
    expect(actionBar).toBeDefined();
    if (actionBar?.type === 'action_bar') {
      expect(actionBar.actions).toEqual([BDUI_ACTION_ACCEPT_FORM, BDUI_ACTION_CANCEL_FORM]);
    }
    expect(actualScreen.actions.map((action) => action.id)).toEqual([
      BDUI_ACTION_ACCEPT_FORM,
      BDUI_ACTION_CANCEL_FORM,
    ]);
  });

  it('builds forms.detail with empty actions when status omitted', () => {
    const actualScreen = service.getUserScreen('forms.detail');
    const actionBar = actualScreen.widgets.find((widget) => widget.type === 'action_bar');
    if (actionBar?.type === 'action_bar') {
      expect(actionBar.actions).toEqual([]);
    }
    expect(actualScreen.actions).toEqual([]);
  });

  it('throws NotFoundException for unknown page', () => {
    expect(() => service.getUserScreen('unknown.page')).toThrow(NotFoundException);
  });

  it('builds manager login via getScreen', () => {
    const actualScreen = service.getScreen(BDUI_ROLE_MANAGER, 'login');
    expect(actualScreen.role).toBe(BDUI_ROLE_MANAGER);
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_LOGIN);
  });

  it('builds internal CO detail actions for org waiting', () => {
    const actualScreen = service.getScreen(
      BDUI_ROLE_INTERNAL_CO,
      'forms.detail',
      FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
    );
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_ICO_START);
  });

  it('builds external CO detail actions for form waiting', () => {
    const actualScreen = service.getScreen(
      BDUI_ROLE_EXTERNAL_CO,
      'forms.detail',
      FormPaymentStatus.FORM_WAITING_VERIFICATION,
    );
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_ECO_START);
  });

  it('builds manager detail actions for form_accepted', () => {
    const actualScreen = service.getScreen(
      BDUI_ROLE_MANAGER,
      'forms.detail',
      FormPaymentStatus.FORM_ACCEPTED,
    );
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_MGR_ORDER_GENERATE);
  });

  it('builds provider list with admin path', () => {
    const actualScreen = service.getScreen(BDUI_ROLE_PROVIDER, 'forms.list');
    const table = actualScreen.widgets.find((widget) => widget.type === 'data_table');
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toContain('/admin/provider/form-payment');
      expect(table.dataSource.path).toContain('payment_processing');
    }
  });

  it('throws for unknown role', () => {
    expect(() => service.getScreen('treasurer', 'login')).toThrow(NotFoundException);
  });
});
