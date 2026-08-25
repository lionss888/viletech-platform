import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ICO_ACCEPT,
  BDUI_ACTION_ICO_CANCEL,
  BDUI_ACTION_ICO_REJECT,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_ICO_STOP,
  BDUI_ACTION_MGR_ORDER_GENERATE,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_USER,
} from '../bdui.constants';
import { BduiLifecycleActionResolver } from './bdui-lifecycle-action.resolver';
import { RoleCabinetBuilders } from './role-cabinet.builders';

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
});
