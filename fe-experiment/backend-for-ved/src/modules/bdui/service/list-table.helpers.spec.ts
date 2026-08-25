import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_ECO_START,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_MGR_ORDER_START,
  BDUI_ACTION_PROV_PAYMENT_START,
  BDUI_ROLE_EXTERNAL_CO,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_PROVIDER,
  BDUI_ROLE_USER,
} from '../bdui.constants';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  enrichFormListTable,
  listRowActionsForRole,
  listStatusFilterForRole,
} from './list-table.helpers';

describe('list-table.helpers', () => {
  it('E14: user list has status filter and submit row action', () => {
    const filter = listStatusFilterForRole(BDUI_ROLE_USER);
    expect(filter?.field).toBe('status');
    expect(filter?.options.some((option) => option.value === FormPaymentStatus.DRAFT)).toBe(true);
    const rowActions = listRowActionsForRole(BDUI_ROLE_USER);
    expect(rowActions[0]?.actionId).toBe(BDUI_ACTION_ACCEPT_FORM);
  });

  it('E14: staff roles expose start actions from matrix', () => {
    expect(listRowActionsForRole(BDUI_ROLE_INTERNAL_CO)[0]?.actionId).toBe(BDUI_ACTION_ICO_START);
    expect(listRowActionsForRole(BDUI_ROLE_EXTERNAL_CO)[0]?.actionId).toBe(BDUI_ACTION_ECO_START);
    expect(listRowActionsForRole(BDUI_ROLE_MANAGER)[0]?.actionId).toBe(BDUI_ACTION_MGR_ORDER_START);
    expect(listRowActionsForRole(BDUI_ROLE_PROVIDER)[0]?.actionId).toBe(BDUI_ACTION_PROV_PAYMENT_START);
  });

  it('E14: enrichFormListTable attaches filters and catalog actions', () => {
    const base = {
      type: 'data_table' as const,
      id: 't',
      dataSource: { method: 'GET' as const, path: '/form-payment' },
      columns: [{ key: 'status', label: 'Статус' }],
    };
    const enriched = enrichFormListTable(base, BDUI_ROLE_INTERNAL_CO);
    expect(enriched.table.filters?.length).toBe(1);
    expect(enriched.table.rowActions?.length).toBe(1);
    expect(enriched.listActions[0]?.path).toContain('{formId}');
  });
});
