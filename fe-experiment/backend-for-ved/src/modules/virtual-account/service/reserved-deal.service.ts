import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReservedDeal } from './reserved-deal.schema';
import { Model } from 'mongoose';
import { IReservedDealService } from './reserved-deal.service.interface';
import { IReservedDeal } from 'lib/interfaces/models/reserved-deal.interface';

@Injectable()
export class ReservedDealService implements IReservedDealService {
  constructor(@InjectModel(ReservedDeal.name) private model: Model<ReservedDeal>) {}

  async create(formPaymentId: string, virtualAccountId: string): Promise<IReservedDeal> {
    const reservedDeal = new this.model({
      formPayment: formPaymentId,
      virtualAccount: virtualAccountId,
      reservedDate: new Date(),
    });

    await reservedDeal.save();

    return this.model.findOne({ _id: reservedDeal._id }).populate('formPayment virtualAccount').exec();
  }

  async findByFormPaymentAndVirtualAccount(
    formPaymentId: string,
    virtualAccountId: string,
  ): Promise<IReservedDeal | null> {
    return this.model
      .findOne({
        formPayment: formPaymentId,
        virtualAccount: virtualAccountId,
      })
      .populate('formPayment virtualAccount')
      .exec();
  }

  async findByVirtualAccount(virtualAccountId: string): Promise<IReservedDeal[]> {
    return this.model
      .find({
        virtualAccount: virtualAccountId,
      })
      .populate('formPayment virtualAccount')
      .exec();
  }

  async delete(formPaymentId: string, virtualAccountId: string): Promise<void> {
    const result = await this.model
      .deleteOne({
        formPayment: formPaymentId,
        virtualAccount: virtualAccountId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Reserved deal not found');
    }
  }

  async exists(formPaymentId: string, virtualAccountId: string): Promise<boolean> {
    const exists = await this.model
      .exists({
        formPayment: formPaymentId,
        virtualAccount: virtualAccountId,
      })
      .exec();
    return !!exists;
  }
}
