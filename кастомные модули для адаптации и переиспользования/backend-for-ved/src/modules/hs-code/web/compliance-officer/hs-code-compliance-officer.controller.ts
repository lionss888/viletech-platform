import { Controller, Post, Patch, Delete, Inject, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { IHsCodeService } from '../../service/hs-code.service.interface';
import { ComplianceOfficerMethod } from 'lib/decorators/compliance-officer-method.decorator';
import { HsCodeDto, CreateHsCodeDto, UpdateHsCodeDto } from 'lib/dto/models/hs-code.dto';
import { plainModelToClass } from 'lib/utils/helpers/entity.helper';

@ApiCookieAuth()
@ApiTags('hs-code')
@Controller('admin/compliance-officer/hs-code')
export class HsCodeComplianceOfficerController {
  private readonly logger = new Logger(HsCodeComplianceOfficerController.name);

  constructor(@Inject('IHsCodeService') private readonly service: IHsCodeService) {}

  @Post()
  @ComplianceOfficerMethod({ response: { status: 201, type: HsCodeDto } })
  async create(@Body() dto: CreateHsCodeDto): Promise<HsCodeDto> {
    const result = await this.service.create(dto);
    this.logger.debug(`HS code created: ${result.code}`);
    return plainModelToClass(HsCodeDto, result);
  }

  @Patch(':id')
  @ComplianceOfficerMethod({ response: { status: 200, type: HsCodeDto } })
  async update(@Param('id') id: string, @Body() dto: UpdateHsCodeDto): Promise<HsCodeDto> {
    const result = await this.service.updateOneOrException({ _id: id }, dto);
    return plainModelToClass(HsCodeDto, result);
  }

  @Patch(':id/deactivate')
  @ComplianceOfficerMethod({ response: { status: 200, type: HsCodeDto } })
  async deactivate(@Param('id') id: string): Promise<HsCodeDto> {
    const result = await this.service.deactivate(id);
    return plainModelToClass(HsCodeDto, result);
  }

  @Patch(':id/activate')
  @ComplianceOfficerMethod({ response: { status: 200, type: HsCodeDto } })
  async activate(@Param('id') id: string): Promise<HsCodeDto> {
    const result = await this.service.activate(id);
    return plainModelToClass(HsCodeDto, result);
  }

  @Delete(':id')
  @ComplianceOfficerMethod({ response: { status: 200 } })
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.deleteHsCode(id);
  }
}
