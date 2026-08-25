import type { BduiAction } from '../types/bdui';

/**
 * Builds POST body for inline organization create (site API).
 */
export function buildInlineOrganizationBody(values: Record<string, string>): Record<string, unknown> {
  return {
    name: values.orgName,
    inn: values.orgInn,
    email: values.orgEmail,
    phone: values.orgPhone,
    signerName: values.orgSignerName,
    signerPosition: values.orgSignerPosition || 'general_director',
    businessForm: values.orgBusinessForm || 'ООО',
    legalAddress: values.orgLegalAddress || undefined,
  };
}

/**
 * Builds POST body for inline foreign counterparty create.
 */
export function buildInlineCounterpartyBody(values: Record<string, string>): Record<string, unknown> {
  return {
    name: values.cpName,
    country: values.cpCountry,
    type: 'foreign',
    legalAddress: values.cpLegalAddress || undefined,
    banks: [
      {
        bankName: values.cpBankName,
        bankCountry: values.cpBankCountry,
        bankAddress: values.cpBankAddress || undefined,
        accounts: [
          {
            accountNumber: values.cpAccountNumber,
            currency: (values.cpAccountCurrency || 'usd').toLowerCase(),
            isPrimary: true,
          },
        ],
      },
    ],
  };
}

/**
 * Maps inline form values to domain create payload by action kind.
 */
export function buildInlineCreateBody(
  action: BduiAction,
  values: Record<string, string>,
): Record<string, unknown> {
  if (action.inlineCreateKind === 'organization') {
    return buildInlineOrganizationBody(values);
  }
  if (action.inlineCreateKind === 'counterparty_foreign') {
    return buildInlineCounterpartyBody(values);
  }
  return values;
}

export function readCreatedEntityId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }
  const record = response as { _id?: string; id?: string };
  return record._id ?? record.id;
}
