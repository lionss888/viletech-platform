import { AlignmentType, Document, TableCell, TableRow, WidthType } from 'docx';
import { docxDefaultNumberingLevelConfig, docxFullWidthTable, docxSectionProperties } from '../constants';
import { CustomParagraph } from '../components/CustomParagraph';
import { CustomTextRun } from '../components/CustomTextRun';
import { CustomTable } from '../components/CustomTable';
import _ from 'lodash';
import { getSigningOrderFeePaymentText } from '../../utils/helpers/signing-order-text.helper';

const column1Width = { size: (docxFullWidthTable / 24) * 2, type: WidthType.DXA };
const column2Width = { size: (docxFullWidthTable / 24) * 14, type: WidthType.DXA };
const column3Width = { size: (docxFullWidthTable / 24) * 8, type: WidthType.DXA };

const getOrderRow = (column1, column2, column3) =>
  new TableRow({
    children: [
      new TableCell({
        width: column1Width,
        verticalAlign: AlignmentType.CENTER,
        children: [
          new CustomParagraph({
            spacing: { after: 0 },
            children: [
              new CustomTextRun({
                text: column1,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: column2Width,
        verticalAlign: AlignmentType.CENTER,
        children: [
          new CustomParagraph({
            spacing: { after: 0 },
            children: _.split(column2, '\n').map(
              (str, index) =>
                new CustomTextRun({
                  text: str,
                  break: index > 0 ? 1 : 0,
                }),
            ),
          }),
        ],
      }),
      new TableCell({
        width: column3Width,
        verticalAlign: AlignmentType.CENTER,
        children: [
          new CustomParagraph({
            spacing: { after: 0 },
            children: _.split(column3, '\n').map(
              (str, index) =>
                new CustomTextRun({
                  text: str,
                  break: index > 0 ? 1 : 0,
                }),
            ),
          }),
        ],
      }),
    ],
  });

export const getSigningOrderDocument = (data: any) => {
  let fee;
  const {
    feePercent,
    feeFix,
    feeFixCurrency,
    feePaymentText: providedFeePaymentText,
    feeAmount,
    platformPaymentCondition,
    isAdvanceOrder,
  } = data;
  const feePaymentText =
    providedFeePaymentText ||
    getSigningOrderFeePaymentText({
      feeAmount,
      platformPaymentCondition,
      isAdvanceOrder,
    });

  if (feePercent && !feeFix) {
    fee = `${feePercent}%`;
  }
  if (!feePercent && feeFix) {
    fee = `${feeFix} ${feeFixCurrency}`;
  }
  if (feePercent && feeFix) {
    fee = `${feePercent}% + ${feeFix} ${feeFixCurrency}`;
  }

  return new Document({
    numbering: {
      config: [
        {
          reference: 'numering-1',
          levels: [docxDefaultNumberingLevelConfig],
        },
      ],
    },
    sections: [
      {
        properties: {
          ...docxSectionProperties,
        },
        children: [
          new CustomParagraph({
            alignment: 'center',
            children: [
              new CustomTextRun({
                text: `Поручение принципала № ${data.orderNumber} от ${data.orderDate}`,
              }),
            ],
          }),

          new CustomParagraph({
            alignment: 'both',
            spacing: { after: 400 },
            children: [
              new CustomTextRun({
                text:
                  `${data.clientOrganizationBusinessForm ? data.clientOrganizationBusinessForm + ' ' : ''}${
                    data.clientOrganizationName
                  }, ` +
                  `именуемое в дальнейшем "Принципал", поручает ${data.agentOrganizationName}, именуемое в дальнейшем "Агент", в ` +
                  `соответствии с условиями Агентского договора № ${data.agentContractNumber} от ${data.agentContractDate}, `,
              }),
              new CustomTextRun({
                text: data.isImport
                  ? `дает Поручение провести оплату третьему лицу, именуемое в дальнейшем "Бенефициар", со следующими условиями: `
                  : `дает Поручение принять денежные средства, причитающиеся Принципалу в соответсвии с условиями настоящего Договора, со следующими условиями `,
              }),
            ],
          }),

          new CustomTable({
            columnWidths: [column1Width.size, column2Width.size, column3Width.size],
            rows: _.compact([
              new TableRow({
                children: [
                  new TableCell({
                    width: column1Width,
                    children: [
                      new CustomParagraph({
                        children: [
                          new CustomTextRun({
                            text: '№ п/п',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    columnSpan: 2,
                    verticalAlign: AlignmentType.CENTER,
                    width: { ...column2Width, size: column2Width.size + column3Width.size },
                    children: [
                      new CustomParagraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new CustomTextRun({
                            text: 'Детали Поручения',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              getOrderRow('1', 'Наименование Бенефициара', `${data.counterpartyName}`),
              getOrderRow(
                '2',
                'Контракт (и (или) иной документ) (№, дата)',
                `invoice ${data.invoiceNumber || ''} date ${data.invoiceDate || ''}`,
              ),
              getOrderRow('3', 'Сумма платежа в адрес Бенефициара', `${data.counterpartyCurrencyIcon} ${data.amount}`),
              getOrderRow('4', 'Валюта платежа в адрес Бенефициара', `${data.counterpartyCurrency}`),
              getOrderRow('5', 'Банк Бенефициара', `${data.bankName}`),
              getOrderRow('6', 'SWIFT', `${data.swiftCode}`),
              getOrderRow('7', 'Счет Бенефициара', `${data.accountNumber}`),
              getOrderRow(
                '8',
                'Назначение платежа, при перечислении средств Бенефициару',
                `invoice ${data.invoiceNumber || ''} date ${data.invoiceDate || ''}`,
              ),
              data.currencyRate
                ? getOrderRow(
                    '9',
                    'Курс пересчета',
                    `${data.currencyRate}${data.currencyFeeRate && data.feeFix ? `, ${data.currencyFeeRate}` : ''}`,
                  )
                : undefined,
              ...(data.coverAmount
                ? [
                    ...(data.isImport
                      ? [
                          getOrderRow(
                            '10',
                            'Сумма платежа при перечислении средств на счет Агента',
                            `${data.coverAmount} ${data.clientCurrencyIcon}`,
                          ),
                          getOrderRow(
                            '11',
                            'Валюта платежа при перечислении средств на счет Агента',
                            `${data.clientCurrency}`,
                          ),
                        ]
                      : [
                          getOrderRow(
                            '10',
                            'Сумма платежа при перечислении средств на счет Клиента',
                            `${data.coverAmount} ${data.clientCurrencyIcon}`,
                          ),
                          getOrderRow(
                            '11',
                            'Валюта платежа при перечислении средств на счет Клиента',
                            `${data.clientCurrency}`,
                          ),
                        ]),
                    ...(data.feePercent || data.feeFix
                      ? [
                          new TableRow({
                            children: [
                              new TableCell({
                                width: column1Width,
                                children: [
                                  new CustomParagraph({
                                    children: [
                                      new CustomTextRun({
                                        text: '12',
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              new TableCell({
                                columnSpan: 2,
                                width: { ...column2Width, size: column2Width.size + column3Width.size },
                                verticalAlign: AlignmentType.CENTER,
                                children: [
                                  new CustomParagraph({
                                    children: [
                                      new CustomTextRun({
                                        text: 'Агентское вознаграждение',
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                          getOrderRow(
                            '12.1',
                            'Ставка агентского вознаграждения в соответствии с пунктом 3.2 Договора:',
                            fee,
                          ),
                          getOrderRow('12.2', 'Сумма оплаты агентского вознаграждения', feePaymentText),
                        ]
                      : []),
                  ]
                : []),
            ]),
          }),

          new CustomParagraph({
            spacing: {
              before: 400,
              after: 400,
            },
            children: [
              new CustomTextRun({
                text: 'Принципал:',
              }),
            ],
          }),

          new CustomParagraph({
            children: [
              new CustomTextRun({
                text: '___________________/',
              }),
            ],
          }),

          new CustomParagraph({
            children: [
              new CustomTextRun({
                text: data.signer,
              }),
              new CustomTextRun({
                text: `${data.clientOrganizationBusinessForm} ${data.clientOrganizationName}`,
                break: 1,
              }),
            ],
          }),
        ],
      },
    ],
  });
};
