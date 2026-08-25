import { Controller, Inject } from '@nestjs/common';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { IConfigurationService } from '../service/configuration.service.interface';
import { CONFIGURATION_SERVICE } from '../configuration.contants';
import { ConfigurationPattern } from 'lib/enums/models/configuration.enums';
import { ConfigurationBaseDto } from 'lib/dto/models/configuration.dto';
import { IConfiguration } from 'lib/interfaces/models/configuration.interface';

@Controller()
export class ConfigurationRpcController {
  constructor(@Inject(CONFIGURATION_SERVICE) private readonly service: IConfigurationService) {}

  @CatcherMessagePattern(ConfigurationPattern.CREATE)
  create(data: ConfigurationBaseDto): Promise<IConfiguration> {
    return this.service.create(data);
  }

  @CatcherMessagePattern(ConfigurationPattern.FIND_ONE)
  get(): Promise<IConfiguration> {
    return this.service.findOne({});
  }
}
