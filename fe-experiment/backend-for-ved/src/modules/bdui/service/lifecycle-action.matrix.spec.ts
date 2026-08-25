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
  BDUI_ACTION_MGR_CANCEL,
  BDUI_ACTION_MGR_COMPLETED,
  BDUI_ACTION_MGR_CONTRACT_ATTACH,
  BDUI_ACTION_MGR_FORM_REJECT,
  BDUI_ACTION_MGR_ORDER_ADVANCE_SIGNING,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ACTION_MGR_ORDER_REJECT,
  BDUI_ACTION_MGR_ORDER_START,
  BDUI_ACTION_MGR_PAYMENT_RECEIVED,
  BDUI_ACTION_MGR_PAYMENT_START,
  BDUI_ACTION_MGR_REPORT_ACCEPT,
  BDUI_ACTION_MGR_REPORT_REJECT,
  BDUI_ACTION_MGR_REPORT_SIGNING,
  BDUI_ACTION_MGR_REPORT_START,
  BDUI_ACTION_MGR_SHIPMENT_ACCEPT,
  BDUI_ACTION_MGR_SHIPMENT_START,
  BDUI_ACTION_PROV_ATTACH_PROOF,
  BDUI_ACTION_PROV_PAYMENT_RETURN,
  BDUI_ACTION_PROV_PAYMENT_START,
  BDUI_ACTION_PROV_PAYMENT_SENT,
  BDUI_ACTION_UPLOAD_ORDER,
  BDUI_ACTION_UPLOAD_ORDER_ADVANCE,
  BDUI_ACTION_UPLOAD_PAYMENTS,
  BDUI_ACTION_UPLOAD_REPORT,
  BDUI_ACTION_UPLOAD_SHIPMENT,
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

    it('allows upload_order on signing_order', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.SIGNING_ORDER)).toEqual([
        BDUI_ACTION_UPLOAD_ORDER,
      ]);
    });

    it('allows upload_order_advance on advance_signing_order', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.ADVANCE_SIGNING_ORDER)).toEqual([
        BDUI_ACTION_UPLOAD_ORDER_ADVANCE,
      ]);
    });

    it('allows upload_payments on signing_order_accepted', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.SIGNING_ORDER_ACCEPTED)).toEqual([
        BDUI_ACTION_UPLOAD_PAYMENTS,
      ]);
    });

    it('allows upload_report on report_waiting', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.REPORT_WAITING)).toEqual([
        BDUI_ACTION_UPLOAD_REPORT,
      ]);
    });

    it('allows upload_shipment on shipment_waiting', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.SHIPMENT_WAITING)).toEqual([
        BDUI_ACTION_UPLOAD_SHIPMENT,
      ]);
    });

    it('returns empty for completed and canceled statuses', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.COMPLETED)).toEqual([]);
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.CANCELED_BY_USER)).toEqual([]);
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER)).toEqual(
        [],
      );
      expect(resolveLifecycleActionIds(BDUI_ROLE_USER, FormPaymentStatus.CANCELED_BY_MANAGER)).toEqual([]);
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

    it('returns empty on canceled_by_compliance_officer', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_EXTERNAL_CO, FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER),
      ).toEqual([]);
    });
  });

  describe('Manager', () => {
    it('allows order generate on form_accepted', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.FORM_ACCEPTED)).toContain(
        BDUI_ACTION_MGR_ORDER_GENERATE,
      );
    });

    it('allows form reject and cancel on form_accepted', () => {
      const actualIds = resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.FORM_ACCEPTED);
      expect(actualIds).toEqual(
        expect.arrayContaining([BDUI_ACTION_MGR_FORM_REJECT, BDUI_ACTION_MGR_CANCEL]),
      );
    });

    it('allows contract attach on contract_waiting', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.CONTRACT_WAITING)).toContain(
        BDUI_ACTION_MGR_CONTRACT_ATTACH,
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

    it('allows report and advance-order actions on payment_sent', () => {
      const actualIds = resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.PAYMENT_SENT);
      expect(actualIds).toEqual(
        expect.arrayContaining([
          BDUI_ACTION_MGR_REPORT_SIGNING,
          BDUI_ACTION_MGR_ORDER_ADVANCE_SIGNING,
          BDUI_ACTION_MGR_PAYMENT_RECEIVED,
        ]),
      );
    });

    it('allows report signing on payment_received for postpay', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.PAYMENT_RECEIVED)).toContain(
        BDUI_ACTION_MGR_REPORT_SIGNING,
      );
    });

    it('allows report start on report_waiting_verification', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.REPORT_WAITING_VERIFICATION),
      ).toEqual([BDUI_ACTION_MGR_REPORT_START]);
    });

    it('allows report accept and reject on report_verification', () => {
      const actualIds = resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.REPORT_VERIFICATION);
      expect(actualIds).toEqual(
        expect.arrayContaining([BDUI_ACTION_MGR_REPORT_ACCEPT, BDUI_ACTION_MGR_REPORT_REJECT]),
      );
    });

    it('allows shipment start on shipment_waiting_verification', () => {
      expect(
        resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION),
      ).toEqual([BDUI_ACTION_MGR_SHIPMENT_START]);
    });

    it('allows shipment accept and completed on shipment_verification', () => {
      const actualIds = resolveLifecycleActionIds(
        BDUI_ROLE_MANAGER,
        FormPaymentStatus.SHIPMENT_VERIFICATION,
      );
      expect(actualIds).toEqual(
        expect.arrayContaining([BDUI_ACTION_MGR_SHIPMENT_ACCEPT, BDUI_ACTION_MGR_COMPLETED]),
      );
    });

    it('returns empty for completed', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_MANAGER, FormPaymentStatus.COMPLETED)).toEqual([]);
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

    it('returns empty for completed', () => {
      expect(resolveLifecycleActionIds(BDUI_ROLE_PROVIDER, FormPaymentStatus.COMPLETED)).toEqual([]);
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
