/**
 * Smoke: login 5 BDUI seed roles + GET schema login + forms.list → 200.
 *
 * Usage (Nest must be running on :30000):
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-login.js
 */

const DEFAULT_BASE = process.env.BDUI_API_BASE || 'http://127.0.0.1:30000/api/1.0';
const PASSWORD = process.env.BDUI_LIFECYCLE_PASSWORD || 'BduiLifecycle2024!';
const USER_PASSWORD = process.env.BDUI_USER_PASSWORD || 'BduiUser2024!';

const ACCOUNTS = [
  { email: 'user@bdui.local', password: USER_PASSWORD, role: 'user' },
  { email: 'ico@bdui.local', password: PASSWORD, role: 'internal_compliance_officer' },
  { email: 'eco@bdui.local', password: PASSWORD, role: 'compliance_officer' },
  { email: 'manager@bdui.local', password: PASSWORD, role: 'manager' },
  { email: 'provider@bdui.local', password: PASSWORD, role: 'provider' },
];

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

async function main() {
  console.log(`Smoke BDUI against ${DEFAULT_BASE}\n`);
  let failed = 0;
  for (const account of ACCOUNTS) {
    const loginSchema = await request(`/bdui/schema/${account.role}/login`);
    if (loginSchema.status !== 200) {
      console.error(`FAIL ${account.role} login schema → ${loginSchema.status}`);
      failed += 1;
      continue;
    }
    const login = await request('/auth/login', {
      method: 'POST',
      body: { email: account.email, password: account.password },
    });
    if ((login.status !== 200 && login.status !== 201) || !login.json?.accessToken) {
      console.error(`FAIL ${account.email} login → ${login.status} ${login.text?.slice(0, 200)}`);
      failed += 1;
      continue;
    }
    const listSchema = await request(`/bdui/schema/${account.role}/forms.list`, {
      token: login.json.accessToken,
    });
    if (listSchema.status !== 200) {
      console.error(`FAIL ${account.role} forms.list schema → ${listSchema.status}`);
      failed += 1;
      continue;
    }
    console.log(
      `OK  ${account.role.padEnd(28)} login+schema login+list  account=${login.json.account?._id || '?'}`,
    );
  }
  if (failed > 0) {
    console.error(`\nSmoke failed: ${failed}/${ACCOUNTS.length}`);
    process.exit(1);
  }
  console.log(`\nSmoke passed: ${ACCOUNTS.length}/${ACCOUNTS.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
