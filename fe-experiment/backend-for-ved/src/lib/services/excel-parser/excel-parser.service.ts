import { Injectable, Logger } from '@nestjs/common';
import { Workbook } from 'exceljs';
import * as XLSX from 'xlsx';
import { IExcelParserService } from './excel-parser.service.interface';
import { IFormPaymentParsedData, IExcelMapping } from 'lib/interfaces/excel-parser.interface';
import { FormPaymentCondition, FormPaymentDirection } from 'lib/enums/models/form-payment.enums';

@Injectable()
export class ExcelParserService implements IExcelParserService {
  private readonly logger: Logger = new Logger(ExcelParserService.name);
  private readonly RUBLES_TO_KOPECKS = 100;

  private readonly ENUM_MAPPINGS = {
    direction: {
      импорт: FormPaymentDirection.IMPORT,
      import: FormPaymentDirection.IMPORT,
      экспорт: FormPaymentDirection.EXPORT,
      export: FormPaymentDirection.EXPORT,
    },
    paymentCondition: {
      advance: FormPaymentCondition.ADVANCE,
      аванс: FormPaymentCondition.ADVANCE,
      prepayment: FormPaymentCondition.ADVANCE,
      postpayment: FormPaymentCondition.POST_PAYMENT,
      постоплата: FormPaymentCondition.POST_PAYMENT,
      постпоставка: FormPaymentCondition.POST_PAYMENT,
    },
  };

  async parseExcel(
    buffer: Buffer,
    mapping: IExcelMapping,
    context?: { formPaymentId?: string; fileId?: string; accountId?: string },
  ): Promise<IFormPaymentParsedData> {
    let workbook: Workbook | null = null;
    const logPrefix = context
      ? `[form=${context.formPaymentId}, file=${context.fileId}, account=${context.accountId}]`
      : '[no-context]';

    try {
      workbook = new Workbook();
      const parsedData: IFormPaymentParsedData = {};

      // Проверка формата по magic bytes
      const isXlsFormat = this.isXlsFile(buffer);

      if (isXlsFormat) {
        this.logger.log(`${logPrefix} Detected .xls format (magic bytes), converting to .xlsx...`);
        const xlsxBuffer = this.convertXlsToXlsx(buffer);
        await workbook.xlsx.load(xlsxBuffer);
        this.logger.log(`${logPrefix} Successfully converted .xls to .xlsx`);
      } else {
        await workbook.xlsx.load(buffer);
      }

      const worksheet = workbook.worksheets[0];

      if (!worksheet) return parsedData;

      const { cells } = mapping;

      this.logger.debug(`${logPrefix} Starting cell parsing. Total cells to check: ${Object.keys(cells).length}`);

      for (const [cellRef, fieldPath] of Object.entries(cells)) {
        try {
          const cell = worksheet.getCell(cellRef);
          const rawValue = cell?.value;

          this.logger.debug(
            `${logPrefix} Cell ${cellRef} → ${fieldPath}: rawValue=${JSON.stringify(
              rawValue,
            )}, type=${typeof rawValue}`,
          );

          if (rawValue === null || rawValue === undefined || rawValue === '') continue;

          const parsedValue = this.parseFieldValue(fieldPath, rawValue);
          this.setNestedField(parsedData as Record<string, unknown>, fieldPath, parsedValue);

          this.logger.debug(`${logPrefix} Cell ${cellRef} parsed successfully: ${JSON.stringify(parsedValue)}`);
        } catch (error) {
          this.logger.debug(`${logPrefix} Error parsing cell ${cellRef} for field ${fieldPath}: ${error.message}`);
        }
      }

      this.logger.debug(`${logPrefix} Parsing complete. Extracted ${Object.keys(parsedData).length} top-level fields`);

      return parsedData;
    } catch (error) {
      this.logger.error(`${logPrefix} Error parsing Excel file: ${error.message}`);
      throw error;
    } finally {
      // ExcelJS не освобождает память после парсинга (shared strings, styles, images)
      // Удаляем ВСЕ листы вручную, иначе утечка ~200-300МБ на 100 файлов
      if (workbook?.worksheets) {
        while (workbook.worksheets.length > 0) {
          try {
            const worksheetId = workbook.worksheets[0].id;
            workbook.removeWorksheet(worksheetId);
          } catch (e) {
            break;
          }
        }
      }
      workbook = null;
    }
  }

  private isXlsFile(buffer: Buffer): boolean {
    // .xls файлы (BIFF format) начинаются с CFBF magic bytes: D0 CF 11 E0
    // .xlsx файлы (ZIP) начинаются с: 50 4B 03 04 (PK)
    if (buffer.length < 4) return false;

    const magicBytes = buffer.slice(0, 4);
    const hasXlsMagicBytes =
      magicBytes[0] === 0xd0 && magicBytes[1] === 0xcf && magicBytes[2] === 0x11 && magicBytes[3] === 0xe0;

    return hasXlsMagicBytes;
  }

  private convertXlsToXlsx(xlsBuffer: Buffer): Buffer {
    // Используем библиотеку xlsx (SheetJS) для чтения .xls и записи в .xlsx
    const xlsWorkbook = XLSX.read(xlsBuffer, { type: 'buffer' });

    // Записываем в .xlsx формат (bookType: 'xlsx')
    const xlsxBuffer = XLSX.write(xlsWorkbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return Buffer.from(xlsxBuffer);
  }

  private parseFieldValue(fieldPath: string, rawValue: unknown): unknown {
    const lowerPath = fieldPath.toLowerCase();

    if (lowerPath.includes('date') || lowerPath.includes('createdate')) return this.parseDate(rawValue);
    if (lowerPath.includes('amount')) return this.parseAmount(rawValue);

    if (lowerPath === 'totals.feepercent') {
      const num = this.parseNumber(rawValue);
      const parsedValue = num !== null ? Math.round(num * 10000) : null;
      this.logger.debug(`Parsed feePercent: raw=${rawValue} (Excel decimal) → basis points=${parsedValue}`);
      return parsedValue;
    }
    if (lowerPath.includes('percent') || lowerPath.includes('rate')) return this.parseNumber(rawValue);
    if (lowerPath.includes('currency')) return typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : null;
    if (lowerPath.includes('direction') || lowerPath.includes('paymentcondition'))
      return this.parseEnum(fieldPath, rawValue);
    if (typeof rawValue === 'string') return rawValue.trim() || null;

    return rawValue || null;
  }

  private parseDate(rawValue: unknown): string | null {
    if (rawValue instanceof Date) return rawValue.toISOString();
    if (typeof rawValue === 'string') return rawValue.trim() || null;

    if (typeof rawValue === 'number') {
      // Excel serial date number
      try {
        const date = new Date((rawValue - 25569) * 86400 * 1000);
        return date.toISOString();
      } catch (e) {
        return null;
      }
    }

    return null;
  }

  private parseAmount(rawValue: unknown): number | null {
    const numValue = this.parseNumber(rawValue);
    if (numValue === null) return null;

    // Используем toFixed для избежания floating point errors
    const kopecks = parseFloat((numValue * this.RUBLES_TO_KOPECKS).toFixed(2));
    return Math.round(kopecks);
  }

  private parseNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const parsed = parseFloat(trimmed);
      return !isNaN(parsed) ? parsed : null;
    }

    return null;
  }

  private parseEnum(fieldPath: string, value: unknown): unknown {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();

    if (fieldPath.includes('direction')) return this.ENUM_MAPPINGS.direction[normalized] || null;
    if (fieldPath.includes('paymentCondition')) return this.ENUM_MAPPINGS.paymentCondition[normalized] || null;

    return null;
  }

  private setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');

    const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
    for (const part of parts) {
      if (DANGEROUS_KEYS.includes(part)) {
        this.logger.warn(`Rejected dangerous key in mapping path: ${path}`);
        return;
      }
    }

    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!(part in current)) {
        current[part] = Object.create(null);
      } else if (typeof current[part] !== 'object' || current[part] === null) {
        this.logger.warn(`Cannot traverse path ${path}: ${part} is not an object`);
        return;
      }

      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }
}
