import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Migration } from './migration.schema';
import { Model } from 'mongoose';
import { MigrationStatus } from 'lib/enums/migration.enums';
import { MigrationClass } from './migration.module';
import { IMigrationBase } from 'lib/interfaces/models/migration.interface';

export const MIGRATIONS = 'MIGRATIONS';

@Injectable()
export class MigrationService implements OnApplicationBootstrap {
  readonly logger: Logger = new Logger();

  constructor(
    @InjectModel(Migration.name) private readonly model: Model<Migration>,
    @Inject(MIGRATIONS) private readonly migrations: MigrationClass[],
  ) {}

  async onApplicationBootstrap() {
    for (const factory of this.migrations) {
      const name = factory.constructor.name;

      const existSuccess = await this.model.exists({ name, status: MigrationStatus.SUCCESS });

      if (existSuccess) {
        continue;
      }

      await this.createOrUpdate({ name, status: MigrationStatus.AWAIT });

      try {
        await factory.up();
        await this.createOrUpdate({ name, status: MigrationStatus.SUCCESS });
      } catch (e) {
        this.logger.error(`Migration ${name} fail with error ${e.message}`);
        await this.createOrUpdate({ name, status: MigrationStatus.FAIL, errorMessage: e?.message?.toString() });
        // Продолжаем выполнение других миграций даже при ошибке
        // return;
      }
    }
  }

  private createOrUpdate(data: IMigrationBase) {
    return this.model.findOneAndUpdate({ name: data.name }, data, { new: true, upsert: true });
  }
}
