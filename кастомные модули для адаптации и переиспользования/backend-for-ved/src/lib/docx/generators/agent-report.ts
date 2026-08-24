import {
  Document,
  HorizontalPositionRelativeFrom,
  ImageRun,
  TableCell,
  TableRow,
  VerticalPositionRelativeFrom,
  WidthType,
} from 'docx';
import {
  docxBorderParams,
  docxDefaultNumberingLevelConfig,
  docxFullWidthTable,
  docxParagraphListIndentParams,
  docxSectionProperties,
  docxSmallFontSize,
} from '../constants';
import { CustomParagraph } from '../components/CustomParagraph';
import { CustomTextRun } from '../components/CustomTextRun';
import { CustomTable } from '../components/CustomTable';

export const getAgentReportDocument = (data: any) => {
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
                text: `Отчёт агента № ${data.reportNumber}`,
              }),
            ],
          }),

          new CustomParagraph({
            alignment: 'right',
            children: [
              new CustomTextRun({
                text: `${data.date} г.`,
              }),
            ],
          }),

          new CustomParagraph({
            alignment: 'both',
            children: [
              new CustomTextRun({
                text:
                  `${data.agentCompany}, именуемое в дальнейшем «Агент», в лице ${data.agentPositionGenitive} ` +
                  `${data.agentNameGenitive}, действующего на основании ${data.principalBasis}, представляет, ` +
                  `а ${data.principalCompany}, именуемое «Принципал», в лице ${data.principalPositionGenitive} ` +
                  `${data.principalNameGenitive}, действующего на основании ${data.principalBasis}, ` +
                  `в рамках Агентского Договора № ${data.contractInfo.number} от ${data.contractInfo.date} года, ` +
                  `именуемого «Договор», принимает настоящий Отчёт об исполнении Поручения Принципала № ${data.orderNumber} ` +
                  `от ${data.orderDate} года, именуемое «Поручение».`,
              }),
            ],
          }),

          new CustomParagraph({
            alignment: 'both',
            spacing: {
              bottom: 150,
            },
            indent: docxParagraphListIndentParams,
            children: [
              new CustomTextRun({
                text:
                  `В результате оказания услуг Агент, по поручению и в интересах Принципала, перечислил ` +
                  `${data.beneficiaryName} от invoice ${data.invoiceNumber} date ${data.invoiceDate} ` +
                  `денежные средства в сумме ${data.amount} ${data.currency} ` +
                  `(${data.amountInWords}), что эквивалентно сумме ` +
                  `${data.convertedAmount} ${data.convertedCurrency} (${data.convertedAmountInWords}).`,
              }),
            ],
            numbering: {
              reference: 'numering-1',
              level: 0,
            },
          }),
          new CustomParagraph({
            alignment: 'both',
            spacing: {
              bottom: 150,
            },
            indent: docxParagraphListIndentParams,
            children: [
              new CustomTextRun({
                text:
                  `Факт исполнения обязательств Агентом в соответствии с пунктом 2.3 Договора подтверждается ` +
                  `банковским документом и является неотъемлемой частью к настоящему Отчёту Агента.`,
              }),
              ...(data.paymentNumber && data.paymentDate
                ? [
                    new CustomTextRun({
                      text: ` Платёжное поручение от ${data.paymentDate} № ${data.paymentNumber}.`,
                    }),
                  ]
                : []),
            ],
            numbering: {
              reference: 'numering-1',
              level: 0,
            },
          }),
          new CustomParagraph({
            alignment: 'both',
            spacing: {
              bottom: 150,
            },
            indent: docxParagraphListIndentParams,
            children: [
              new CustomTextRun({
                text:
                  `В рамках Договора Принципал перечисляет в возмещение затрат Агенту сумму в размере ` +
                  `${data.convertedAmount} ${data.convertedCurrency} (${data.convertedAmountInWords}).`,
              }),
            ],
            numbering: {
              reference: 'numering-1',
              level: 0,
            },
          }),
          new CustomParagraph({
            alignment: 'both',
            indent: docxParagraphListIndentParams,
            children: [
              new CustomTextRun({
                text:
                  `Сумма вознаграждения Агента в соответствии с пунктом 3.2 Договора составляет ` +
                  `${data.commissionAmount} ${data.convertedCurrency}, которая определяется как ` +
                  // проверяем условия процента или фикс комиссии
                  `${
                    data.commissionPercent && !data.feeFix
                      ? `${data.commissionPercent}% от ${data.amount} ${data.currency},`
                      : ''
                  }` +
                  `${!data.commissionPercent && data.feeFix ? `${data.feeFix} ${data.feeFixCurrency}` : ''}` +
                  `${
                    data.commissionPercent && data.feeFix
                      ? `${data.commissionPercent}% от ${data.amount} ${data.currency} и ${data.feeFix} ${data.feeFixCurrency},`
                      : ''
                  }` +
                  // закончили проверку
                  ` пересчитанных в ${data.convertedCurrency} по курсу ` +
                  // проверка фикс комиссии и процента
                  `${data.commissionPercent && !data.feeFix ? `${data.rate}` : ''}` +
                  `${!data.commissionPercent && data.feeFix ? `${data.currencyFeeRate}` : ''}` +
                  `${
                    data.commissionPercent && data.feeFix ? `${data.rate} и ${data.currencyFeeRate} соответственно` : ''
                  }` +
                  // закончили проверку
                  ', указанному(ой) в Поручении № ' +
                  `${data.orderNumber} от ${data.orderDate} года.`,
              }),
            ],
            numbering: {
              reference: 'numering-1',
              level: 0,
            },
          }),

          new CustomParagraph({
            spacing: { after: 0 },
            children: [
              new CustomTextRun({
                text:
                  `Услуги оказаны в установленные сроки, в полном объёме и ` +
                  `с надлежащим качеством. Претензий друг к другу Стороны не имеют.`,
              }),
            ],
          }),

          new CustomParagraph({
            spacing: { after: 0, before: 0 },
            children: [
              data.agentSignatureBase64
                ? new ImageRun({
                    type: 'png',
                    data: data.agentSignatureBase64,
                    transformation: {
                      width: 94, // 3 см
                      height: 94, // 3 см
                    },
                    floating: {
                      horizontalPosition: {
                        relative: HorizontalPositionRelativeFrom.COLUMN, // только COLUMN одинаково позиционирует во всех программах
                        offset: 3400000,
                      },
                      verticalPosition: {
                        relative: VerticalPositionRelativeFrom.LINE, // Плавающее позиционирование относительно первой линии родителя
                        offset: -100000,
                      },
                    },
                  })
                : undefined,
              data.agentStampBase64
                ? new ImageRun({
                    type: 'png',
                    data: data.agentStampBase64,
                    transformation: {
                      width: 189, // 5см
                      height: 189, // 5см
                    },
                    floating: {
                      horizontalPosition: {
                        relative: HorizontalPositionRelativeFrom.COLUMN, // только COLUMN одинаково позиционирует во всех программах
                        offset: 4100000,
                      },
                      verticalPosition: {
                        relative: VerticalPositionRelativeFrom.LINE, // Плавающее позиционирование относительно первой линии родителя
                        offset: 0,
                      },
                    },
                  })
                : undefined,
            ],
          }),

          new CustomTable({
            columnWidths: [docxFullWidthTable / 2, docxFullWidthTable / 2],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: docxFullWidthTable / 2, type: WidthType.DXA },
                    children: [
                      new CustomParagraph({
                        spacing: {
                          after: 400,
                        },
                        children: [
                          new CustomTextRun({
                            text: 'Принципал:',
                          }),
                        ],
                      }),
                      new CustomParagraph({
                        spacing: {
                          after: 100,
                        },
                        border: {
                          bottom: docxBorderParams,
                        },
                      }),
                      new CustomParagraph({
                        children: [
                          new CustomTextRun({
                            text: data.principalPosition,
                          }),
                          new CustomTextRun({
                            text: data.principalCompany,
                            break: 1,
                          }),
                          new CustomTextRun({
                            text: data.principalName,
                            break: 1,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: docxFullWidthTable / 2, type: WidthType.DXA },
                    children: [
                      new CustomParagraph({
                        spacing: {
                          after: 400,
                        },
                        children: [
                          new CustomTextRun({
                            text: 'Агент:',
                          }),
                        ],
                      }),
                      new CustomParagraph({
                        spacing: {
                          after: 100,
                        },
                        border: {
                          bottom: docxBorderParams,
                        },
                      }),
                      new CustomParagraph({
                        children: [
                          new CustomTextRun({
                            text: data.agentPosition,
                          }),
                          new CustomTextRun({
                            text: data.agentCompany,
                            break: 1,
                          }),
                          new CustomTextRun({
                            text: data.agentName,
                            break: 1,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new CustomParagraph({
            alignment: 'both',
            spacing: {
              before: 200,
            },
            children: [
              new CustomTextRun({
                text: '2',
                superScript: true,
                size: docxSmallFontSize,
              }),
              new CustomTextRun({
                text: ' При необходимости Приложение №2 "Форма Отчета Агента" может быть дополнено необходимой информацией.',
                size: docxSmallFontSize,
              }),
            ],
          }),
        ],
      },
    ],
  });
};
