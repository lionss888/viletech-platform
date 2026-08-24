import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { IComplianceHistoryService } from './compliance-history.service.interface';
import { Organization } from '../../organization/service/organization.schema';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { ClientOrganizationPaginateDto } from '../dto/client-organization.query.dto';
import { ClientOrganizationListDto } from '../dto/client-organization-list.dto';
import { ClientOrganizationDto } from '../dto/client-organization.dto';
import {
  ClientOrganizationRequestsPaginateDto,
  RequestStatusFilterType,
} from '../dto/client-organization-requests.query.dto';
import {
  ClientOrganizationRequestsDto,
  ClientOrganizationRequestItemDto,
} from '../dto/client-organization-requests.dto';
import { AccountRole } from 'lib/enums/models/account.enums';
import { OrganizationType } from 'lib/enums/models/organization.enums';
import { ComplianceAggregationUtils } from '../utils/aggregation.utils';
import { CounterpartyService } from '../../counterparty/service/counterparty.service';
import { ICounterparty } from 'lib/interfaces/models/counterparty.interface';
import { IFormBankDetails } from 'lib/interfaces/models/form-payment.interface';
import {
  INTERNAL_PENDING_STATUSES,
  INTERNAL_APPROVED_STAGES,
  INTERNAL_REJECTED_STATUSES,
  INTERNAL_OTHER_STATUSES,
  INTERNAL_CANCELED_STATUSES,
  EXTERNAL_PENDING_STATUSES,
  EXTERNAL_APPROVED_STAGES,
  EXTERNAL_REJECTED_STATUSES,
  EXTERNAL_CANCELED_STATUSES,
} from '../compliance-history.constants';

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

const externalFormStatuses: FormStatusConfig = {
  pendingStatuses: EXTERNAL_PENDING_STATUSES,
  approvedStages: EXTERNAL_APPROVED_STAGES,
  rejectedStatuses: EXTERNAL_REJECTED_STATUSES,
  otherStatuses: [],
  canceledStatuses: EXTERNAL_CANCELED_STATUSES,
};

type ClientRequestWithCounterpartyRefs = ClientOrganizationRequestItemDto & {
  counterpartyRef?: string | Types.ObjectId;
  counterpartyBankUuid?: string;
  counterpartyAccountUuid?: string;
  organization?: { name?: string; inn?: string };
};

@Injectable()
export class ComplianceHistoryService implements IComplianceHistoryService {
  private readonly logger = new Logger(ComplianceHistoryService.name);

  constructor(
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
    @InjectModel(FormPayment.name) private readonly formPaymentModel: Model<FormPayment>,
    @Optional() private readonly counterpartyService?: CounterpartyService,
  ) {}

  async getClientsList(role: AccountRole, filters: ClientOrganizationPaginateDto): Promise<ClientOrganizationListDto> {
    const { page = 1, limit = 20 } = filters;
    const isInternalCompliance = role === AccountRole.INTERNAL_COMPLIANCE_OFFICER;
    const statusConfig = isInternalCompliance ? internalFormStatuses : externalFormStatuses;

    const matchStage = this.buildMatchStage(filters);
    const pipeline = this.buildClientsAggregationPipeline(matchStage, statusConfig, page, limit);

    const results = await this.organizationModel.aggregate(pipeline);
    const hasNext = results.length > limit;
    const items = hasNext ? results.slice(0, -1) : results;

    return { items, hasNext };
  }

  async getClientDetails(organizationId: string): Promise<ClientOrganizationDto> {
    const organization = await this.organizationModel
      .findOne({ _id: organizationId, type: OrganizationType.USER })
      .populate('account', '_id email firstName lastName')
      .lean();

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return organization as ClientOrganizationDto;
  }

  async getClientRequests(
    organizationId: string,
    role: AccountRole,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Promise<ClientOrganizationRequestsDto> {
    const organization = await this.organizationModel
      .findOne({ _id: organizationId, type: OrganizationType.USER })
      .select('_id name inn')
      .lean();

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const { page = 1, limit = 20 } = filters;
    const isInternalCompliance = role === AccountRole.INTERNAL_COMPLIANCE_OFFICER;
    const statusConfig = isInternalCompliance ? internalFormStatuses : externalFormStatuses;

    const matchQuery = this.buildRequestsMatchQuery(organizationId, statusConfig, filters);
    const statistics = await this.calculateRequestStatistics(organizationId, statusConfig);
    const results = await this.fetchRequests(matchQuery, page, limit);

    await this.enrichCounterpartiesFromRegistry(results);

    const hasNext = results.length > limit;
    const items = hasNext ? results.slice(0, -1) : results;
    const sanitizedItems = this.sanitizeRequestItems(items);

    return {
      organization: {
        _id: organization._id.toString(),
        name: organization.name,
        inn: organization.inn,
      },
      statistics: statistics || { pending: 0, approved: 0, rejected: 0, other: 0 },
      items: sanitizedItems,
      hasNext,
    };
  }

  private buildMatchStage(filters: ClientOrganizationPaginateDto): Record<string, unknown> {
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

  private buildClientsAggregationPipeline(
    matchStage: Record<string, unknown>,
    statusConfig: FormStatusConfig,
    page: number,
    limit: number,
  ): PipelineStage[] {
    return [
      { $match: matchStage },
      ComplianceAggregationUtils.buildRequestStatsLookup(statusConfig),
      ComplianceAggregationUtils.buildStatusHistoryLookup(),
      { $sort: { createDate: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit + 1 },
      ComplianceAggregationUtils.buildClientsListProjection(),
    ];
  }

  private buildRequestsMatchQuery(
    organizationId: string,
    statusConfig: FormStatusConfig,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Record<string, unknown> {
    const { category, direction, clientCurrency, counterpartyCurrency, dateFrom, dateTo } = filters;
    const { pendingStatuses, approvedStages, rejectedStatuses, otherStatuses, canceledStatuses } = statusConfig;

    const matchQuery: Record<string, unknown> = {
      $or: [
        { 'organization.refOrganizationId': organizationId }, // string
        { 'organization.refOrganizationId': new Types.ObjectId(organizationId) }, // ObjectId
      ],
    };

    if (category && category.length > 0) {
      const categoryConditions: Record<string, unknown>[] = [];

      for (const cat of category) {
        switch (cat) {
          case RequestStatusFilterType.PENDING:
            categoryConditions.push({ status: { $in: pendingStatuses } });
            break;
          case RequestStatusFilterType.APPROVED:
            categoryConditions.push({
              $and: [{ stage: { $in: approvedStages } }, { status: { $nin: canceledStatuses } }],
            });
            break;
          case RequestStatusFilterType.REJECTED:
            categoryConditions.push({ status: { $in: rejectedStatuses } });
            break;
          case RequestStatusFilterType.OTHER:
            categoryConditions.push({ status: { $in: otherStatuses } });
            break;
        }
      }

      if (categoryConditions.length === 1) {
        Object.assign(matchQuery, categoryConditions[0]);
      } else if (categoryConditions.length > 1) {
        matchQuery.$and = matchQuery.$and || [];
        (matchQuery.$and as Record<string, unknown>[]).push({ $or: categoryConditions });
      }
    }

    if (direction && direction.length > 0) {
      matchQuery.direction = direction.length === 1 ? direction[0] : { $in: direction };
    }

    if (clientCurrency && clientCurrency.length > 0) {
      matchQuery['currency.client'] = clientCurrency.length === 1 ? clientCurrency[0] : { $in: clientCurrency };
    }

    if (counterpartyCurrency && counterpartyCurrency.length > 0) {
      matchQuery['currency.counterparty'] =
        counterpartyCurrency.length === 1 ? counterpartyCurrency[0] : { $in: counterpartyCurrency };
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) {
        dateQuery.$gte = dateFrom;
      }
      if (dateTo) {
        dateQuery.$lte = dateTo;
      }
      matchQuery.createDate = dateQuery;
    }

    return matchQuery;
  }

  private async calculateRequestStatistics(
    organizationId: string,
    statusConfig: FormStatusConfig,
  ): Promise<{ pending: number; approved: number; rejected: number; other: number }> {
    const { pendingStatuses, approvedStages, rejectedStatuses, otherStatuses, canceledStatuses } = statusConfig;

    const [statistics] = await this.formPaymentModel.aggregate([
      {
        $match: {
          $or: [
            { 'organization.refOrganizationId': organizationId }, // string
            { 'organization.refOrganizationId': new Types.ObjectId(organizationId) }, // ObjectId
          ],
        },
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', pendingStatuses] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [
                {
                  $and: [{ $in: ['$stage', approvedStages] }, { $not: [{ $in: ['$status', canceledStatuses] }] }],
                },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $in: ['$status', rejectedStatuses] }, 1, 0],
            },
          },
          other: {
            $sum: {
              $cond: [{ $in: ['$status', otherStatuses] }, 1, 0],
            },
          },
        },
      },
    ]);

    return statistics;
  }

  async getClientRequestsForExport(
    organizationId: string,
    role: AccountRole,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Promise<unknown[]> {
    const isInternalCompliance = role === AccountRole.INTERNAL_COMPLIANCE_OFFICER;
    const statusConfig = isInternalCompliance ? internalFormStatuses : externalFormStatuses;

    const matchQuery = this.buildRequestsMatchQuery(organizationId, statusConfig, filters);

    const formPayments = (await this.formPaymentModel
      .find(matchQuery)
      .select(
        '_id uid status stage direction counterparty totals currency createDate sentDate organization counterpartyRef counterpartyBankUuid counterpartyAccountUuid',
      )
      .sort({ createDate: -1 })
      .limit(1000) // Max export limit
      .lean()) as unknown as ClientRequestWithCounterpartyRefs[];

    await this.enrichCounterpartiesFromRegistry(formPayments);

    return formPayments;
  }

  private async fetchRequests(
    matchQuery: Record<string, unknown>,
    page: number,
    limit: number,
  ): Promise<ClientRequestWithCounterpartyRefs[]> {
    return (await this.formPaymentModel
      .find(matchQuery)
      .select(
        '_id uid status stage direction counterparty totals currency createDate sentDate counterpartyRef counterpartyBankUuid counterpartyAccountUuid',
      )
      .sort({ createDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean()) as unknown as ClientRequestWithCounterpartyRefs[];
  }

  private async enrichCounterpartiesFromRegistry(forms: ClientRequestWithCounterpartyRefs[]): Promise<void> {
    if (!this.counterpartyService) {
      return;
    }

    const formsToEnrich = forms.filter((form) => {
      const existing = (form.counterparty || {}) as Partial<IFormBankDetails>;
      return !Object.keys(existing).length && form.counterpartyRef;
    });

    if (!formsToEnrich.length) {
      return;
    }

    const refs = Array.from(
      new Set(
        formsToEnrich
          .map((form) => form.counterpartyRef)
          .filter(Boolean)
          .map((ref) => ref!.toString()),
      ),
    );

    if (!refs.length) {
      return;
    }

    let counterparties: ICounterparty[];
    try {
      counterparties = await this.counterpartyService.findBasicByIds(refs);
    } catch (error) {
      this.logger.error(`Failed to load counterparties for enrichment: ${error.message}`);
      return;
    }

    if (!counterparties.length) {
      return;
    }

    const counterpartyMap = new Map<string, ICounterparty>();
    for (const counterparty of counterparties) {
      counterpartyMap.set(counterparty._id.toString(), counterparty);
    }

    formsToEnrich.forEach((form) => {
      const ref = form.counterpartyRef?.toString();
      if (!ref) return;

      const counterparty = counterpartyMap.get(ref);
      if (!counterparty) {
        return;
      }

      const enriched = this.mergeCounterpartyData(form, counterparty);
      if (Object.keys(enriched).length) {
        form.counterparty = enriched as any;
      }
    });
  }

  private mergeCounterpartyData(
    form: ClientRequestWithCounterpartyRefs,
    counterparty: ICounterparty,
  ): Partial<IFormBankDetails> {
    const existingCounterparty = (form.counterparty || {}) as Partial<IFormBankDetails>;
    const enriched: Partial<IFormBankDetails> = { ...existingCounterparty };

    // Level 1: counterparty-level data
    if (!enriched.name && counterparty.name) {
      enriched.name = counterparty.name;
    }

    if (!enriched.country && counterparty.country) {
      enriched.country = counterparty.country;
    }

    if (!enriched.legalAddress && counterparty.legalAddress) {
      enriched.legalAddress = counterparty.legalAddress;
    }

    if (!enriched.address && (counterparty.legalAddress || existingCounterparty.address)) {
      enriched.address = counterparty.legalAddress || existingCounterparty.address;
    }

    // Level 2: bank-level data (optional)
    const { counterpartyBankUuid, counterpartyAccountUuid } = form;

    let bank;
    if (counterpartyBankUuid && Array.isArray(counterparty.banks)) {
      bank = counterparty.banks.find((b) => b.uuid === counterpartyBankUuid);
      if (!bank) {
        this.logger.warn(
          `Bank not found for uuid ${counterpartyBankUuid} in counterparty ${counterparty._id} (form ${form._id})`,
        );
      }
    }

    if (bank) {
      if (!enriched.bankName && bank.bankName) {
        enriched.bankName = bank.bankName;
      }
      if (!enriched.bankCountry && bank.bankCountry) {
        enriched.bankCountry = bank.bankCountry;
      }
      if (!enriched.bankAddress && bank.bankAddress) {
        enriched.bankAddress = bank.bankAddress;
      }
      if (!enriched.swiftCode && bank.swiftCode) {
        enriched.swiftCode = bank.swiftCode;
      }
    }

    // Level 3: account-level data (optional)
    if (bank && counterpartyAccountUuid && Array.isArray(bank.accounts)) {
      const account = bank.accounts.find((a) => a.uuid === counterpartyAccountUuid);

      if (!account) {
        this.logger.warn(
          `Account not found for uuid ${counterpartyAccountUuid} in bank ${counterpartyBankUuid} (form ${form._id})`,
        );
      } else if (!enriched.accountNumber && account.accountNumber) {
        enriched.accountNumber = account.accountNumber;
      }
    }

    return enriched;
  }

  private sanitizeRequestItems(items: ClientRequestWithCounterpartyRefs[]): ClientOrganizationRequestItemDto[] {
    return items.map(({ counterpartyRef, counterpartyBankUuid, counterpartyAccountUuid, ...rest }) => rest);
  }
}
