import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ICO_ACCEPT,
  BDUI_ACTION_ICO_CANCEL,
  BDUI_ACTION_ICO_REJECT,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_ICO_STOP,
  BDUI_ACTION_ECO_ACCEPT,
  BDUI_ACTION_ECO_CANCEL,
  BDUI_ACTION_ECO_REJECT,
  BDUI_ACTION_ECO_START,
  BDUI_ACTION_ECO_STOP,
  BDUI_ACTION_MGR_ASSIGN_PROVIDER,
  BDUI_ACTION_MGR_COMPLETED,
  BDUI_ACTION_MGR_CONTRACT_ATTACH,
  BDUI_ACTION_MGR_ORDER_ADVANCE_SIGNING,
  BDUI_ACTION_MGR_ORDER_ATTACH,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ACTION_MGR_ORDER_REJECT,
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
  BDUI_ACTION_PROV_PAYMENT_SENT,
  BDUI_ACTION_PROV_PAYMENT_START,
  BDUI_ACTION_UPLOAD_REPORT,
  BDUI_ACTION_UPLOAD_SHIPMENT,
  BDUI_ROLE_EXTERNAL_CO,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_PROVIDER,
  BDUI_ROLE_USER,
  BDUI_SEED_PROVIDER_ACCOUNT_ID,
} from '../bdui.constants';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';
import { RoleCabinetBuilders } from './role-cabinet.builders';
import { UserScreenBuilders } from './user-screen.builders';
import { BduiUserActionResolver } from './bdui-user-action.resolver';

describe('RoleCabinetBuilders Internal CO', () => {
  let builders: RoleCabinetBuilders;
  let resolver: BduiLifecycleActionResolver;

  beforeEach(() => {
    resolver = new BduiLifecycleActionResolver();
    builders = new RoleCabinetBuilders(resolver);
  });

  it('builds ICO queue list filtered to org statuses', () => {
    const screen = builders.buildFormsListScreen(BDUI_ROLE_INTERNAL_CO);
    expect(screen.title).toContain('Internal CO');
    const table = screen.widgets.find((widget) => widget.type === 'data_table');
    expect(table).toBeDefined();
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toContain('/admin/internal-compliance-officer/form-payment');
      expect(table.dataSource.path).toContain('organization_waiting_verification');
      expect(table.dataSource.path).toContain('organization_verification');
    }
  });

  it('builds ICO detail action bar for waiting status', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_INTERNAL_CO,
      FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
    );
    expect(screen.actions.map((action) => action.id)).toEqual([BDUI_ACTION_ICO_START]);
    expect(screen.widgets.some((widget) => widget.id === 'ico_hint_start')).toBe(true);
  });

  it('builds ICO detail decide actions for verification status', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_INTERNAL_CO,
      FormPaymentStatus.ORGANIZATION_VERIFICATION,
    );
    const ids = screen.actions.map((action) => action.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        BDUI_ACTION_ICO_ACCEPT,
        BDUI_ACTION_ICO_REJECT,
        BDUI_ACTION_ICO_STOP,
        BDUI_ACTION_ICO_CANCEL,
      ]),
    );
    const accept = screen.actions.find((action) => action.id === BDUI_ACTION_ICO_ACCEPT);
    expect(accept?.approveOrganizationFirst).toBe(true);
    const reject = screen.actions.find((action) => action.id === BDUI_ACTION_ICO_REJECT);
    expect(reject?.requiresTextReason).toBe(true);
  });

  it('does not expose ICO actions on User or Manager for org waiting', () => {
    const userActions = resolver.resolveActionIds(
      BDUI_ROLE_USER,
      FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
    );
    const managerActions = resolver.resolveActionIds(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION,
    );
    expect(userActions).not.toContain(BDUI_ACTION_ICO_START);
    expect(managerActions).not.toContain(BDUI_ACTION_ICO_START);
    expect(managerActions).not.toContain(BDUI_ACTION_MGR_ORDER_GENERATE);
  });

  it('builds ECO queue filtered to form verification statuses', () => {
    const screen = builders.buildFormsListScreen(BDUI_ROLE_EXTERNAL_CO);
    expect(screen.title).toContain('External CO');
    const table = screen.widgets.find((widget) => widget.type === 'data_table');
    expect(table).toBeDefined();
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toContain('/admin/compliance-officer/form-payment');
      expect(table.dataSource.path).toContain('form_waiting_verification');
      expect(table.dataSource.path).toContain('form_verification');
    }
  });

  it('builds ECO detail actions for form verification', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_EXTERNAL_CO,
      FormPaymentStatus.FORM_VERIFICATION,
    );
    const ids = screen.actions.map((action) => action.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        BDUI_ACTION_ECO_ACCEPT,
        BDUI_ACTION_ECO_REJECT,
        BDUI_ACTION_ECO_STOP,
        BDUI_ACTION_ECO_CANCEL,
      ]),
    );
    const reject = screen.actions.find((action) => action.id === BDUI_ACTION_ECO_REJECT);
    expect(reject?.requiresTextReason).toBe(true);
  });

  it('does not expose ECO actions on User for form waiting', () => {
    const userActions = resolver.resolveActionIds(
      BDUI_ROLE_USER,
      FormPaymentStatus.FORM_WAITING_VERIFICATION,
    );
    expect(userActions).not.toContain(BDUI_ACTION_ECO_START);
    expect(userActions).not.toContain(BDUI_ACTION_ECO_ACCEPT);
  });

  it('builds Manager active list filtered to happy-path statuses', () => {
    const screen = builders.buildFormsListScreen(BDUI_ROLE_MANAGER);
    expect(screen.title).toContain('Manager');
    const table = screen.widgets.find((widget) => widget.type === 'data_table');
    expect(table).toBeDefined();
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toContain('/admin/manager/form-payment');
      expect(table.dataSource.path).toContain('form_accepted');
      expect(table.dataSource.path).toContain('signing_order_accepted');
      expect(table.dataSource.path).toContain('payment_processing');
      expect(table.dataSource.path).toContain('payment_sent');
      expect(table.dataSource.path).toContain('report_waiting_verification');
      expect(table.dataSource.path).toContain('shipment_verification');
    }
  });

  it('builds Manager detail actions for form_accepted', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.FORM_ACCEPTED,
    );
    const ids = screen.actions.map((action) => action.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        BDUI_ACTION_MGR_ORDER_GENERATE,
        BDUI_ACTION_MGR_ORDER_ATTACH,
        BDUI_ACTION_MGR_ASSIGN_PROVIDER,
      ]),
    );
    const generate = screen.actions.find((action) => action.id === BDUI_ACTION_MGR_ORDER_GENERATE);
    expect(generate?.staticBody).toMatchObject({ isAdvance: false });
    const attach = screen.actions.find((action) => action.id === BDUI_ACTION_MGR_ORDER_ATTACH);
    expect(attach?.injectSigningOrderDate).toBe(true);
  });

  it('builds Manager payment actions and assign provider on signing_order_accepted', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    );
    const ids = screen.actions.map((action) => action.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        BDUI_ACTION_MGR_ASSIGN_PROVIDER,
        BDUI_ACTION_MGR_PAYMENT_RECEIVED,
        BDUI_ACTION_MGR_PAYMENT_START,
      ]),
    );
    expect(ids).not.toContain(BDUI_ACTION_PROV_PAYMENT_START);
    const rejectScreen = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.SIGNING_ORDER_VERIFICATION,
    );
    const reject = rejectScreen.actions.find((action) => action.id === BDUI_ACTION_MGR_ORDER_REJECT);
    expect(reject?.requiresTextReason).toBe(true);
  });

  it('builds Manager closing actions for report and shipment', () => {
    const paymentSent = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.PAYMENT_SENT,
    );
    expect(paymentSent.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([BDUI_ACTION_MGR_REPORT_SIGNING, BDUI_ACTION_MGR_ORDER_ADVANCE_SIGNING]),
    );
    expect(paymentSent.widgets.some((widget) => widget.id === 'mgr_hint_report_signing')).toBe(true);
    const reportWaiting = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.REPORT_WAITING_VERIFICATION,
    );
    expect(reportWaiting.actions.map((action) => action.id)).toEqual([BDUI_ACTION_MGR_REPORT_START]);
    const reportReview = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.REPORT_VERIFICATION,
    );
    expect(reportReview.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([BDUI_ACTION_MGR_REPORT_ACCEPT, BDUI_ACTION_MGR_REPORT_REJECT]),
    );
    const shipmentWaiting = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION,
    );
    expect(shipmentWaiting.actions.map((action) => action.id)).toEqual([BDUI_ACTION_MGR_SHIPMENT_START]);
    const shipmentReview = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.SHIPMENT_VERIFICATION,
    );
    const shipmentIds = shipmentReview.actions.map((action) => action.id);
    expect(shipmentIds).toEqual(
      expect.arrayContaining([BDUI_ACTION_MGR_SHIPMENT_ACCEPT, BDUI_ACTION_MGR_COMPLETED]),
    );
  });

  it('exposes Manager contract attach on contract_waiting', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.CONTRACT_WAITING,
    );
    expect(screen.actions.map((action) => action.id)).toContain(BDUI_ACTION_MGR_CONTRACT_ATTACH);
    const attach = screen.actions.find((action) => action.id === BDUI_ACTION_MGR_CONTRACT_ATTACH);
    expect(attach?.requiresFileUpload).toMatchObject({ bodyField: 'file' });
    expect(attach?.requiresContractMeta).toBe(true);
    expect(attach?.staticBody).not.toHaveProperty('file');
    expect(screen.widgets.some((widget) => widget.id === 'mgr_hint_contract')).toBe(true);
  });

  it('prefills seed Provider id on assign CTA', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_MANAGER,
      FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    );
    const assign = screen.actions.find((action) => action.id === BDUI_ACTION_MGR_ASSIGN_PROVIDER);
    expect(assign?.defaultProviderId).toBe(BDUI_SEED_PROVIDER_ACCOUNT_ID);
  });

  it('exposes no Manager mutate CTA on completed', () => {
    const screen = builders.buildFormsDetailScreen(BDUI_ROLE_MANAGER, FormPaymentStatus.COMPLETED);
    expect(screen.actions).toEqual([]);
  });

  it('does not expose Manager order actions on Provider for form_accepted', () => {
    const providerActions = resolver.resolveActionIds(
      BDUI_ROLE_PROVIDER,
      FormPaymentStatus.FORM_ACCEPTED,
    );
    expect(providerActions).not.toContain(BDUI_ACTION_MGR_ORDER_GENERATE);
    expect(providerActions).not.toContain(BDUI_ACTION_MGR_PAYMENT_START);
  });

  it('builds Provider queue filtered to execution statuses', () => {
    const screen = builders.buildFormsListScreen(BDUI_ROLE_PROVIDER);
    expect(screen.title).toContain('Provider');
    const table = screen.widgets.find((widget) => widget.type === 'data_table');
    expect(table).toBeDefined();
    if (table?.type === 'data_table') {
      expect(table.dataSource.path).toContain('/admin/provider/form-payment');
      expect(table.dataSource.path).toContain('payment_processing');
    }
  });

  it('builds Provider detail execute actions for payment_processing', () => {
    const screen = builders.buildFormsDetailScreen(
      BDUI_ROLE_PROVIDER,
      FormPaymentStatus.PAYMENT_PROCESSING,
    );
    const ids = screen.actions.map((action) => action.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        BDUI_ACTION_PROV_ATTACH_PROOF,
        BDUI_ACTION_PROV_PAYMENT_SENT,
        BDUI_ACTION_PROV_PAYMENT_RETURN,
      ]),
    );
    const ret = screen.actions.find((action) => action.id === BDUI_ACTION_PROV_PAYMENT_RETURN);
    expect(ret?.requiresTextReason).toBe(true);
  });

  it('exposes no Provider execute CTA on manager_checking', () => {
    const actions = resolver.resolveActionIds(BDUI_ROLE_PROVIDER, FormPaymentStatus.MANAGER_CHECKING);
    expect(actions).toEqual([]);
    expect(actions).not.toContain(BDUI_ACTION_PROV_PAYMENT_SENT);
  });

  it('builds User closing detail with file upload actions', () => {
    const userBuilders = new UserScreenBuilders(new BduiUserActionResolver(resolver));
    const reportScreen = userBuilders.buildFormsDetailScreen(FormPaymentStatus.REPORT_WAITING);
    expect(reportScreen.actions.map((action) => action.id)).toEqual([BDUI_ACTION_UPLOAD_REPORT]);
    const reportAction = reportScreen.actions.find((action) => action.id === BDUI_ACTION_UPLOAD_REPORT);
    expect(reportAction?.requiresFileUpload).toMatchObject({
      bodyField: 'reportSigned',
      uploadPath: '/file-store/upload/pdf',
    });
    expect(reportAction?.staticBody).toBeUndefined();
    expect(reportScreen.widgets.some((widget) => widget.id === 'report_hint')).toBe(true);
    const shipmentScreen = userBuilders.buildFormsDetailScreen(FormPaymentStatus.SHIPMENT_WAITING);
    expect(shipmentScreen.actions.map((action) => action.id)).toEqual([BDUI_ACTION_UPLOAD_SHIPMENT]);
    const shipmentAction = shipmentScreen.actions.find(
      (action) => action.id === BDUI_ACTION_UPLOAD_SHIPMENT,
    );
    expect(shipmentAction?.path).toContain('/shipment/accept');
    expect(shipmentAction?.requiresFileUpload).toMatchObject({
      bodyField: 'addClosing',
      asArray: true,
    });
    expect(shipmentAction?.staticBody).toBeUndefined();
    const completedScreen = userBuilders.buildFormsDetailScreen(FormPaymentStatus.COMPLETED);
    expect(completedScreen.actions).toEqual([]);
    expect(completedScreen.widgets.some((widget) => widget.id === 'completed_hint')).toBe(true);
    const canceledScreen = userBuilders.buildFormsDetailScreen(FormPaymentStatus.CANCELED_BY_USER);
    expect(canceledScreen.actions).toEqual([]);
    expect(canceledScreen.widgets.some((widget) => widget.id === 'user_canceled_hint')).toBe(true);
    const cancelAction = userBuilders
      .buildFormsDetailScreen(FormPaymentStatus.DRAFT)
      .actions.find((action) => action.id === 'cancel_form');
    expect(cancelAction?.requiresTextReason).toBe(true);
  });

  it('maps Manager list/detail amount to totals.amount with money_minor', () => {
    const list = builders.buildFormsListScreen(BDUI_ROLE_MANAGER);
    const table = list.widgets.find((widget) => widget.type === 'data_table');
    expect(table?.type).toBe('data_table');
    if (table?.type === 'data_table') {
      expect(table.columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'status' }),
          expect.objectContaining({ key: 'totals.amount', format: 'money_minor' }),
        ]),
      );
    }
    const detail = builders.buildFormsDetailScreen(BDUI_ROLE_MANAGER, FormPaymentStatus.FORM_ACCEPTED);
    const fields = detail.widgets.find((widget) => widget.type === 'detail_fields');
    expect(fields?.type).toBe('detail_fields');
    if (fields?.type === 'detail_fields') {
      expect(fields.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'status' }),
          expect.objectContaining({ key: 'totals.amount', format: 'money_minor' }),
          expect.objectContaining({ key: 'currency.client' }),
        ]),
      );
    }
  });

  it('E9: staff queues default sort and empty messages', () => {
    const icoList = builders.buildFormsListScreen(BDUI_ROLE_INTERNAL_CO);
    const icoTable = icoList.widgets.find((widget) => widget.type === 'data_table');
    expect(icoTable?.type).toBe('data_table');
    if (icoTable?.type !== 'data_table') {
      return;
    }
    expect(icoTable.defaultSort).toEqual({ key: 'updateDate', direction: 'desc' });
    expect(icoTable.sortableKeys).toEqual(expect.arrayContaining(['status', 'updateDate']));
    expect(icoTable.emptyMessage).toMatch(/пуста/);

    const ecoList = builders.buildFormsListScreen(BDUI_ROLE_EXTERNAL_CO);
    const ecoTable = ecoList.widgets.find((widget) => widget.type === 'data_table');
    expect(ecoTable?.type).toBe('data_table');
    if (ecoTable?.type !== 'data_table') {
      return;
    }
    expect(ecoTable.defaultSort).toEqual({ key: 'status', direction: 'asc' });

    const mgrList = builders.buildFormsListScreen(BDUI_ROLE_MANAGER);
    const mgrTable = mgrList.widgets.find((widget) => widget.type === 'data_table');
    expect(mgrTable?.type).toBe('data_table');
    if (mgrTable?.type !== 'data_table') {
      return;
    }
    expect(mgrTable.columns.some((column) => column.key === 'updateDate')).toBe(true);
    expect(mgrTable.defaultSort?.key).toBe('updateDate');
  });
});
