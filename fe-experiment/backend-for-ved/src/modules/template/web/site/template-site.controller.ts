import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Method } from 'lib/decorators/method.decorator';
import { ITemplateService } from '../../service/template.service.interface';
import { Template } from '../../service/template.schema';

@ApiTags('templates')
@Controller('templates')
export class TemplateSiteController {
  constructor(@Inject('ITemplateService') private readonly templateService: ITemplateService) {}

  @Get()
  @Method({ response: { status: 200 } })
  async findAll(): Promise<{ templates: Template[] }> {
    const templates = await this.templateService.findAll();
    return { templates };
  }
}
