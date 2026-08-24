import { Module } from '@nestjs/common';
import { TemplateServiceModule } from './service/template.service.module';
import { TemplateAdminModule } from './web/admin/template-admin.module';
import { TemplateSiteModule } from './web/site/template-site.module';

@Module({
  imports: [TemplateServiceModule, TemplateAdminModule, TemplateSiteModule],
})
export class TemplateModule {}
