import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractService } from './contract.service';
import { Contract, ContractSchema } from './contract.schema';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { CONTRACT_CLIENT } from '../contract.constants';
import { DiadocServiceModule } from '../../diadoc/service/diadoc.service.module';
import { FileServiceModule } from '../../file/service/file.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Contract.name, schema: ContractSchema }]),
    NatsModule(CONTRACT_CLIENT),
    DiadocServiceModule, // VF-2: Интеграция с Diadoc
    forwardRef(() => FileServiceModule),
  ],
  providers: [{ provide: 'IContractService', useClass: ContractService }],
  exports: [{ provide: 'IContractService', useClass: ContractService }],
})
export class ContractServiceModule {}
