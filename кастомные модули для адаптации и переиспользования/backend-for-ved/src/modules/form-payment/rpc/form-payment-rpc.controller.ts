import { Controller, Inject } from '@nestjs/common';
import { IFormPaymentService } from '../service/form-payment.service.interface';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { FormPaymentPattern } from 'lib/enums/models/form-payment.enums';
import {
  FormPaymentApplyPaymentRpcDto,
  FormPaymentRPCSyncOrganizationSubaccountsDto,
  FormPaymentRPCUpdateDto,
} from '../dto/form-payment.update.dto';
import { FormPaymentRPCQueryDto } from '../dto/form-payment.query.dto';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { FORM_PAYMENT_SERVICE } from '../form-payment.constants';

@Controller()
export class FormPaymentRpcController {
  constructor(@Inject(FORM_PAYMENT_SERVICE) private readonly service: IFormPaymentService) {}

  @CatcherMessagePattern(FormPaymentPattern.FIND_ONE)
  findOne({ query, options }: FormPaymentRPCQueryDto): Promise<IFormPayment> {
    return this.service.findOne(query, options);
  }

  @CatcherMessagePattern(FormPaymentPattern.FIND_MANY)
  findMany({ query, options }: FormPaymentRPCQueryDto): Promise<IFormPayment[]> {
    return this.service.findMany(query, options);
  }

  @CatcherMessagePattern(FormPaymentPattern.FIND_ONE_OR_EXCEPTION)
  findOneOrException({ query, options }: FormPaymentRPCQueryDto): Promise<IFormPayment> {
    return this.service.findOneOrException(query, options);
  }

  @CatcherMessagePattern(FormPaymentPattern.UPDATE_ONE)
  updateOne({ query, update }: FormPaymentRPCUpdateDto): Promise<IFormPayment> {
    return this.service.updateOneRpc(query, update);
  }

  @CatcherMessagePattern(FormPaymentPattern.UPDATE_MANY)
  updateMany({ query, update }: FormPaymentRPCUpdateDto): Promise<void> {
    return this.service.updateManyRpc(query, update);
  }

  @CatcherMessagePattern(FormPaymentPattern.SYNC_ORGANIZATION_SUBACCOUNTS)
  syncOrganizationSubaccounts(data: FormPaymentRPCSyncOrganizationSubaccountsDto): Promise<void> {
    return this.service.syncOrganizationSubaccountsRpc(data);
  }

  @CatcherMessagePattern(FormPaymentPattern.APPLY_PAYMENT_FROM_PAYMENT_SERVICE)
  applyPaymentFromPaymentService(payload: FormPaymentApplyPaymentRpcDto): Promise<void> {
    return this.service.applyPaymentFromPaymentService(payload);
  }
}
