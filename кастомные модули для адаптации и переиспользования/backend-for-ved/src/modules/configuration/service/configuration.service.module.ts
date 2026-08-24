import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Configuration, ConfigurationSchema } from './configuration.schema';
import { CONFIGURATION_CLIENT, CONFIGURATION_SERVICE } from '../configuration.contants';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { ConfigurationService } from './configuration.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Configuration.name, schema: ConfigurationSchema }]),
    NatsModule(CONFIGURATION_CLIENT),
  ],
  providers: [{ provide: CONFIGURATION_SERVICE, useClass: ConfigurationService }],
  exports: [{ provide: CONFIGURATION_SERVICE, useClass: ConfigurationService }],
})
export class ConfigurationServiceModule {}
