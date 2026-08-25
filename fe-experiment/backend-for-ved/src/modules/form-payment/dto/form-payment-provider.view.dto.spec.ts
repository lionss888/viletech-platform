import {
  FormPaymentProviderViewDto,
  PROVIDER_RESPONSE_DENY_KEYS,
  PROVIDER_RESPONSE_DENY_NESTED_KEYS,
  toFormPaymentProviderView,
} from './form-payment-provider.view.dto';

describe('toFormPaymentProviderView', () => {
  const inputFormWithPii = {
    _id: '6a8dbd010000000000000099',
    status: 'payment_processing',
    prevStatus: 'payment_received',
    direction: 'import',
    amount: 100000,
    platformPaymentCondition: 'advance',
    currency: { client: 'rub', counterparty: 'usd', rate: 90 },
    totals: { amount: 100000, coverAmount: 9000000, feePercent: 250 },
    counterparty: {
      name: 'Foreign Seller Ltd',
      bankName: 'Bank of Somewhere',
      accountNumber: 'GB00TEST',
      swiftCode: 'TESTGB2L',
    },
    invoices: [{ uuid: 'inv-1', kind: 'good', hsCode: '0101210000' }],
    docs: {
      paymentOrder: '6a8dbd010000000000000001',
      payments: [{ _id: '6a8dbd010000000000000002' }],
      closing: [{ _id: 'secret-closing' }],
      report: { _id: 'secret-report' },
    },
    transactions: [{ uuid: 'tx-1', hash: '0xabc', chain: 'ETH', account: 'client-account-id' }],
    organization: {
      _id: 'org-1',
      name: 'ООО BDUI Тест',
      inn: '7707083893',
      email: 'secret@client.local',
      phone: '+74951234567',
      signerName: 'Иванов Иван',
      signerPosition: 'general_director',
      legalAddress: 'Москва, секрет',
      refOrganizationId: 'org-1',
      status: 'approved',
    },
    account: {
      _id: 'acc-client',
      email: 'user@bdui.local',
      phone: '+79990000000',
      fullName: 'BDUI User',
      telegram: '@secret',
    },
    manager: {
      _id: 'acc-mgr',
      email: 'manager@bdui.local',
      phone: '+79991111111',
      fullName: 'BDUI Manager',
    },
    provider: {
      _id: '6a8d6e50f13e420be59704b5',
      email: 'provider@bdui.local',
      fullName: 'BDUI Provider',
      phone: '+79992222222',
    },
    agent: {
      _id: '6a8dbd020000000000000001',
      organizationName: 'BDUI Agent LLC',
      inn: '7700000000',
      email: 'agent@bdui.local',
      phone: '+74950000000',
      director: { name: 'Петров' },
    },
    complianceReport: { text: 'full chatgpt analysis with PII' },
    importFile: 'import-file-id',
    linkedExportForms: [{ _id: 'export-1', account: { email: 'x@y.z' } }],
    rejectText: 'ok to keep for ops note',
  };

  it('returns FormPaymentProviderViewDto instance', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii);
    expect(actualView).toBeInstanceOf(FormPaymentProviderViewDto);
    expect(actualView._id).toBe(inputFormWithPii._id);
    expect(actualView.status).toBe('payment_processing');
  });

  it('keeps payment execution fields', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii);
    expect(actualView.counterparty?.name).toBe('Foreign Seller Ltd');
    expect(actualView.totals?.coverAmount).toBe(9000000);
    expect(actualView.docs?.paymentOrder).toBe('6a8dbd010000000000000001');
    expect(actualView.docs?.payments).toEqual(['6a8dbd010000000000000002']);
    expect(actualView.transactions?.[0]).toEqual({
      uuid: 'tx-1',
      hash: '0xabc',
      chain: 'ETH',
    });
    expect(actualView.provider).toBe('6a8d6e50f13e420be59704b5');
    expect(actualView.organization?.name).toBe('ООО BDUI Тест');
    expect(actualView.organization?.inn).toBe('7707083893');
    expect(actualView.agent?.organizationName).toBe('BDUI Agent LLC');
  });

  it('strips top-level deny-list keys (no client account / manager / compliance)', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii) as unknown as Record<string, unknown>;
    for (const key of PROVIDER_RESPONSE_DENY_KEYS) {
      expect(actualView).not.toHaveProperty(key);
    }
  });

  it('strips organization contact PII nested keys', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii);
    const organization = actualView.organization as unknown as Record<string, unknown>;
    expect(organization).toBeDefined();
    for (const key of PROVIDER_RESPONSE_DENY_NESTED_KEYS) {
      expect(organization).not.toHaveProperty(key);
    }
  });

  it('strips transaction.account (client linkage)', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii);
    expect(actualView.transactions?.[0]).not.toHaveProperty('account');
  });

  it('strips non-payment docs (closing / report)', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii);
    expect(actualView.docs).not.toHaveProperty('closing');
    expect(actualView.docs).not.toHaveProperty('report');
  });

  it('strips agent contact PII', () => {
    const actualView = toFormPaymentProviderView(inputFormWithPii);
    const agent = actualView.agent as unknown as Record<string, unknown>;
    expect(agent).not.toHaveProperty('email');
    expect(agent).not.toHaveProperty('phone');
    expect(agent).not.toHaveProperty('director');
  });
});
