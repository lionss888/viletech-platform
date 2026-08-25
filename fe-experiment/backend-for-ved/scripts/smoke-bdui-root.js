/**
 * Smoke: E12 root SuperAdmin — login, schemas, AuthZ isolation.
 *
 * Usage (Nest + seed must be up):
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-root.js
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

async function main() {
  console.log(`Smoke E12 root against ${DEFAULT_BASE}\n`);
  let failed = 0;

  const loginSchema = await request('/bdui/schema/root/login');
  if (loginSchema.status !== 200 || loginSchema.json?.role !== 'root') {
    console.error(`FAIL root login schema → ${loginSchema.status}`);
    failed += 1;
  } else {
    console.log('OK root login schema (public)');
  }

  let rootToken;
  try {
    rootToken = await login('root@bdui.local', ROOT_PASSWORD);
    console.log('OK root@bdui.local login');
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    process.exit(1);
  }

  for (const page of ['users.list', 'directories.list', 'forms.list']) {
    const schema = await request(`/bdui/schema/root/${page}`, { token: rootToken });
    if (schema.status !== 200) {
      console.error(`FAIL root schema ${page} → ${schema.status}`);
      failed += 1;
    } else {
      console.log(`OK root schema ${page}`);
    }
  }

  const usersDetail = await request('/bdui/schema/root/users.detail', { token: rootToken });
  const blockAction = usersDetail.json?.actions?.find((action) => action.id === 'root_block_user');
  const cancelAction = await request('/bdui/schema/root/forms.detail', { token: rootToken });
  const rootCancel = cancelAction.json?.actions?.find((action) => action.id === 'root_cancel_form');
  if (!blockAction || !rootCancel) {
    console.error('FAIL root detail actions missing (block/cancel)');
    failed += 1;
  } else {
    console.log('OK root admin CTA in schema (block user, cancel form)');
  }

  let userToken;
  try {
    userToken = await login('user@bdui.local', USER_PASSWORD);
  } catch (error) {
    console.error(`FAIL user login: ${error.message}`);
    failed += 1;
    userToken = null;
  }

  if (userToken) {
    const userSchema = await request('/bdui/schema/user/forms.detail?status=draft', { token: userToken });
    const userActionIds = (userSchema.json?.actions ?? []).map((action) => action.id);
    if (userActionIds.includes('root_cancel_form') || userActionIds.includes('root_create_user')) {
      console.error('FAIL user schema contains root admin actions');
      failed += 1;
    } else {
      console.log('OK user schema isolated from root CTAs');
    }

    const userAdminList = await request('/admin/account?limit=5', { token: userToken });
    if (userAdminList.status === 200) {
      console.error(`FAIL User GET /admin/account should be denied, got ${userAdminList.status}`);
      failed += 1;
    } else {
      console.log(`OK User GET /admin/account denied → ${userAdminList.status}`);
    }
  }

  const suffix = Date.now().toString().slice(-6);
  const createUser = await request('/admin/account', {
    method: 'POST',
    token: rootToken,
    body: {
      email: `e12-smoke-${suffix}@bdui.local`,
      fullName: `E12 Smoke ${suffix}`,
      password: 'SmokePass2024!',
      roles: ['user'],
    },
  });
  if ((createUser.status !== 200 && createUser.status !== 201) || !createUser.json?._id) {
    console.error(`FAIL root POST /admin/account → ${createUser.status} ${createUser.text?.slice(0, 160)}`);
    failed += 1;
  } else {
    console.log(`OK root create user id=${createUser.json._id}`);
  }

  const orgList = await request('/admin/manager/organization?limit=5', { token: rootToken });
  if (orgList.status !== 200) {
    console.error(`FAIL root GET /admin/manager/organization → ${orgList.status}`);
    failed += 1;
  } else {
    console.log('OK root directories (organizations) list');
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll E12 root smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
