import { NotFoundException } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
  BDUI_ACTION_CREATE_FORM,
  BDUI_ACTION_LOGIN,
  BDUI_SCHEMA_VERSION,
} from '../bdui.constants';
import { BduiSchemaService } from './bdui-schema.service';
import { BduiUserActionResolver } from './bdui-user-action.resolver';
import { UserScreenBuilders } from './user-screen.builders';

describe('BduiSchemaService', () => {
  let service: BduiSchemaService;

  beforeEach(() => {
    const actionResolver = new BduiUserActionResolver();
    const builders = new UserScreenBuilders(actionResolver);
    service = new BduiSchemaService(builders);
  });

  it('builds login screen with login action', () => {
    const actualScreen = service.getUserScreen('login');
    expect(actualScreen.id).toBe('user.login');
    expect(actualScreen.version).toBe(BDUI_SCHEMA_VERSION);
    expect(actualScreen.widgets.some((widget) => widget.type === 'login_form')).toBe(true);
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_LOGIN);
  });

  it('builds forms.list with data_table and create CTA', () => {
    const actualScreen = service.getUserScreen('forms.list');
    expect(actualScreen.page).toBe('forms.list');
    const table = actualScreen.widgets.find((widget) => widget.type === 'data_table');
    expect(table).toBeDefined();
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toBe('/form-payment');
    }
  });

  it('builds forms.create with create_form action', () => {
    const actualScreen = service.getUserScreen('forms.create');
    expect(actualScreen.actions.map((action) => action.id)).toContain(BDUI_ACTION_CREATE_FORM);
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
});
