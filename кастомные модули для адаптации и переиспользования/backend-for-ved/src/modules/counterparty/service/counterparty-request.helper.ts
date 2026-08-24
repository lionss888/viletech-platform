import { Model, Types } from 'mongoose';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { CounterpartyRequestItemDto } from '../dto/counterparty-requests.dto';
import { ICounterpartyRequestsFilters } from './counterparty.service.interface';
import { CounterpartyRequestStatusFilterType } from '../dto/counterparty-requests.query.dto';
import {
  EXTERNAL_APPROVED_STAGES,
  EXTERNAL_CANCELED_STATUSES,
  EXTERNAL_PENDING_STATUSES,
  EXTERNAL_REJECTED_STATUSES,
} from '../../compliance-history/compliance-history.constants';

const CATEGORY_FILTER_MAP = {
  [CounterpartyRequestStatusFilterType.PENDING]: { status: { $in: EXTERNAL_PENDING_STATUSES } },
  [CounterpartyRequestStatusFilterType.APPROVED]: {
    $and: [{ stage: { $in: EXTERNAL_APPROVED_STAGES } }, { status: { $nin: EXTERNAL_CANCELED_STATUSES } }],
  },
  [CounterpartyRequestStatusFilterType.REJECTED]: { status: { $in: EXTERNAL_REJECTED_STATUSES } },
  [CounterpartyRequestStatusFilterType.OTHER]: {
    $and: [
      { status: { $nin: [...EXTERNAL_PENDING_STATUSES, ...EXTERNAL_REJECTED_STATUSES] } },
      { stage: { $nin: EXTERNAL_APPROVED_STAGES } },
    ],
  },
} as const;

const DEFAULT_STATISTICS = { pending: 0, approved: 0, rejected: 0, other: 0 } as const;

export interface CounterpartyRequestQueryResult {
  statistics: typeof DEFAULT_STATISTICS;
  items: CounterpartyRequestItemDto[];
  hasNext: boolean;
}

export class CounterpartyRequestHelper {
  constructor(private readonly formPaymentModel: Model<FormPayment>) {}

  async query(counterpartyId: string, filters: ICounterpartyRequestsFilters): Promise<CounterpartyRequestQueryResult> {
    const { page = 1, limit = 20 } = filters;
    const requestFilters = this.buildMatchQuery(counterpartyId, filters);
    const statistics = await this.calculateStatistics(counterpartyId);
    const results = await this.fetchRequests(requestFilters, page, limit);

    const hasNext = results.length > limit;
    const items = hasNext ? results.slice(0, -1) : results;

    return {
      statistics: statistics || { ...DEFAULT_STATISTICS },
      items: items as CounterpartyRequestItemDto[],
      hasNext,
    };
  }

  private buildMatchQuery(counterpartyId: string, filters: ICounterpartyRequestsFilters): Record<string, unknown> {
    const { category, direction, clientCurrency, counterpartyCurrency, dateFrom, dateTo, amountGte, amountLte } =
      filters;

    const requestFilters: Record<string, unknown> = {
      counterpartyRef: new Types.ObjectId(counterpartyId),
    };

    this.applyCategoryFilter(requestFilters, category);
    this.applyDirectionFilter(requestFilters, direction);
    this.applyCurrencyFilters(requestFilters, clientCurrency, counterpartyCurrency);
    this.applyDateFilter(requestFilters, dateFrom, dateTo);
    this.applyAmountFilter(requestFilters, amountGte, amountLte);

    return requestFilters;
  }

  private applyCategoryFilter(requestFilters: Record<string, unknown>, category?: string[]): void {
    if (!category || category.length === 0) return;

    const categoryConditions = category
      .map((cat) => CATEGORY_FILTER_MAP[cat as CounterpartyRequestStatusFilterType])
      .filter(Boolean);

    if (categoryConditions.length === 1) {
      Object.assign(requestFilters, categoryConditions[0]);
      return;
    }

    if (categoryConditions.length > 1) {
      requestFilters.$and = requestFilters.$and || [];
      (requestFilters.$and as Record<string, unknown>[]).push({ $or: categoryConditions });
    }
  }

  private applyDirectionFilter(requestFilters: Record<string, unknown>, direction?: string[]): void {
    if (direction && direction.length > 0) {
      requestFilters.direction = direction.length === 1 ? direction[0] : { $in: direction };
    }
  }

  private applyCurrencyFilters(
    requestFilters: Record<string, unknown>,
    clientCurrency?: string[],
    counterpartyCurrency?: string[],
  ): void {
    if (clientCurrency && clientCurrency.length > 0) {
      requestFilters['currency.client'] = clientCurrency.length === 1 ? clientCurrency[0] : { $in: clientCurrency };
    }

    if (counterpartyCurrency && counterpartyCurrency.length > 0) {
      requestFilters['currency.counterparty'] =
        counterpartyCurrency.length === 1 ? counterpartyCurrency[0] : { $in: counterpartyCurrency };
    }
  }

  private applyDateFilter(requestFilters: Record<string, unknown>, dateFrom?: Date, dateTo?: Date): void {
    if (!dateFrom && !dateTo) return;

    const dateQuery: Record<string, Date> = {};
    if (dateFrom) {
      dateQuery.$gte = dateFrom;
    }
    if (dateTo) {
      dateQuery.$lte = dateTo;
    }
    requestFilters.createDate = dateQuery;
  }

  private applyAmountFilter(requestFilters: Record<string, unknown>, amountGte?: number, amountLte?: number): void {
    if (amountGte == null && amountLte == null) return;

    const amountQuery: Record<string, number> = {};
    if (amountGte != null) {
      amountQuery.$gte = amountGte;
    }
    if (amountLte != null) {
      amountQuery.$lte = amountLte;
    }
    requestFilters['totals.amount'] = amountQuery;
  }

  private async calculateStatistics(counterpartyId: string) {
    const [statistics] = await this.formPaymentModel.aggregate([
      {
        $match: {
          counterpartyRef: new Types.ObjectId(counterpartyId),
        },
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', EXTERNAL_PENDING_STATUSES] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$stage', EXTERNAL_APPROVED_STAGES] },
                    { $not: [{ $in: ['$status', EXTERNAL_CANCELED_STATUSES] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $in: ['$status', EXTERNAL_REJECTED_STATUSES] }, 1, 0],
            },
          },
          other: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: ['$status', EXTERNAL_PENDING_STATUSES] }] },
                    { $not: [{ $in: ['$status', EXTERNAL_REJECTED_STATUSES] }] },
                    { $not: [{ $in: ['$stage', EXTERNAL_APPROVED_STAGES] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return statistics || { ...DEFAULT_STATISTICS };
  }

  private async fetchRequests(
    requestFilters: Record<string, unknown>,
    page: number,
    limit: number,
  ): Promise<CounterpartyRequestItemDto[]> {
    return this.formPaymentModel
      .find(requestFilters)
      .select('_id uid status stage direction organization counterparty totals currency createDate sentDate')
      .sort({ createDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
  }
}
