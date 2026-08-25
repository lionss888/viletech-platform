/**
 * Smoke: E13 bulk actions schema + AuthZ (root only).
 *
 * Usage (Nest + seed must be up):
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-bulk.js
 */

const DEFAULT_BASE = process.env.BDUI_API_BASE || 'http://127.0.0.1:30000/api/1.0';
const ROOT_PASSWORD = process.env.BDUI_ROOT_PASSWORD || process.env.BDUI_LIFECYCLE_PASSWORD || 'BduiLifecycle2024!';
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
  console.log(`Smoke E13 bulk against ${DEFAULT_BASE}\n`);
  let failed = 0;

  let rootToken;
  try {
    rootToken = await login('root@bdui.local', ROOT_PASSWORD);
    console.log('OK root login');
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    process.exit(1);
  }

  const rootUsers = await request('/bdui/schema/root/users.list', { token: rootToken });
  const rootForms = await request('/bdui/schema/root/forms.list', { token: rootToken });
  const usersTable = tableWidget(rootUsers.json);
  const formsTable = tableWidget(rootForms.json);

  if (
    rootUsers.status !== 200 ||
    !usersTable?.selectable ||
    !usersTable.bulkActions?.some((item) => item.actionId === 'root_block_user')
  ) {
    console.error('FAIL root users.list bulk config');
    failed += 1;
  } else {
    console.log(`OK root users bulk (${usersTable.bulkActions.length} actions, max ${usersTable.bulkMaxSelection ?? 20})`);
  }

  if (
    rootForms.status !== 200 ||
    !formsTable?.selectable ||
    !formsTable.bulkActions?.some((item) => item.actionId === 'root_cancel_form')
  ) {
    console.error('FAIL root forms.list bulk config');
    failed += 1;
  } else {
    console.log('OK root forms bulk cancel with status eligibility');
  }

  let userToken;
  try {
    userToken = await login('user@bdui.local', USER_PASSWORD);
    const userList = await request('/bdui/schema/user/forms.list', { token: userToken });
    const userTable = tableWidget(userList.json);
    if (userTable?.selectable || userTable?.bulkActions?.length) {
      console.error('FAIL user forms.list must not expose bulk actions');
      failed += 1;
    } else {
      console.log('OK user forms.list without bulk CTA');
    }
  } catch (error) {
    console.error(`FAIL user check: ${error.message}`);
    failed += 1;
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll E13 bulk schema smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
