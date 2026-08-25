import { RootCabinetBuilders } from './root-cabinet.builders';
import {
  BDUI_ACTION_ROOT_BLOCK_USER,
  BDUI_ACTION_ROOT_CANCEL_FORM,
  BDUI_ACTION_ROOT_CREATE_USER,
  BDUI_ROLE_ROOT,
} from '../bdui.constants';

describe('RootCabinetBuilders', () => {
  let builders: RootCabinetBuilders;

  beforeEach(() => {
    builders = new RootCabinetBuilders();
  });

  it('E12: login navigates to users.list', () => {
    const screen = builders.buildLoginScreen();
    expect(screen.role).toBe(BDUI_ROLE_ROOT);
    const login = screen.actions.find((action) => action.id === 'login');
    expect(login?.navigateTo).toBe('users.list');
  });

  it('E12: users list maps to GET /admin/account', () => {
    const screen = builders.buildUsersListScreen();
    const table = screen.widgets.find((widget) => widget.type === 'data_table');
    expect(table?.type).toBe('data_table');
    if (table?.type !== 'data_table') {
      return;
    }
    expect(table.dataSource.path).toBe('/admin/account?limit=50');
    expect(table.rowNavigateTo).toBe('users.detail');
  });

  it('E12: users create maps to POST /admin/account', () => {
    const screen = builders.buildUsersCreateScreen();
    const byId = Object.fromEntries(screen.actions.map((action) => [action.id, action]));
    expect(byId[BDUI_ACTION_ROOT_CREATE_USER]?.method).toBe('POST');
    expect(byId[BDUI_ACTION_ROOT_CREATE_USER]?.path).toBe('/admin/account');
  });

  it('E12: users detail block/unblock PATCH /admin/account/{userId}', () => {
    const screen = builders.buildUsersDetailScreen();
    const block = screen.actions.find((action) => action.id === BDUI_ACTION_ROOT_BLOCK_USER);
    expect(block?.staticBody).toEqual({ blocked: true });
    expect(block?.path).toBe('/admin/account/{userId}');
  });

  it('E12: directories list/detail use manager organization API', () => {
    const list = builders.buildDirectoriesListScreen();
    const table = list.widgets.find((widget) => widget.type === 'data_table');
    expect(table?.type).toBe('data_table');
    if (table?.type !== 'data_table') {
      return;
    }
    expect(table.dataSource.path).toBe('/admin/manager/organization?limit=50');
    const detail = builders.buildDirectoriesDetailScreen();
    const fields = detail.widgets.find((widget) => widget.type === 'detail_fields');
    expect(fields?.type).toBe('detail_fields');
    if (fields?.type !== 'detail_fields') {
      return;
    }
    expect(fields.dataSource.path).toBe('/admin/manager/organization/{orgId}');
  });

  it('E12: forms detail exposes manager cancel for root', () => {
    const screen = builders.buildFormsDetailScreen();
    const cancel = screen.actions.find((action) => action.id === BDUI_ACTION_ROOT_CANCEL_FORM);
    expect(cancel?.method).toBe('PUT');
    expect(cancel?.path).toBe('/admin/manager/form-payment/{formId}/cancel');
    expect(cancel?.requiresTextReason).toBe(true);
  });
});
