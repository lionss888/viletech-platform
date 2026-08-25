import { DynamicModule, Module } from '@nestjs/common';
import { MIGRATIONS, MigrationService } from './migration.service';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Migration, MigrationSchema } from './migration.schema';
import { NatsModule } from 'lib/modules/nats/nats.module';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';
import { NatsClientProxy } from '../nats/nats-client-proxy';
import { Connection } from 'mongoose';

export class MigrationClass {
  constructor(
    protected client: NatsClientProxy,
    protected connection?: Connection,
    protected configService?: ConfigService,
  ) {}

  async up(): Promise<void> {}
}

const MIGRATION_SERVICE = 'MIGRATION_SERVICE';

interface MigrationModuleParams {
  migrations: (typeof MigrationClass)[];
}

@Module({})
export class MigrationModule {
  static register({ migrations }: MigrationModuleParams): DynamicModule {
    return {
      module: MigrationModule,
      imports: [
        MongooseModule.forFeature([{ name: Migration.name, schema: MigrationSchema }]),
        NatsModule(MIGRATION_SERVICE),
      ],
      providers: [
        MigrationService,
        {
          provide: MIGRATIONS,
          inject: [NatsClientProxy.name, getConnectionToken(), ConfigService],
          useFactory: (client: NatsClientProxy, connection: Connection, config: ConfigService) =>
            _.map(migrations, (Migration) => new Migration(client, connection, config)),
        },
      ],
    };
  }
}
