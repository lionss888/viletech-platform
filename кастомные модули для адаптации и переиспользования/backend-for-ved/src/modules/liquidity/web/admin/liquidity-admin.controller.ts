import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ILiquidityService } from '../../service/liquidity.service.interface';
import { LiquidityBaseDto, LiquidityDto } from '../../../../lib/dto/models/liquidity.dto';
import { plainModelToClass } from '../../../../lib/utils/helpers/entity.helper';
import { ILiquidity } from '../../../../lib/interfaces/models/liquidity.interface';
import { RootMethod } from '../../../../lib/decorators/root-method.decorator';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { LiquidityConvertDto } from '../../rpc/dto/liquidity.convert.dto';

@ApiTags('admin liquidity')
@Controller('admin/liquidity')
export class LiquidityAdminController {
  constructor(@Inject('ILiquidityService') private readonly service: ILiquidityService) {}

  @Get('findOne')
  @RootMethod({ response: { status: 200, type: LiquidityDto } })
  async findByName(): Promise<ILiquidity> {
    const result = await this.service.findOne({});
    return plainModelToClass(LiquidityDto, result);
  }

  @Patch(':_id')
  @RootMethod({ response: { status: 200, type: LiquidityDto } })
  patchById(@Param() dto: IdFieldDto, @Body() updateDto: LiquidityBaseDto): Promise<ILiquidity> {
    return this.service.updateByAdmin(dto, updateDto);
  }

  @Post('convert')
  @RootMethod({ response: { status: 200, type: LiquidityDto } })
  convert(@Body() dto: LiquidityConvertDto): Promise<ILiquidity> {
    return this.service.convertLiquidity(dto);
  }
}
