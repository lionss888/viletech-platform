import { BadRequestException, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PassThrough } from 'stream';
import * as ExcelJS from 'exceljs';
import moment from 'moment';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Counterparty } from './counterparty.schema';
import { ICounterpartyRequestsFilters } from './counterparty.service.interface';
import {
  EXTERNAL_APPROVED_STAGES,
  EXTERNAL_CANCELED_STATUSES,
  EXTERNAL_PENDING_STATUSES,
  EXTERNAL_REJECTED_STATUSES,
} from '../../compliance-history/compliance-history.constants';

const MAX_EXPORT_LIMIT = 1000;

@Injectable()
export class CounterpartyReportsService {
  private readonly logger = new Logger(CounterpartyReportsService.name);

  constructor(
    @InjectModel(FormPayment.name) private readonly formPaymentModel: Model<FormPayment>,
    @InjectModel(Counterparty.name) private readonly counterpartyModel: Model<Counterparty>,
  ) {}

  async exportRequestsXlsx(counterpartyId: string, filters: ICounterpartyRequestsFilters): Promise<StreamableFile> {
    const match = this.buildMatch(counterpartyId, filters);

    const count = await this.formPaymentModel.countDocuments(match);
    if (count > MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Превышен лимит выгрузки: найдено ${count} записей, максимум ${MAX_EXPORT_LIMIT}. Уточните фильтры.`,
      );
    }

    const formPayments = await this.formPaymentModel
      .find(match)
      .select(
        '_id uid createDate sentDate direction counterparty totals currency status stage organization.name organization.inn',
      )
      .sort({ createDate: -1 })
      .lean();

    const counterparty = await this.counterpartyModel
      .findOne({ _id: new Types.ObjectId(counterpartyId) })
      .select('_id name country statusHistory')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Requests');
    ws.columns = [
      { header: 'UID', key: 'uid', width: 12 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Stage', key: 'stage', width: 20 },
      { header: 'Direction', key: 'direction', width: 12 },
      { header: 'Create Date', key: 'createDate', width: 20 },
      { header: 'Sent Date', key: 'sentDate', width: 20 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Client Currency', key: 'clientCurrency', width: 16 },
      { header: 'Counterparty Currency', key: 'counterpartyCurrency', width: 20 },
      { header: 'CP Name', key: 'cpName', width: 24 },
      { header: 'CP Country', key: 'cpCountry', width: 16 },
      { header: 'Account', key: 'accountNumber', width: 22 },
      { header: 'SWIFT', key: 'swiftCode', width: 16 },
    ];

    formPayments.forEach((fp) => {
      ws.addRow({
        uid: fp.uid,
        status: fp.status,
        stage: fp.stage,
        direction: fp.direction,
        createDate: fp.createDate ? moment(fp.createDate).format('YYYY-MM-DD HH:mm') : '',
        sentDate: fp.sentDate ? moment(fp.sentDate).format('YYYY-MM-DD HH:mm') : '',
        amount: fp.totals?.amount ?? '',
        clientCurrency: fp.currency?.client?.toUpperCase?.() || fp.currency?.client || '',
        counterpartyCurrency: fp.currency?.counterparty?.toUpperCase?.() || fp.currency?.counterparty || '',
        cpName: fp.counterparty?.name || '',
        cpCountry: fp.counterparty?.country || '',
        accountNumber: fp.counterparty?.accountNumber || '',
        swiftCode: fp.counterparty?.swiftCode || '',
      });
    });

    const ws2 = workbook.addWorksheet('Status History');
    ws2.columns = [
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Created By', key: 'createdBy', width: 28 },
      { header: 'Comment', key: 'comment', width: 40 },
    ];

    (counterparty?.statusHistory || []).forEach((h) => {
      const createdBy = typeof h.createdBy === 'string' ? h.createdBy : (h.createdBy as any)?._id || '';
      ws2.addRow({
        status: h.status,
        date: h.createDate ? moment(h.createDate).format('YYYY-MM-DD HH:mm') : '',
        createdBy,
        comment: h.comment || '',
      });
    });

    const stream = new PassThrough();
    workbook.xlsx.write(stream);
    return new StreamableFile(stream, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="counterparty-${counterpartyId}-requests-${moment().format(
        'YYYY-MM-DD',
      )}.xlsx"`,
    });
  }

  private buildMatch(counterpartyId: string, filters: ICounterpartyRequestsFilters): Record<string, unknown> {
    const { category, direction, clientCurrency, counterpartyCurrency, dateFrom, dateTo, amountGte, amountLte } =
      filters || {};
    const match: Record<string, unknown> = {
      counterpartyRef: new Types.ObjectId(counterpartyId),
    };

    // category mapping similar to helper
    if (category && category.length) {
      const conds = category
        .map((cat) => {
          if (cat === 'pending') return { status: { $in: EXTERNAL_PENDING_STATUSES } };
          if (cat === 'approved')
            return {
              $and: [{ stage: { $in: EXTERNAL_APPROVED_STAGES } }, { status: { $nin: EXTERNAL_CANCELED_STATUSES } }],
            };
          if (cat === 'rejected') return { status: { $in: EXTERNAL_REJECTED_STATUSES } };
          if (cat === 'other')
            return {
              $and: [
                { status: { $nin: [...EXTERNAL_PENDING_STATUSES, ...EXTERNAL_REJECTED_STATUSES] } },
                { stage: { $nin: EXTERNAL_APPROVED_STAGES } },
              ],
            };
          return null;
        })
        .filter(Boolean) as Record<string, unknown>[];
      if (conds.length === 1) Object.assign(match, conds[0]);
      if (conds.length > 1) match.$and = [{ $or: conds }];
    }

    if (direction && direction.length) {
      match.direction = direction.length === 1 ? direction[0] : { $in: direction };
    }
    if (clientCurrency && clientCurrency.length) {
      match['currency.client'] = clientCurrency.length === 1 ? clientCurrency[0] : { $in: clientCurrency };
    }
    if (counterpartyCurrency && counterpartyCurrency.length) {
      match['currency.counterparty'] =
        counterpartyCurrency.length === 1 ? counterpartyCurrency[0] : { $in: counterpartyCurrency };
    }
    if (dateFrom || dateTo) {
      const dq: Record<string, Date> = {};
      if (dateFrom) dq.$gte = dateFrom;
      if (dateTo) dq.$lte = dateTo;
      match.createDate = dq;
    }
    if (amountGte != null || amountLte != null) {
      const aq: Record<string, number> = {};
      if (amountGte != null) aq.$gte = amountGte;
      if (amountLte != null) aq.$lte = amountLte;
      match['totals.amount'] = aq;
    }

    return match;
  }
}
