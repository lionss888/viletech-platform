import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_CORRECTIONS,
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_CANCEL_FORM,
  BDUI_ACTION_ECO_ACCEPT,
  BDUI_ACTION_ECO_START,
  BDUI_ACTION_ICO_ACCEPT,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_MGR_ASSIGN_PROVIDER,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ACTION_MGR_ORDER_REJECT,
  BDUI_ACTION_MGR_ORDER_START,
  BDUI_ACTION_MGR_PAYMENT_RECEIVED,
  BDUI_ACTION_MGR_PAYMENT_START,
  BDUI_ACTION_PROV_ATTACH_PROOF,
  BDUI_ACTION_PROV_PAYMENT_RETURN,
  BDUI_ACTION_PROV_PAYMENT_START,
  BDUI_ACTION_PROV_PAYMENT_SENT,
  BDUI_ROLE_EXTERNAL_CO,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_PROVIDER,
  BDUI_ROLE_USER,
} from '../bdui.constants';
import { resolveLifecycleActionIds } from './lifecycle-action.matrix';

describe('resolveLifecycleActionIds', () => {
  describe('User', () => {
    it('allows submit and cancel for draft', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.DRAFT)).toEqual([
        BDUI_ACTION_ACCEPT_FORM,
        BDUI_ACTION_CANCEL_FORM,
      ]);
    });

    it('allows corrections resubmit for form_waiting_corrections', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.FORM_WAITING_CORRECTIONS)).toEqual([
        BDUI_ACTION_ACCEPT_CORRECTIONS,
        BDUI_ACTION_CANCEL_FORM,
      ]);
    });

    it('returns empty for completed', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.COMPLETED)).toEqual([]);
    });
  });

  describe('Internal CO', () => {
    it('allows start on organization_waiting_verification', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_INTERNAL_CO, FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION),
      ).toEqual([BDUI_ACTION_ICO_START]);
    });

    it('allows accept on organization_verification', () => {
      const actualIds = resolveLifecycleActionIds(
        BDUI_ROLE_INTERNAL_CO,
        FormPaymentStatus.ORGANIZATION_VERIFICATION,
      );
      expect(actualIds).toContain(BDUI_ACTION_ICO_ACCEPT);
    });

    it('does not expose User submit on org verification', () => {
      const actualIds = resolveLifecycleActionIds(
        BDUI_ROLE_INTERNAL_CO,
        FormPaymentStatus.ORGANIZATION_VERIFICATION,
      );
      expect(actualIds).not.toContain(BDUI_ACTION_ACCEPT_FORM);
    });
  });

  describe('External CO', () => {
    it('allows start on form_waiting_verification', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_EXTERNAL_CO, FormPaymentStatus.FORM_WAITING_VERIFICATION),
      ).toEqual([BDUI_ACTION_ECO_START]);
    });

    it('allows accept on form_verification', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_EXTERNAL_CO, FormPaymentStatus.FORM_VERIFICATION),
      ).toContain(BDUI_ACTION_ECO_ACCEPT);
    });
  });

  describe('Manager', () => {
    it('allows order generate on form_accepted', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.FORM_ACCEPTED)).toContain(
        BDUI_ACTION_MGR_ORDER_GENERATE,
      );
    });

    it('allows assign provider and payment start on signing_order_accepted', () => {
      const actualIds = resolveLifecycleActionIds(
        BDUI_ROLE_MANAGER,
        FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
      );
      expect(actualIds).toEqual(
        expect.arrayContaining([
          BDUI_ACTION_MGR_ASSIGN_PROVIDER,
          BDUI_ACTION_MGR_PAYMENT_RECEIVED,
          BDUI_ACTION_MGR_PAYMENT_START,
        ]),
      );
    });

    it('allows order reject on signing_order_verification', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.SIGNING_ORDER_VERIFICATION),
      ).toContain(BDUI_ACTION_MGR_ORDER_REJECT);
    });

    it('allows order start on signing_order_waiting_verification', () => {
      expect(
        resolveLifecycleActionIds(
          BDUI_ROLE_MANAGER,
          FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
        ),
      ).toEqual([BDUI_ACTION_MGR_ORDER_START]);
    });

    it('does not allow ECO accept on form_accepted', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.FORM_ACCEPTED)).not.toContain(
        BDUI_ACTION_ECO_ACCEPT,
      );
    });
  });

  describe('Provider', () => {
    it('allows start on payment_received', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_PROVIDER, FormPaymentStatus.PAYMENT_RECEIVED)).toContain(
        BDUI_ACTION_PROV_PAYMENT_START,
      );
    });

    it('allows execute and proof attach on payment_processing', () => {
      const actualIds = resolveLifecycleActionIds(
        BDUI_ROLE_PROVIDER,
        FormPaymentStatus.PAYMENT_PROCESSING,
      );
      expect(actualIds).toEqual(
        expect.arrayContaining([
          BDUI_ACTION_PROV_ATTACH_PROOF,
          BDUI_ACTION_PROV_PAYMENT_SENT,
          BDUI_ACTION_PROV_PAYMENT_RETURN,
        ]),
      );
    });

    it('allows execute on payment_processing', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_PROVIDER, FormPaymentStatus.PAYMENT_PROCESSING)).toContain(
        BDUI_ACTION_PROV_PAYMENT_SENT,
      );
    });

    it('does not allow Manager completed on payment_processing', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_PROVIDER, FormPaymentStatus.PAYMENT_PROCESSING)).not.toContain(
        'mgr_completed',
      );
    });
  });

  describe('cross-role isolation', () => {
    it('User never gets ICO start', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION),
      ).not.toContain(BDUI_ACTION_ICO_START);
    });

    it('returns empty when status is missing', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, undefined)).toEqual([]);
    });
  });
});
