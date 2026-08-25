import { Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IConfigurationService } from '../../service/configuration.service.interface';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';
import { plainModelToClass } from '../../../../lib/utils/helpers/entity.helper';
import { RootMethod } from '../../../../lib/decorators/root-method.decorator';
import { CONFIGURATION_SERVICE } from 'modules/configuration/configuration.contants';
import { ConfigurationDto } from 'lib/dto/models/configuration.dto';
import { IConfiguration } from 'lib/interfaces/models/configuration.interface';
import { ConfigurationAdminUpdateDto } from 'modules/configuration/dto/configuration.update.dto';

@ApiTags('admin configuration')
@Controller('admin/configuration')
export class ConfigurationAdminController {
  constructor(@Inject(CONFIGURATION_SERVICE) private readonly service: IConfigurationService) {}

  @Get()
  @ManagerMethod({ response: { status: 200, type: ConfigurationDto } })
  async findByName(): Promise<IConfiguration> {
    const result = await this.service.findOne({});
    return plainModelToClass(ConfigurationDto, result);
  }

  @Patch()
  @RootMethod({ response: { status: 200, type: ConfigurationDto } })
  patchById(@Body() updateDto: ConfigurationAdminUpdateDto): Promise<IConfiguration> {
    return this.service.updateOne({}, updateDto);
  }
}
