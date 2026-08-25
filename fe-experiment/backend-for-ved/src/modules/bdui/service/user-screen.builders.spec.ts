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
});
