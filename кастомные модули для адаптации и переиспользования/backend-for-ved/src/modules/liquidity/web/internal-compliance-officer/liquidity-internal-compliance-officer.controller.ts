import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ILiquidityService } from '../../service/liquidity.service.interface';
import { LiquidityDto } from '../../../../lib/dto/models/liquidity.dto';
import { plainModelToClass } from '../../../../lib/utils/helpers/entity.helper';
import { ILiquidity } from '../../../../lib/interfaces/models/liquidity.interface';
import { InternalComplianceOfficerMethod } from 'lib/decorators/internal-compliance-officer-method.decorator';

@ApiTags('internal compliance officer liquidity')
@Controller('admin/internal-compliance-officer/liquidity')
export class LiquidityInternalComplianceOfficerController {
  constructor(@Inject('ILiquidityService') private readonly service: ILiquidityService) {}

  @Get('findOne')
  @InternalComplianceOfficerMethod({ response: { status: 200, type: LiquidityDto } })
  async findByName(): Promise<ILiquidity> {
    const result = await this.service.findOne({});
    return plainModelToClass(LiquidityDto, result);
  }
}
