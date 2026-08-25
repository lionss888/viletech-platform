import { Injectable, Logger } from '@nestjs/common';
import { MigrationClass } from 'lib/modules/migration/migration.module';
import { TEMPLATE_1_MAPPING, TEMPLATE_2_MAPPING } from 'modules/template/templates';
import { TemplateType } from 'modules/template/template.enum';

@Injectable()
export class CreateTemplatesV22 extends MigrationClass {
  private readonly logger = new Logger(CreateTemplatesV22.name);

  async up() {
    const templatesCollection = this.connection.collection('templates');

    const template1Result = await templatesCollection.updateOne(
      { name: TemplateType.TEMPLATE_1 },
      {
        $setOnInsert: {
          name: TemplateType.TEMPLATE_1,
          fileId: '000000000000000000000001',
          mapping: TEMPLATE_1_MAPPING,
          isActive: true,
          createDate: new Date(),
        },
        $set: {
          updateDate: new Date(),
        },
      },
      { upsert: true },
    );

    if (template1Result.upsertedCount) {
      this.logger.log('Migration: Template 1 created');
    } else {
      this.logger.log('Migration: Template 1 already exists');
    }

    const template2Result = await templatesCollection.updateOne(
      { name: TemplateType.TEMPLATE_2 },
      {
        $setOnInsert: {
          name: TemplateType.TEMPLATE_2,
          fileId: '000000000000000000000002',
          mapping: TEMPLATE_2_MAPPING,
          isActive: true,
          createDate: new Date(),
        },
        $set: {
          updateDate: new Date(),
        },
      },
      { upsert: true },
    );

    if (template2Result.upsertedCount) {
      this.logger.log('Migration: Template 2 created');
    } else {
      this.logger.log('Migration: Template 2 already exists');
    }
  }
}
