import { Module } from '@nestjs/common';
import { TemplateAdminController } from './template-admin.controller';
import { TemplateServiceModule } from '../../service/template.service.module';

@Module({
  imports: [TemplateServiceModule],
  controllers: [TemplateAdminController],
})
export class TemplateAdminModule {}
