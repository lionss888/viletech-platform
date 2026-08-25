import { BduiUserActionResolver } from './bdui-user-action.resolver';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_CORRECTIONS,
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
} from '../bdui.constants';

describe('BduiUserActionResolver', () => {
  let resolver: BduiUserActionResolver;

  beforeEach(() => {
    resolver = new BduiUserActionResolver();
  });

  it('returns empty list when status is missing', () => {
    const actualIds = resolver.resolveActionIds(undefined);
    expect(actualIds).toEqual([]);
  });

  it('allows submit and cancel for draft', () => {
    const actualIds = resolver.resolveActionIds(FormPaymentStatus.DRAFT);
    expect(actualIds).toEqual([BDUI_ACTION_ACCEPT_FORM, BDUI_ACTION_CANCEL_FORM]);
  });

  it('allows submit and cancel for creating', () => {
    const actualIds = resolver.resolveActionIds(FormPaymentStatus.CREATING);
    expect(actualIds).toEqual([BDUI_ACTION_ACCEPT_FORM, BDUI_ACTION_CANCEL_FORM]);
  });

  it('allows corrections resubmit and cancel for form_waiting_corrections', () => {
    const actualIds = resolver.resolveActionIds(FormPaymentStatus.FORM_WAITING_CORRECTIONS);
    expect(actualIds).toEqual([BDUI_ACTION_ACCEPT_CORRECTIONS, BDUI_ACTION_CANCEL_FORM]);
  });

  it('allows cancel while waiting verification', () => {
    const actualIds = resolver.resolveActionIds(FormPaymentStatus.FORM_WAITING_VERIFICATION);
    expect(actualIds).toEqual([BDUI_ACTION_CANCEL_FORM]);
  });

  it('returns no actions for completed', () => {
    const actualIds = resolver.resolveActionIds(FormPaymentStatus.COMPLETED);
    expect(actualIds).toEqual([]);
  });
});
