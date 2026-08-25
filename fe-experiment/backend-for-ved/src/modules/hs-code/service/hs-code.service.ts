import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import { BaseService } from 'lib/services/base/base.service';
import { IHsCode } from 'lib/interfaces/models/hs-code.interface';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { IPaginateOptions, IPaginateResult } from 'lib/interfaces/paginate.interface';
import { HsCode } from './hs-code.schema';
import {
  IHsCodeCreate,
  IHsCodeQuery,
  IHsCodeService,
  IHsCodeUpdate,
  IHsCodeImportResult,
} from './hs-code.service.interface';
import * as xlsx from 'xlsx';
import { HsCodeLoyalty } from 'lib/enums/models/hs-code.enums';
import { FORM_PAYMENT_SERVICE } from '../../../modules/form-payment/form-payment.constants';
import { ORGANIZATION_SERVICE } from '../../../modules/organization/organization.constants';
import { IFormPaymentService } from '../../../modules/form-payment/service/form-payment.service.interface';
import { IOrganizationService } from '../../../modules/organization/service/organization.service.interface';

const EXCEL_COLUMNS = {
  CHAPTER: 'Глава',
  SECTION: 'Раздел',
  TYPE: 'Тип',
  CODE: 'Код',
  LOYALTY: 'Заключение',
  COMMENT: 'Комментарий ',
} as const;

interface BulkOp {
  updateOne: {
    filter: { code: string };
    update: {
      $set: {
        code: string;
        chapter?: string;
        section?: string;
        type?: string;
        loyalty: HsCodeLoyalty;
        comment?: string;
        active: boolean;
      };
    };
    upsert: boolean;
  };
}

interface BulkContext {
  bulkOps: BulkOp[];
  errors: string[];
  warnings: string[];
  currentChapter: string;
  currentSection: string;
  currentType: string;
}

interface RowData {
  chapter: string;
  section: string;
  type: string;
  codes: string;
  loyaltyStr: string;
  comment?: string;
}

@Injectable()
export class HsCodeService
  extends BaseService<IHsCode, HsCode, IHsCodeQuery, IBaseOptions, IHsCodeCreate>
  implements IHsCodeService, OnModuleInit
{
  private readonly logger = new Logger(HsCodeService.name);

  constructor(
    @InjectModel(HsCode.name) readonly model: PaginateModel<HsCode>,
    @Inject(forwardRef(() => FORM_PAYMENT_SERVICE)) private readonly formPaymentService: IFormPaymentService,
    @Inject(forwardRef(() => ORGANIZATION_SERVICE)) private readonly organizationService: IOrganizationService,
  ) {
    super();
  }

  onModuleInit() {
    this.model.syncIndexes();
  }

  async findByCode(code: string): Promise<IHsCode | undefined> {
    return this.findOne({ code });
  }

  async findActive(search?: string, options?: IPaginateOptions): Promise<IPaginateResult<IHsCode>> {
    const query: FilterQuery<HsCode> = { active: true };

    if (search) {
      // Escape regex special characters to prevent ReDoS vulnerability
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.$or = [
        { code: { $regex: escapedSearch.replace(/\s+/g, ''), $options: 'i' } },
        { chapter: { $regex: escapedSearch, $options: 'i' } },
        { section: { $regex: escapedSearch, $options: 'i' } },
        { type: { $regex: escapedSearch, $options: 'i' } },
        { comment: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const populate = this.makePopulate(options);
    const paginateResult = await this.model.hasNextPaginate(query, { ...options, populate });

    if (!paginateResult.docs.length) {
      return paginateResult as IPaginateResult<IHsCode>;
    }

    return {
      ...paginateResult,
      docs: await this.mapMany(paginateResult.docs, options),
    };
  }

  async deactivate(hsCodeId: string): Promise<IHsCode> {
    const hsCode = await this.findOneOrException({ _id: hsCodeId });

    this.logger.debug(`Deactivating HS code: ${hsCode.code}`);

    const updated = await this.updateOneOrException({ _id: hsCodeId }, { active: false } as IHsCodeUpdate);

    await this.formPaymentService.updateSnapshotsOnDeactivate(hsCode.code, hsCodeId);

    return updated;
  }

  async activate(hsCodeId: string): Promise<IHsCode> {
    const hsCode = await this.findOneOrException({ _id: hsCodeId });

    this.logger.debug(`Activating HS code: ${hsCode.code}`);

    const updated = await this.updateOneOrException({ _id: hsCodeId }, { active: true } as IHsCodeUpdate);

    const activatedHsCode = { ...hsCode, active: true };
    await this.formPaymentService.updateSnapshotsOnActivate(activatedHsCode);

    return updated;
  }

  async deleteHsCode(hsCodeId: string): Promise<void> {
    const hsCode = await this.findOneOrException({ _id: hsCodeId });
    const code = hsCode.code;
    const prefix = code.slice(0, 2);

    this.logger.debug(`Deleting HS code: ${code}`);

    const errors: string[] = [];

    try {
      await this.deleteOne({ _id: hsCodeId });
      this.logger.debug(`✓ Deleted HS code ${code} from catalog`);
    } catch (error) {
      this.logger.error(`Failed to delete HS code ${code}`, error);
      throw new Error(`Failed to delete HS code ${code}: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.formPaymentService.updateSnapshotsOnDelete(code);
      this.logger.debug(`✓ Updated form snapshots for HS code ${code}`);
    } catch (error) {
      this.logger.error(`Failed to update forms after deleting ${code}`, error);
      errors.push(`Forms update failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.organizationService.removeHsCode(code, prefix);
      this.logger.debug(`✓ Removed HS code ${code} from organizations`);
    } catch (error) {
      this.logger.error(`Failed to remove ${code} from organizations`, error);
      errors.push(`Organizations update failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (errors.length > 0) {
      throw new Error(
        `HS code ${code} was deleted, but cascading updates failed:\n${errors.join(
          '\n',
        )}\nManual cleanup may be required.`,
      );
    }
  }

  async importFromExcel(buffer: Buffer): Promise<IHsCodeImportResult> {
    this.logger.debug('Starting HS codes import from Excel');

    const rows = this.parseExcelFile(buffer);
    const { bulkOps, errors, warnings } = this.buildBulkOperations(rows);
    const result = await this.executeBulkImport(bulkOps);

    return { ...result, errors, warnings, totalRows: rows.length };
  }

  private parseExcelFile(buffer: Buffer): unknown[] {
    const workbook = xlsx.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(worksheet);
  }

  private buildBulkOperations(rows: unknown[]): {
    bulkOps: BulkOp[];
    errors: string[];
    warnings: string[];
  } {
    const context: BulkContext = {
      bulkOps: [],
      errors: [],
      warnings: [],
      currentChapter: '',
      currentSection: '',
      currentType: '',
    };

    for (let i = 0; i < rows.length; i++) {
      this.processRowIntoBulkOps(rows[i] as Record<string, unknown>, i + 2, context);
    }

    return {
      bulkOps: context.bulkOps,
      errors: context.errors,
      warnings: context.warnings,
    };
  }

  private processRowIntoBulkOps(excelRow: Record<string, unknown>, rowNum: number, context: BulkContext): void {
    const rowData = this.extractRowData(excelRow, context);

    const loyalty = this.mapLoyalty(rowData.loyaltyStr);
    if (!loyalty) {
      context.errors.push(`Row ${rowNum}: Invalid loyalty "${rowData.loyaltyStr}"`);
      return;
    }

    if (!rowData.codes) {
      context.warnings.push(`Row ${rowNum}: Missing code`);
      return;
    }

    this.addCodesFromRowToBulkOps(rowData, loyalty, context);
    this.updateContextWithRowData(rowData, context);
  }

  private extractRowData(excelRow: Record<string, unknown>, context: BulkContext): RowData {
    return {
      chapter: String(excelRow[EXCEL_COLUMNS.CHAPTER] ?? context.currentChapter).trim(),
      section: String(excelRow[EXCEL_COLUMNS.SECTION] ?? context.currentSection).trim(),
      type: String(excelRow[EXCEL_COLUMNS.TYPE] ?? context.currentType).trim(),
      codes: String(excelRow[EXCEL_COLUMNS.CODE] ?? '').trim(),
      loyaltyStr: String(excelRow[EXCEL_COLUMNS.LOYALTY] ?? '')
        .trim()
        .toLowerCase(),
      comment: String(excelRow[EXCEL_COLUMNS.COMMENT] ?? '').trim() || undefined,
    };
  }

  private updateContextWithRowData(rowData: RowData, context: BulkContext): void {
    if (rowData.chapter) context.currentChapter = rowData.chapter;
    if (rowData.section) context.currentSection = rowData.section;
    if (rowData.type) context.currentType = rowData.type;
  }

  private addCodesFromRowToBulkOps(rowData: RowData, loyalty: HsCodeLoyalty, context: BulkContext): void {
    const codeList = rowData.codes.split(',').map((c) => c.trim().replace(/\s+/g, ''));

    for (const code of codeList) {
      if (!code) continue;

      context.bulkOps.push({
        updateOne: {
          filter: { code },
          update: {
            $set: {
              code,
              chapter: rowData.chapter || undefined,
              section: rowData.section || undefined,
              type: rowData.type || undefined,
              loyalty,
              comment: rowData.comment,
              active: true,
            },
          },
          upsert: true,
        },
      });
    }
  }

  private async executeBulkImport(bulkOps: BulkOp[]): Promise<{
    imported: number;
    updated: number;
  }> {
    if (bulkOps.length === 0) {
      return { imported: 0, updated: 0 };
    }

    const result = await this.model.bulkWrite(bulkOps);
    const imported = result.upsertedCount ?? 0;
    const updated = result.modifiedCount ?? 0;

    this.logger.debug(`HS codes import completed: imported=${imported}, updated=${updated}, total=${bulkOps.length}`);

    return { imported, updated };
  }

  async createFromManualCode(
    code: string,
    description: string,
    loyalty: HsCodeLoyalty,
    comment?: string,
  ): Promise<IHsCode> {
    this.logger.debug(`Creating manual HS code "${code}" with loyalty "${loyalty}"`);

    const existing = await this.findByCode(code);
    if (existing) {
      this.logger.warn(`HS code "${code}" already exists, returning existing`);
      return existing;
    }

    const newCode = await this.create({
      code,
      description,
      loyalty,
      comment,
      active: true,
    } as IHsCodeCreate);

    this.logger.debug(`Created manual HS code: ${code}`);
    return newCode;
  }

  private mapLoyalty(value: string): HsCodeLoyalty | null {
    const normalized = value.toLowerCase().trim();
    switch (normalized) {
      case 'ок':
      case 'ok':
        return HsCodeLoyalty.OK;
      case 'не совсем ок':
      case 'not_quite_ok':
      case 'medium':
        return HsCodeLoyalty.NOT_QUITE_OK;
      case 'не ок':
      case 'not_ok':
      case 'high':
        return HsCodeLoyalty.NOT_OK; // Now requires verification (not auto-reject!)
      case 'нет':
      case 'reject':
        return HsCodeLoyalty.REJECT; // Critical - requires manual verification
      default:
        return null;
    }
  }

  protected async makeQuery(query: IHsCodeQuery): Promise<FilterQuery<HsCode>> {
    return this.buildFindQuery(query);
  }

  protected buildFindQuery(query: IHsCodeQuery): FilterQuery<HsCode> {
    const filter: FilterQuery<HsCode> = {};

    if (query._id) {
      filter._id = query._id;
    }

    if (query._ids?.length) {
      filter._id = { $in: query._ids };
    }

    if (query.code) {
      filter.code = query.code;
    }

    if (query.codes?.length) {
      filter.code = { $in: query.codes };
    }

    if (query.active !== undefined) {
      filter.active = query.active;
    }

    if (query.loyalty) {
      filter.loyalty = query.loyalty;
    }

    return filter;
  }

  async countByRegex(codeRegex: string, active?: boolean): Promise<number> {
    const filter: FilterQuery<HsCode> = { code: { $regex: codeRegex } };
    if (active !== undefined) {
      filter.active = active;
    }
    return this.model.countDocuments(filter);
  }
}
