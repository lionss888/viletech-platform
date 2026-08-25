import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IHsCodeService } from '../../service/hs-code.service.interface';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { paginatePlainToClass, plainModelToClass } from 'lib/utils/helpers/entity.helper';
import { Method } from 'lib/decorators/method.decorator';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { HsCodeDto } from 'lib/dto/models/hs-code.dto';
import { CountFieldDto } from 'lib/dto/count-field.dto';

export class HsCodeSiteQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('hs-code')
@Controller('hs-code')
export class HsCodeSiteController {
  constructor(@Inject('IHsCodeService') private readonly service: IHsCodeService) {}

  @Get()
  @Method({ paginate: HsCodeDto })
  async find(@Query() query: HsCodeSiteQueryDto): Promise<IPaginateResult<HsCodeDto>> {
    const paginate = {
      limit: query.limit || 20,
      page: query.page || 1,
    };

    const result = await this.service.findActive(query.search, paginate);

    return paginatePlainToClass(HsCodeDto, result);
  }

  @Get('count')
  @Method({ response: { status: 200, type: CountFieldDto } })
  async count(): Promise<CountFieldDto> {
    const result = await this.service.count({ active: true });
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':code')
  @ApiNotFoundMessagesResponse(['HS code not found.'])
  @Method({ response: { status: 200, type: HsCodeDto } })
  async findByCode(@Param('code') code: string): Promise<HsCodeDto> {
    const hsCode = await this.service.findByCode(code);

    if (!hsCode) {
      throw new NotFoundException('HS code not found.');
    }

    return plainModelToClass(HsCodeDto, hsCode);
  }
}
