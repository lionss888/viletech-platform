/**
 * Smoke: E14 list management — filters + row actions in schema.
 *
 * Usage (Nest + seed must be up):
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-list-management.js
 */

const DEFAULT_BASE = process.env.BDUI_API_BASE || 'http://127.0.0.1:30000/api/1.0';
const ICO_PASSWORD = process.env.BDUI_LIFECYCLE_PASSWORD || 'BduiLifecycle2024!';
const USER_PASSWORD = process.env.BDUI_USER_PASSWORD || 'BduiUser2024!';

async function request(path, options = {}) {
  const response = await fetch(`${DEFAULT_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: response.status, json, text };
}

async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if ((result.status !== 200 && result.status !== 201) || !result.json?.accessToken) {
    throw new Error(`login ${email} → ${result.status}`);
  }
  return result.json.accessToken;
}

function tableWidget(schema) {
  return schema?.widgets?.find((widget) => widget.type === 'data_table');
}

async function main() {
  console.log(`Smoke E14 list management against ${DEFAULT_BASE}\n`);
  let failed = 0;

  const userToken = await login('user@bdui.local', USER_PASSWORD);
  const userList = await request('/bdui/schema/user/forms.list', { token: userToken });
  const userTable = tableWidget(userList.json);
  if (
    userList.status !== 200 ||
    !userTable?.filters?.length ||
    !userTable.rowActions?.some((item) => item.actionId === 'accept_form') ||
    !userTable.columns?.some((column) => column.key === 'counterparty.name')
  ) {
    console.error('FAIL user forms.list E14 config');
    failed += 1;
  } else {
    console.log('OK user list: filter + counterparty + accept row action');
  }

  const icoToken = await login('ico@bdui.local', ICO_PASSWORD);
  const icoList = await request('/bdui/schema/internal_compliance_officer/forms.list', {
    token: icoToken,
  });
  const icoTable = tableWidget(icoList.json);
  if (
    icoList.status !== 200 ||
    !icoTable?.rowActions?.some((item) => item.actionId === 'ico_form_start')
  ) {
    console.error('FAIL ICO forms.list row action');
    failed += 1;
  } else {
    console.log('OK ICO list: ico_form_start row action');
  }

  const provToken = await login('provider@bdui.local', ICO_PASSWORD);
  const provList = await request('/bdui/schema/provider/forms.list', { token: provToken });
  const provTable = tableWidget(provList.json);
  if (provList.status !== 200 || provTable?.columns?.some((column) => column.key === 'organization.inn')) {
    console.error('FAIL provider list must not expose organization.inn');
    failed += 1;
  } else if (!provTable?.rowActions?.some((item) => item.actionId === 'prov_payment_start')) {
    console.error('FAIL provider row action');
    failed += 1;
  } else {
    console.log('OK provider list: narrow columns + prov_payment_start');
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll E14 list management smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
