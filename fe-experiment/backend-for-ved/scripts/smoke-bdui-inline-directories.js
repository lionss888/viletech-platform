/**
 * Smoke: E11 inline directory create — User happy path + Provider AuthZ deny.
 *
 * Usage (Nest + seed must be up):
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-inline-directories.js
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

function listRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.docs ?? payload?.items ?? [];
}

function entityId(payload) {
  return payload?._id ?? payload?.id;
}

async function login(email) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { email, password: USER_PASSWORD },
  });
  if ((result.status !== 200 && result.status !== 201) || !result.json?.accessToken) {
    throw new Error(`login ${email} → ${result.status}`);
  }
  return result.json.accessToken;
}

async function main() {
  console.log(`Smoke E11 inline directories against ${DEFAULT_BASE}\n`);
  let failed = 0;
  const suffix = Date.now().toString().slice(-8);
  const uniqueInn = `77${suffix}`.slice(0, 10);

  let userToken;
  try {
    userToken = await login('user@bdui.local');
    console.log('OK user login');
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    process.exit(1);
  }

  const orgCreate = await request('/organization', {
    method: 'POST',
    token: userToken,
    body: {
      name: `E11 Inline Org ${suffix}`,
      inn: uniqueInn,
      email: `e11-org-${suffix}@bdui.local`,
      phone: '+74950001122',
      signerName: 'E11 Signer',
      signerPosition: 'general_director',
      businessForm: 'ООО',
      legalAddress: 'г. Москва, ул. Inline, 1',
    },
  });
  const orgId = entityId(orgCreate.json);
  if ((orgCreate.status !== 200 && orgCreate.status !== 201) || !orgId) {
    console.error(`FAIL User POST /organization → ${orgCreate.status} ${orgCreate.text?.slice(0, 200)}`);
    failed += 1;
  } else {
    console.log(`OK User inline org create id=${orgId}`);
  }

  const orgList = await request('/organization?limit=50', { token: userToken });
  const orgIds = listRows(orgList.json).map((row) => String(row._id));
  if (orgList.status !== 200 || (orgId && !orgIds.includes(String(orgId)))) {
    console.error(`FAIL GET /organization missing new org → ${orgList.status}`);
    failed += 1;
  } else {
    console.log('OK new org visible in GET /organization');
  }

  const cpCreate = await request('/counterparty/create', {
    method: 'POST',
    token: userToken,
    body: {
      name: `E11 Inline CP ${suffix}`,
      country: 'DE',
      type: 'foreign',
      legalAddress: 'Berlin, Inline Str. 1',
      banks: [
        {
          bankName: 'Inline Bank AG',
          bankCountry: 'DE',
          accounts: [{ accountNumber: `DE${suffix}`, currency: 'usd', isPrimary: true }],
        },
      ],
    },
  });
  const cpId = entityId(cpCreate.json);
  if ((cpCreate.status !== 200 && cpCreate.status !== 201) || !cpId) {
    console.error(`FAIL User POST /counterparty/create → ${cpCreate.status} ${cpCreate.text?.slice(0, 200)}`);
    failed += 1;
  } else {
    console.log(`OK User inline counterparty create id=${cpId}`);
  }

  const cpList = await request('/counterparty/list?limit=50', { token: userToken });
  const cpIds = listRows(cpList.json).map((row) => String(row._id));
  if (cpList.status !== 200 || (cpId && !cpIds.includes(String(cpId)))) {
    console.error(`FAIL GET /counterparty/list missing new cp → ${cpList.status}`);
    failed += 1;
  } else {
    console.log('OK new counterparty visible in GET /counterparty/list');
  }

  const wizardSchema = await request('/bdui/schema/user/forms.create', { token: userToken });
  const wizard = wizardSchema.json?.widgets?.find((widget) => widget.type === 'wizard');
  const inlineActionIds = (wizardSchema.json?.actions ?? [])
    .filter((action) => action.id === 'create_organization' || action.id === 'create_counterparty')
    .map((action) => action.id);
  if (
    wizardSchema.status !== 200 ||
    !wizard?.inlineCreates?.length ||
    !inlineActionIds.includes('create_organization') ||
    !inlineActionIds.includes('create_counterparty')
  ) {
    console.error(`FAIL wizard schema inlineCreates/actions → ${wizardSchema.status}`);
    failed += 1;
  } else {
    console.log(`OK wizard schema inlineCreates (${wizard.inlineCreates.length} steps)`);
  }

  const draftSchema = await request('/bdui/schema/user/forms.detail?status=draft', { token: userToken });
  const inlineWidget = draftSchema.json?.widgets?.find((widget) => widget.type === 'inline_directory');
  if (draftSchema.status !== 200 || !inlineWidget?.createActionId) {
    console.error(`FAIL draft detail inline_directory widget → ${draftSchema.status}`);
    failed += 1;
  } else {
    console.log(`OK draft detail inline_directory createActionId=${inlineWidget.createActionId}`);
  }

  let providerToken;
  try {
    providerToken = await login('provider@bdui.local');
  } catch (error) {
    console.error(`FAIL provider login: ${error.message}`);
    failed += 1;
    providerToken = null;
  }

  if (providerToken) {
    const providerOrg = await request('/organization', {
      method: 'POST',
      token: providerToken,
      body: {
        name: 'Provider should not create',
        inn: `88${suffix}`.slice(0, 10),
        email: 'blocked@bdui.local',
        phone: '+74950001122',
        signerName: 'Blocked',
        signerPosition: 'general_director',
        businessForm: 'ООО',
      },
    });
    if (providerOrg.status === 200 || providerOrg.status === 201) {
      console.error(`FAIL Provider POST /organization should be denied, got ${providerOrg.status}`);
      failed += 1;
    } else {
      console.log(`OK Provider POST /organization denied → ${providerOrg.status}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll E11 inline directory smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
