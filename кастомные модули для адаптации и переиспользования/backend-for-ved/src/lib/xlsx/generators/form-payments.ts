import { Workbook } from 'exceljs';
import { FormPaymentCondition, FormPaymentDirection } from '../../enums/models/form-payment.enums';
import * as ExcelJS from 'exceljs';
import moment from 'moment';
import { IFormPaymentOrganization } from '../../interfaces/models/form-payment.interface';
import { IFormPaymentForXlsx } from '../../../modules/form-payment/service/form-payment.service.interface';

export const getFormPaymentsDocument = (formPayments: IFormPaymentForXlsx[]): Workbook => {
  const formPaymentDirection = {
    [FormPaymentDirection.EXPORT]: 'Экспорт',
    [FormPaymentDirection.IMPORT]: 'Импорт',
  };

  const formPaymentPlatformPaymentCondition = {
    [FormPaymentCondition.ADVANCE]: 'Аванс',
    [FormPaymentCondition.POST_PAYMENT]: 'Постоплата',
  };

  const workBook = new ExcelJS.Workbook();
  const workSheet = workBook.addWorksheet(`Платежи`);

  const header = [
    'ID сделки',
    'Дата создания',
    'Дедлайн',
    'Направление',
    'Тип сделки',
    'Наименование',
    'Курс сделки',
    'Сумма покрытия',
    'Валюта покрытия',
    'Размер комиссии',
    'Валюта комиссии',
    'Процент комиссии',
    '(1с) Дата получения покрытия + вознаграждения',
    '(Р) Дата получения покрытия + вознаграждения',
    'Сумма обязательств',
    'Валюта обязательств',
    'Компания плательщик',
    'Банк плательщика',
    'Дата исполнения платежа провайдером',
    'Дата инвойса',
    'Наименование компании',
    'Номер инвойса',
  ];

  new Array(header.length).fill(1).forEach((v, i) => {
    const col = workSheet.getColumn(i + 1);
    col.font = { size: 10, name: 'Arial' };
    col.width = 13;
    workSheet.getCell(1, i + 1).value = header[i];
  });
  workSheet.getRow(1).font = { bold: true, size: 11, name: 'Arial' };

  const rows = formPayments.map((formPayment) => [
    // 'ID сделки';
    formPayment?.uid || '',
    // 'Дата создания';
    formPayment?.sentDate ? moment(formPayment?.sentDate).utcOffset(3).format('DD.MM.YYYY') : '',
    // 'Дедлайн';
    (formPayment?.totals?.paidDate ? moment(formPayment?.totals?.paidDate).utcOffset(3).format('DD.MM.YYYY') : '') ||
      '-',
    // 'Направление';
    formPaymentDirection[formPayment?.direction] || '',
    // 'ТИП СДЕЛКИ';
    formPaymentPlatformPaymentCondition[formPayment?.platformPaymentCondition] || '',
    // 'Наименование';
    (formPayment?.organization as IFormPaymentOrganization)?.name || formPayment?.clientOrganization || '',
    // 'Курс сделки';
    typeof formPayment?.currency?.rate === 'number' ? formPayment.currency.rate : '',
    // 'Сумма покрытия';
    ({
      [FormPaymentDirection.IMPORT]: formPayment?.totals?.coverAmount,
      [FormPaymentDirection.EXPORT]: formPayment?.totals?.amount,
    }[formPayment?.direction] || 0) / 100,
    // 'Валюта покрытия';
    {
      [FormPaymentDirection.IMPORT]: formPayment?.currency?.client,
      [FormPaymentDirection.EXPORT]: formPayment?.currency?.counterparty,
    }[formPayment?.direction]?.toUpperCase(),
    // 'Размер комиссии';
    (formPayment?.totals?.feeAmount || 0) / 100,
    // 'Валюта комиссии'
    formPayment?.currency?.client?.toUpperCase(),
    // 'Процент комиссии';
    (formPayment?.totals?.feePercent || 0) / 100,
    // '1с Дата получения покрытия + вознаграждения';
    formPayment?.payments
      ?.map((payment) => (payment.payDate ? moment(payment.payDate).utcOffset(3).format('DD.MM.YYYY') : undefined))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', '),

    // 'ручное Дата получения покрытия + вознаграждения';
    [formPayment?.dateReceiptOfCover, formPayment?.dateReceiptOfCommission]
      ?.map((date) => (date ? moment(date).utcOffset(3).format('DD.MM.YYYY') : undefined))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', '),

    // 'Сумма обязательств';
    ({
      [FormPaymentDirection.IMPORT]: formPayment?.totals?.amount,
      [FormPaymentDirection.EXPORT]: formPayment?.totals?.coverAmount,
    }[formPayment?.direction] || 0) / 100,
    // 'Валюта обязательств';
    {
      [FormPaymentDirection.IMPORT]: formPayment?.currency?.counterparty,
      [FormPaymentDirection.EXPORT]: formPayment?.currency?.client,
    }[formPayment?.direction]?.toUpperCase(),
    // 'Компания плательщик';
    (formPayment?.providerOrganization as IFormPaymentOrganization)?.name,
    // 'Банк плательщика';
    (formPayment?.providerOrganization as IFormPaymentOrganization)?.requisite?.bankName,
    // 'Дата исполнения платежа провайдером';
    formPayment?.paymentByProviderDate
      ? moment(formPayment?.paymentByProviderDate).utcOffset(3).format('DD.MM.YYYY')
      : '',
    // 'Дата инвойса';
    formPayment?.invoices[0]?.invoiceDate
      ? moment(formPayment?.invoices[0]?.invoiceDate).utcOffset(3).format('DD.MM.YYYY')
      : '',
    // 'Наименование компании';
    formPayment?.invoices[0]?.recognized?.counterparty?.name,
    // 'Номер инвойса';
    formPayment?.invoices[0]?.invoiceNumber || '',
  ]);

  workSheet.addRows(rows);

  return workBook;
};
