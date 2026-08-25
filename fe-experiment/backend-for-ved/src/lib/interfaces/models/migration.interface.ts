import { MigrationStatus } from 'lib/enums/migration.enums';
import { ISchema } from 'lib/interfaces/schema.interface';

export interface IMigrationBase {
  name: string;
  status: MigrationStatus;
  errorMessage?: string;
}

export interface IMigration extends ISchema, IMigrationBase {}
