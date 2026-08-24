import { IBaseQuery, IBaseService, OmitBaseSchema, UpdatePartial } from 'lib/services/base/base.service.interface';
import {
  ILiquidApply,
  ILiquidity,
  ILiquidityGlass,
  ILiquidityConvert,
} from 'lib/interfaces/models/liquidity.interface';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { Liquidity } from './liquidity.schema';

export interface ILiquidityService extends IBaseService<ILiquidity, ILiquidityQuery> {
  applyOrderPayment(payment: IFormPayment): Promise<void>;

  applyLiquid(params: ILiquidApply): Promise<void>;

  applyLiquidsBatch(params: ILiquidApply[]): Promise<void>;

  convertLiquidity(params: ILiquidityConvert): Promise<ILiquidity>;

  getLiquidityGlass(): Promise<ILiquidityGlass>;

  updateByAdmin(findData: ILiquidityQuery, updateData: UpdatePartial<Liquidity>): Promise<ILiquidity>;

  sendLiquidityUpdateNotifications(liquidity: ILiquidity): Promise<void>;

  updateCommitmentsOnStatusChange(
    payment: IFormPayment,
    oldStatus: FormPaymentStatus,
    newStatus: FormPaymentStatus,
  ): Promise<void>;
}

export interface ILiquidityCreate extends OmitBaseSchema<ILiquidity> {}

export interface ILiquidityQuery extends Partial<ILiquidity>, IBaseQuery {}
