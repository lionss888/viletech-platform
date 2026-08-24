import { BadRequestException, Injectable, Logger, StreamableFile, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import * as ExcelJS from 'exceljs';
import moment from 'moment';
import { PassThrough } from 'stream';
import { IGenerateReportsService } from './generate-reports.service.interface';
import { Organization } from '../../../organization/service/organization.schema';
import { FormPayment } from '../../../form-payment/service/form-payment.schema';
import { FormPaymentStatusSchema } from '../../../form-payment/service/history/form-payment-status.schema';
import { ClientOrganizationQueryDto } from '../../dto/client-organization.query.dto';
import { ClientOrganizationRequestsPaginateDto } from '../../dto/client-organization-requests.query.dto';
import { AccountRole } from 'lib/enums/models/account.enums';
import { OrganizationType } from 'lib/enums/models/organization.enums';
import { FormPaymentDirection, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { ComplianceHistoryService } from '../compliance-history.service';
import { ComplianceAggregationUtils } from '../../utils/aggregation.utils';
import {
  INTERNAL_PENDING_STATUSES,
  INTERNAL_APPROVED_STAGES,
  INTERNAL_REJECTED_STATUSES,
  INTERNAL_OTHER_STATUSES,
  INTERNAL_CANCELED_STATUSES,
} from '../../compliance-history.constants';

const MAX_EXPORT_LIMIT = 1000;
const TIMEZONE_OFFSET_HOURS = 3; // Moscow time (UTC+3)
const AMOUNT_TO_CURRENCY_DIVISOR = 100; // Amount stored in kopeks/cents, display in rubles/dollars

const DIRECTION_MAP = {
  [FormPaymentDirection.EXPORT]: 'Экспорт',
  [FormPaymentDirection.IMPORT]: 'Импорт',
} as const;

interface OrgWithStats {
  _id: string;
  name: string;
  inn: string;
  ogrn?: string;
  legalAddress?: string;
  email?: string;
  phone?: string;
  status: string;
  statusUpdatedAt?: Date;
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  otherCount: number;
}

interface FormPaymentForReport {
  _id: string;
  uid: string;
  createDate: Date;
  direction: string;
  counterparty?: { name?: string; country?: string; accountNumber?: string; swiftCode?: string };
  totals?: { amount: number };
  currency?: { client: string; counterparty: string };
  status: string;
  stage: string;
  organization?: { name?: string; inn?: string };
}

interface FormStatusConfig {
  pendingStatuses: readonly string[];
  approvedStages: readonly string[];
  rejectedStatuses: readonly string[];
  otherStatuses: readonly string[];
  canceledStatuses: readonly string[];
}

const internalFormStatuses: FormStatusConfig = {
  pendingStatuses: INTERNAL_PENDING_STATUSES,
  approvedStages: INTERNAL_APPROVED_STAGES,
  rejectedStatuses: INTERNAL_REJECTED_STATUSES,
  otherStatuses: INTERNAL_OTHER_STATUSES,
  canceledStatuses: INTERNAL_CANCELED_STATUSES,
};

@Injectable()
export class GenerateReportsService implements IGenerateReportsService {
  private readonly logger = new Logger(GenerateReportsService.name);

  constructor(
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
    @InjectModel(FormPayment.name) private readonly formPaymentModel: Model<FormPayment>,
    @InjectModel(FormPaymentStatusSchema.name)
    private readonly formPaymentStatusModel: Model<FormPaymentStatusSchema>,
    private readonly complianceHistoryService: ComplianceHistoryService,
  ) {}

  async generateInternalComplianceReport(filters: ClientOrganizationQueryDto): Promise<StreamableFile> {
    const matchStage = this.buildOrganizationsMatchStage(filters);

    const count = await this.organizationModel.countDocuments(matchStage);
    if (count > MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Превышен лимит выгрузки: найдено ${count} записей, максимум ${MAX_EXPORT_LIMIT}. Уточните фильтры.`,
      );
    }

    const organizations = await this.fetchOrganizationsForReport(matchStage, internalFormStatuses);
    const workbook = this.createInternalComplianceWorkbook(organizations);

    return this.streamWorkbook(workbook, 'internal-compliance-clients');
  }

  async generateExternalComplianceReport(filters: ClientOrganizationQueryDto): Promise<StreamableFile> {
    const matchStage = this.buildFormPaymentsMatchStage(filters);

    const count = await this.formPaymentModel.countDocuments(matchStage);
    if (count > MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Превышен лимит выгрузки: найдено ${count} записей, максимум ${MAX_EXPORT_LIMIT}. Уточните фильтры.`,
      );
    }

    const formPayments = await this.fetchFormPaymentsForReport(matchStage);
    const fpIds = formPayments.map((formPayment) => formPayment._id);
    const decisionMap = await this.fetchDecisionDates(fpIds);
    const workbook = this.createExternalComplianceWorkbook(formPayments, decisionMap);

    return this.streamWorkbook(workbook, 'external-compliance-deals');
  }

  async generateClientRequestsReport(
    organizationId: string,
    role: AccountRole,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Promise<StreamableFile> {
    const organization = await this.organizationModel
      .findOne({ _id: organizationId, type: OrganizationType.USER })
      .select('_id name inn')
      .lean();

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const formPayments = await this.complianceHistoryService.getClientRequestsForExport(organizationId, role, filters);

    if (formPayments.length > MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Превышен лимит выгрузки: найдено ${formPayments.length} записей, максимум ${MAX_EXPORT_LIMIT}. Уточните фильтры.`,
      );
    }

    const formPaymentsTyped = formPayments as FormPaymentForReport[];
    const fpIds = formPaymentsTyped.map((fp) => fp._id);
    const decisionMap = await this.fetchDecisionDates(fpIds);

    const orgInfo = {
      _id: organization._id.toString(),
      name: organization.name,
      inn: organization.inn,
    };

    const workbook = this.createClientRequestsWorkbook(orgInfo, formPaymentsTyped, decisionMap);

    const roleSuffix = role === AccountRole.INTERNAL_COMPLIANCE_OFFICER ? 'ico' : 'co';
    return this.streamWorkbook(workbook, `client-${organization.inn}-requests-${roleSuffix}`);
  }

  private buildOrganizationsMatchStage(filters: ClientOrganizationQueryDto): Record<string, unknown> {
    const { search, status, dateFrom, dateTo } = filters;

    const matchStage: Record<string, unknown> = {
      type: OrganizationType.USER,
      isDeleted: { $ne: true },
    };

    if (search) {
      matchStage.$or = [{ name: { $regex: search, $options: 'i' } }, { inn: { $regex: search, $options: 'i' } }];
    }

    if (status) {
      matchStage.status = status;
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) {
        dateQuery.$gte = dateFrom;
      }
      if (dateTo) {
        dateQuery.$lte = dateTo;
      }
      matchStage.createDate = dateQuery;
    }

    return matchStage;
  }

  private async fetchOrganizationsForReport(
    matchStage: Record<string, unknown>,
    statusConfig: FormStatusConfig,
  ): Promise<unknown[]> {
    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      ComplianceAggregationUtils.buildRequestStatsLookup(statusConfig),
      ComplianceAggregationUtils.buildStatusHistoryLookup(),
      { $sort: { createDate: -1 } },
      ComplianceAggregationUtils.buildOrganizationProjection(),
    ];

    return this.organizationModel.aggregate(pipeline);
  }

  private createInternalComplianceWorkbook(organizations: unknown[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Клиенты');

    const headers = [
      'Название организации',
      'ИНН',
      'ОГРН',
      'Юридический адрес',
      'Email',
      'Телефон',
      'Статус организации',
      'Дата статуса',
      'Всего заявок',
      'Заявок одобрено',
      'Заявок отклонено',
      'Заявок на проверке',
      'Другие заявки',
    ];

    worksheet.columns = headers.map((header, index) => ({
      header,
      key: `col${index}`,
      width: 20,
    }));

    worksheet.getRow(1).font = { bold: true, size: 11, name: 'Arial' };

    organizations.forEach((org: OrgWithStats) => {
      worksheet.addRow({
        col0: org.name || '',
        col1: org.inn || '',
        col2: org.ogrn || '',
        col3: org.legalAddress || '',
        col4: org.email || '',
        col5: org.phone || '',
        col6: org.status || '',
        col7: this.formatDate(org.statusUpdatedAt),
        col8: org.totalRequests || 0,
        col9: org.approvedCount || 0,
        col10: org.rejectedCount || 0,
        col11: org.pendingCount || 0,
        col12: org.otherCount || 0,
      });
    });

    return workbook;
  }

  private streamWorkbook(workbook: ExcelJS.Workbook, filePrefix: string): StreamableFile {
    const stream = new PassThrough();
    workbook.xlsx.write(stream);

    return new StreamableFile(stream, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filePrefix}-${moment().format('YYYY-MM-DD')}.xlsx"`,
    });
  }

  private buildFormPaymentsMatchStage(filters: ClientOrganizationQueryDto): Record<string, unknown> {
    const { search, status, dateFrom, dateTo } = filters;

    const matchStage: Record<string, unknown> = {};

    if (search) {
      matchStage.$or = [
        { 'organization.name': { $regex: search, $options: 'i' } },
        { 'organization.inn': { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) {
        dateQuery.$gte = dateFrom;
      }
      if (dateTo) {
        dateQuery.$lte = dateTo;
      }
      matchStage.createDate = dateQuery;
    }

    if (status) {
      matchStage['organization.status'] = status;
    }

    return matchStage;
  }

  private async fetchFormPaymentsForReport(matchStage: Record<string, unknown>): Promise<FormPaymentForReport[]> {
    return this.formPaymentModel
      .find(matchStage)
      .select(
        '_id uid createDate direction counterparty totals currency status stage organization.name organization.inn',
      )
      .sort({ createDate: -1 })
      .lean();
  }

  private async fetchDecisionDates(fpIds: unknown[]): Promise<Map<string, Date>> {
    const decisions = await this.formPaymentStatusModel
      .find({
        formPaymentId: { $in: fpIds },
        status: {
          $in: [FormPaymentStatus.FORM_ACCEPTED, FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER],
        },
      })
      .sort({ createDate: -1 })
      .lean();

    const decisionMap = new Map<string, Date>();
    decisions.forEach((d) => {
      const key = d.formPaymentId.toString();
      if (!decisionMap.has(key)) {
        decisionMap.set(key, d.createDate);
      }
    });

    return decisionMap;
  }

  private createExternalComplianceWorkbook(
    formPayments: FormPaymentForReport[],
    decisionMap: Map<string, Date>,
  ): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Сделки');

    const headers = [
      'Название организации клиента',
      'ИНН клиента',
      'ID заявки',
      'Дата создания заявки',
      'Направление',
      'Контрагент (название)',
      'Страна контрагента',
      'Номер счёта контрагента',
      'SWIFT код',
      'Сумма платежа',
      'Валюта клиента',
      'Валюта контрагента',
      'Статус сделки',
      'Дата решения',
    ];

    worksheet.columns = headers.map((header, index) => ({
      header,
      key: `col${index}`,
      width: 20,
    }));

    worksheet.getRow(1).font = { bold: true, size: 11, name: 'Arial' };

    formPayments.forEach((formPayment) => {
      const decisionDate = decisionMap.get(formPayment._id.toString());

      worksheet.addRow({
        col0: formPayment.organization?.name || '',
        col1: formPayment.organization?.inn || '',
        col2: formPayment.uid || '',
        col3: this.formatDate(formPayment.createDate),
        col4: this.getDirectionLabel(formPayment.direction),
        col5: formPayment.counterparty?.name || '',
        col6: formPayment.counterparty?.country || '',
        col7: formPayment.counterparty?.accountNumber || '',
        col8: formPayment.counterparty?.swiftCode || '',
        col9: this.formatAmount(formPayment.totals?.amount),
        col10: formPayment.currency?.client?.toUpperCase() || '',
        col11: formPayment.currency?.counterparty?.toUpperCase() || '',
        col12: formPayment.status || '',
        col13: this.formatDate(decisionDate),
      });
    });

    return workbook;
  }

  private createClientRequestsWorkbook(
    organization: { _id: string; name: string; inn: string },
    formPayments: FormPaymentForReport[],
    decisionMap: Map<string, Date>,
  ): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Заявки - ${organization.name}`);

    const headers = [
      'ID заявки',
      'Дата создания',
      'Направление',
      'Статус',
      'Этап',
      'Контрагент',
      'Сумма',
      'Валюта клиента',
      'Валюта контрагента',
      'Дата решения',
    ];

    worksheet.columns = headers.map((header, index) => ({
      header,
      key: `col${index}`,
      width: index === 3 || index === 4 ? 30 : 20,
    }));

    worksheet.getRow(1).font = { bold: true, size: 11, name: 'Arial' };

    formPayments.forEach((formPayment) => {
      const decisionDate = decisionMap.get(formPayment._id.toString());

      worksheet.addRow({
        col0: formPayment.uid || '',
        col1: this.formatDate(formPayment.createDate),
        col2: this.getDirectionLabel(formPayment.direction),
        col3: formPayment.status || '',
        col4: formPayment.stage || '',
        col5: formPayment.counterparty?.name || '',
        col6: this.formatAmount(formPayment.totals?.amount),
        col7: formPayment.currency?.client?.toUpperCase() || '',
        col8: formPayment.currency?.counterparty?.toUpperCase() || '',
        col9: this.formatDate(decisionDate),
      });
    });

    return workbook;
  }

  private formatDate(date?: Date): string {
    return date ? moment(date).utcOffset(TIMEZONE_OFFSET_HOURS).format('DD.MM.YYYY HH:mm') : '';
  }

  private formatAmount(amount?: number): number {
    return amount ? amount / AMOUNT_TO_CURRENCY_DIVISOR : 0;
  }

  private getDirectionLabel(direction: string): string {
    return DIRECTION_MAP[direction] || direction || '';
  }
}
