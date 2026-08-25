import { Controller, Inject } from '@nestjs/common';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { LiquidityPattern } from '../../../lib/enums/models/liquidity.enums';
import { ILiquidityService } from '../service/liquidity.service.interface';
import { ILiquidity } from '../../../lib/interfaces/models/liquidity.interface';
import { LiquidityBaseDto } from '../../../lib/dto/models/liquidity.dto';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';

@Controller()
export class LiquidityRpcController {
  constructor(@Inject('ILiquidityService') private readonly service: ILiquidityService) {}

  @CatcherMessagePattern(LiquidityPattern.CREATE)
  create(data: LiquidityBaseDto): Promise<ILiquidity> {
    return this.service.create(data);
  }

  @CatcherMessagePattern(LiquidityPattern.UPDATE_COMMITMENTS_ON_STATUS_CHANGE)
  updateCommitmentsOnStatusChange(data: {
    payment: IFormPayment;
    oldStatus: FormPaymentStatus;
    newStatus: FormPaymentStatus;
  }): Promise<void> {
    return this.service.updateCommitmentsOnStatusChange(data.payment, data.oldStatus, data.newStatus);
  }
}
