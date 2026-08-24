import { IFormPaymentParsedData, IExcelMapping } from 'lib/interfaces/excel-parser.interface';

export interface IExcelParserService {
  parseExcel(
    buffer: Buffer,
    mapping: IExcelMapping,
    context?: { formPaymentId?: string; fileId?: string; accountId?: string },
  ): Promise<IFormPaymentParsedData>;
}
