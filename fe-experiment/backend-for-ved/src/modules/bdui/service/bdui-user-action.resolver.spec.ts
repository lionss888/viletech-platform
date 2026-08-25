import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_CORRECTIONS,
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
} from '../bdui.constants';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';
import { BduiUserActionResolver } from './bdui-user-action.resolver';

describe('BduiUserActionResolver', () => {
  let resolver: BduiUserActionResolver;

  beforeEach(() => {
    resolver = new BduiUserActionResolver(new BduiLifecycleActionResolver());
  });

  it('returns empty list when status is missing', () => {
    expect(resolver.resolveActionIds(undefined)).toEqual([]);
  });

  it('allows submit and cancel for draft', () => {
    expect(resolver.resolveActionIds(FormPaymentStatus.DRAFT)).toEqual([
      BDUI_ACTION_ACCEPT_FORM,
      BDUI_ACTION_CANCEL_FORM,
    ]);
  });

  it('allows submit and cancel for creating', () => {
    expect(resolver.resolveActionIds(FormPaymentStatus.CREATING)).toEqual([
      BDUI_ACTION_ACCEPT_FORM,
      BDUI_ACTION_CANCEL_FORM,
    ]);
  });

  it('allows corrections resubmit and cancel for form_waiting_corrections', () => {
    expect(resolver.resolveActionIds(FormPaymentStatus.FORM_WAITING_CORRECTIONS)).toEqual([
      BDUI_ACTION_ACCEPT_CORRECTIONS,
      BDUI_ACTION_CANCEL_FORM,
    ]);
  });

  it('allows cancel while waiting verification', () => {
    expect(resolver.resolveActionIds(FormPaymentStatus.FORM_WAITING_VERIFICATION)).toEqual([
      BDUI_ACTION_CANCEL_FORM,
    ]);
  });

  it('returns no actions for completed', () => {
    expect(resolver.resolveActionIds(FormPaymentStatus.COMPLETED)).toEqual([]);
  });
});
