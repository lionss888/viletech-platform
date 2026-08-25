import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationService } from './organization.service';
import { Organization, OrganizationSchema } from './organization.schema';
import {
  OrganizationStatusesHistorySchema,
  OrganizationStatusesHistorySchemaFactory,
} from './history/organization-statuses-history.schema';
import { OrganizationStatusesHistoryService } from './history/organization-statuses-history.service';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { ORGANIZATION_CLIENT, ORGANIZATION_SERVICE, ORGANIZATION_SUBACCOUNT_SERVICE } from '../organization.constants';
import { OrganizationSubaccountService } from './organization-subaccount.service';
import { KonturServiceModule } from 'lib/services/kontur/kontur.service.module';
import { HsCodeServiceModule } from '../../hs-code/service/hs-code.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationStatusesHistorySchema.name, schema: OrganizationStatusesHistorySchemaFactory },
    ]),
    NatsModule(ORGANIZATION_CLIENT),
    KonturServiceModule,
    forwardRef(() => HsCodeServiceModule),
  ],
  providers: [
    OrganizationStatusesHistoryService,
    { provide: ORGANIZATION_SERVICE, useClass: OrganizationService },
    { provide: ORGANIZATION_SUBACCOUNT_SERVICE, useClass: OrganizationSubaccountService },
  ],
  exports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationStatusesHistorySchema.name, schema: OrganizationStatusesHistorySchemaFactory },
    ]),
    OrganizationStatusesHistoryService,
    { provide: ORGANIZATION_SERVICE, useClass: OrganizationService },
    { provide: ORGANIZATION_SUBACCOUNT_SERVICE, useClass: OrganizationSubaccountService },
  ],
})
export class OrganizationServiceModule {}
