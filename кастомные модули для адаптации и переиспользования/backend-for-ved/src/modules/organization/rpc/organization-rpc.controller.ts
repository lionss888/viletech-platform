import { Controller, Inject } from '@nestjs/common';
import { IOrganizationService } from '../service/organization.service.interface';
import { OrganizationPattern } from 'lib/enums/models/organization.enums';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { OrganizationRPCQueryDto } from '../dto/organization.query.dto';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { OrganizationRPCUpdateDto } from '../dto/organization.update.dto';
import { ORGANIZATION_SERVICE } from '../organization.constants';

@Controller()
export class OrganizationRpcController {
  constructor(@Inject(ORGANIZATION_SERVICE) private readonly service: IOrganizationService) {}

  @CatcherMessagePattern(OrganizationPattern.FIND_ONE_OR_EXCEPTION)
  async findOne(data: OrganizationRPCQueryDto): Promise<IOrganization> {
    return this.service.findOneOrException(data.query);
  }

  @CatcherMessagePattern(OrganizationPattern.UPDATE_ONE)
  async updateOne({ query, update }: OrganizationRPCUpdateDto) {
    return this.service.updateOne(query, update);
  }

  @CatcherMessagePattern(OrganizationPattern.UPDATE_MANY)
  async updateMany({ query, update }: OrganizationRPCUpdateDto) {
    return this.service.updateMany(query, update);
  }
}
