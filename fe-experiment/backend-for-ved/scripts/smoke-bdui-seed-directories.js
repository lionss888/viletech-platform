/**
 * Smoke: E10 seed directories — currencies, organizations, counterparties for User.
 *
 * Usage (Nest + seed must be up):
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-seed-directories.js
 */

const DEFAULT_BASE = process.env.BDUI_API_BASE || 'http://127.0.0.1:30000/api/1.0';
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

function listLength(payload) {
  if (Array.isArray(payload)) {
    return payload.length;
  }
  if (payload?.docs) {
    return payload.docs.length;
  }
  if (payload?.items) {
    return payload.items.length;
  }
  return 0;
}

async function main() {
  console.log(`Smoke E10 directories against ${DEFAULT_BASE}\n`);
  let failed = 0;

  const login = await request('/auth/login', {
    method: 'POST',
    body: { email: 'user@bdui.local', password: USER_PASSWORD },
  });
  if ((login.status !== 200 && login.status !== 201) || !login.json?.accessToken) {
    console.error(`FAIL login → ${login.status}`);
    process.exit(1);
  }
  const token = login.json.accessToken;

  const currencies = await request('/currency?limit=20', { token });
  const currencyCount = listLength(currencies.json);
  if (currencies.status !== 200 || currencyCount < 2) {
    console.error(`FAIL GET /currency → ${currencies.status}, count=${currencyCount}`);
    failed += 1;
  } else {
    const symbols = (currencies.json.docs ?? currencies.json).map((row) => row.symbol).join(', ');
    console.log(`OK currencies (${currencyCount}): ${symbols}`);
  }

  const orgs = await request('/organization?limit=20', { token });
  const orgCount = listLength(orgs.json);
  if (orgs.status !== 200 || orgCount < 2) {
    console.error(`FAIL GET /organization → ${orgs.status}, count=${orgCount}`);
    failed += 1;
  } else {
    const names = (orgs.json.docs ?? orgs.json).map((row) => row.name).join('; ');
    console.log(`OK organizations (${orgCount}): ${names}`);
  }

  const counterparties = await request('/counterparty/list?limit=20', { token });
  const cpCount = listLength(counterparties.json);
  if (counterparties.status !== 200 || cpCount < 2) {
    console.error(`FAIL GET /counterparty/list → ${counterparties.status}, count=${cpCount}`);
    failed += 1;
  } else {
    const names = (counterparties.json.docs ?? counterparties.json).map((row) => row.name).join('; ');
    console.log(`OK counterparties (${cpCount}): ${names}`);
  }

  const wizardSchema = await request('/bdui/schema/user/forms.create', { token });
  const wizard = wizardSchema.json?.widgets?.find((widget) => widget.type === 'wizard');
  if (
    wizardSchema.status !== 200 ||
    !wizard?.currenciesDataSource?.path ||
    !wizard?.organizationsDataSource?.path
  ) {
    console.error(`FAIL wizard schema data sources → ${wizardSchema.status}`);
    failed += 1;
  } else {
    console.log(
      `OK wizard refs: org=${wizard.organizationsDataSource.path} currency=${wizard.currenciesDataSource.path}`,
    );
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll E10 directory smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
