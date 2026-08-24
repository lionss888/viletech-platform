import { Expose, Transform } from 'class-transformer';
import { formatNumber } from '../../../lib/utils/helpers/number-format-utils';
import { FormPaymentDirectionTranslates } from '../../../lib/constants/models/form-payment.constants';
import { FormPaymentDirection } from '../../../lib/enums/models/form-payment.enums';

const formatScaledBy100 = (value?: number | null): string | null => {
  if (!value || value <= 0) {
    return null;
  }

  const whole = Math.floor(value / 100);
  const fraction = Math.abs(value % 100);

  if (fraction === 0) {
    return String(whole);
  }

  if (fraction % 10 === 0) {
    return `${whole}.${Math.floor(fraction / 10)}`;
  }

  return `${whole}.${String(fraction).padStart(2, '0')}`;
};

const getCurrencyIcon = (currency?: string | null): string => {
  const symbol = currency?.toUpperCase();
  if (!symbol) {
    return '';
  }

  const icons: Record<string, string> = {
    RUB: '₽',
    CNY: '¥',
    JPY: '¥',
    TRY: '₺',
    USD: '$',
    HKD: 'HK$',
    INR: '₹',
    AED: 'AED',
    EUR: '€',
    CAD: 'C$',
    SGD: 'S$',
    GBP: '£',
    BTC: '₿',
    ETH: 'Ξ',
    USDT: '₮',
  };

  return icons[symbol] ?? symbol;
};

const formatAgentFeeReward = (
  feeFixMinor: number | null | undefined,
  feeFixCurrency: string | null | undefined,
  feePercentBps: number | null | undefined,
): string => {
  const fixAmount = formatScaledBy100(feeFixMinor);
  const percent = formatScaledBy100(feePercentBps);

  const fixPart = fixAmount ? `${fixAmount}${getCurrencyIcon(feeFixCurrency)}` : null;
  const percentPart = percent ? `${percent}%` : null;

  return [fixPart, percentPart].filter(Boolean).join(' + ');
};

export class FormPaymentTelegramDto {
  @Expose()
  event: string;

  @Expose()
  @Transform(({ obj }) => obj.form?.rejectText, { toClassOnly: true })
  rejectText: string;

  // ID сделки
  @Expose()
  @Transform(({ obj }) => obj.form?.uid, { toClassOnly: true })
  uid: string;

  // Дата создания
  @Expose()
  @Transform(
    ({ obj }) =>
      obj.form?.createDate
        ? new Date(obj.form?.createDate).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
        : null,
    { toClassOnly: true },
  )
  createDate: string;

  // Направление
  @Expose()
  @Transform(({ obj }) => FormPaymentDirectionTranslates[obj.form?.direction] || null, { toClassOnly: true })
  direction: string;

  // Сумма к оплате
  @Expose()
  @Transform(
    ({ obj }) =>
      formatNumber(
        {
          [FormPaymentDirection.IMPORT]: obj.form?.totals?.amount,
          [FormPaymentDirection.EXPORT]: obj.form?.totals?.coverAmount,
        }[obj.form?.direction] || 0,
      ),
    { toClassOnly: true },
  )
  amount: string;

  // Валюта оплаты RUB
  @Expose()
  @Transform(
    ({ obj }) =>
      ({
        [FormPaymentDirection.IMPORT]: obj.form?.currency?.counterparty,
        [FormPaymentDirection.EXPORT]: obj.form?.currency?.client,
      }[obj.form?.direction]?.toUpperCase()),
    { toClassOnly: true },
  )
  currencyAmount: string;

  // Сумма к получению
  @Expose()
  @Transform(
    ({ obj }) =>
      formatNumber(
        {
          [FormPaymentDirection.IMPORT]: obj.form?.totals?.coverAmount,
          [FormPaymentDirection.EXPORT]: obj.form?.totals?.amount,
        }[obj.form?.direction] || 0,
      ),
    { toClassOnly: true },
  )
  coverAmount: string;

  // Валюта получения CNY
  @Expose()
  @Transform(
    ({ obj }) =>
      ({
        [FormPaymentDirection.IMPORT]: obj.form?.currency?.client,
        [FormPaymentDirection.EXPORT]: obj.form?.currency?.counterparty,
      }[obj.form?.direction]?.toUpperCase()),
    { toClassOnly: true },
  )
  currencyCoverAmount: string;

  // Агентское вознаграждение
  @Expose()
  @Transform(({ obj }) => ((obj.form?.totals?.feePercent || 0) / 100).toLocaleString(), { toClassOnly: true })
  feePercent: string;

  // Размер комиссии
  @Expose()
  @Transform(({ obj }) => formatNumber(obj.form?.totals?.feeAmount || 0), { toClassOnly: true })
  feeAmount: string;

  // Валюта комиссии RUB
  // FormPayment.currency?.client
  @Expose()
  @Transform(({ obj }) => obj.form?.currency?.client?.toUpperCase(), { toClassOnly: true })
  currencyFeeAmount: string;

  // Агентское вознаграждение (фикс + процент)
  @Expose()
  @Transform(
    ({ obj }) =>
      formatAgentFeeReward(obj.form?.totals?.feeFix, obj.form?.currency?.fixFeeCurrency, obj.form?.totals?.feePercent),
    { toClassOnly: true },
  )
  feeReward: string;

  // Курс сделки
  @Expose()
  @Transform(
    ({ obj }) => {
      const rate = obj.form?.currency?.rate;
      if (rate === undefined || rate === null) {
        return '';
      }

      return Number(rate).toLocaleString('ru-RU', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
    },
    { toClassOnly: true },
  )
  rate: string;

  // Валюта курса CNY
  // FormPayment.currency?.counterparty
  @Expose()
  @Transform(({ obj }) => (obj.form?.currency?.counterparty + '-' + obj.form?.currency?.client)?.toUpperCase(), {
    toClassOnly: true,
  })
  currencyRate: string;

  // --------------------------------

  // Организация провайдера
  @Expose()
  @Transform(({ obj }) => obj.form?.providerOrganization?.name || '', { toClassOnly: true })
  providerOrganizationName: string;

  // Наименование компании:
  @Expose()
  @Transform(({ obj }) => obj.form?.organization?.name || '', { toClassOnly: true })
  organizationName: string;
}
