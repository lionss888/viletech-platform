import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplateService } from './template.service';
import { Template, TemplateSchema } from './template.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }])],
  providers: [TemplateService, { provide: 'ITemplateService', useClass: TemplateService }],
  exports: [TemplateService, { provide: 'ITemplateService', useClass: TemplateService }],
})
export class TemplateServiceModule {}
