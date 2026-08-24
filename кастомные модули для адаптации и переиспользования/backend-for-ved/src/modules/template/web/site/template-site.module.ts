import { Module } from '@nestjs/common';
import { TemplateServiceModule } from '../../service/template.service.module';
import { TemplateSiteController } from './template-site.controller';

@Module({
  imports: [TemplateServiceModule],
  controllers: [TemplateSiteController],
})
export class TemplateSiteModule {}
