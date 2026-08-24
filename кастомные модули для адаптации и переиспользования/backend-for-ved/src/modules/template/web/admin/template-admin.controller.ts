import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { RootMethod } from 'lib/decorators/root-method.decorator';
import { Template } from '../../service/template.schema';
import { ITemplateService } from '../../service/template.service.interface';
import { TemplateCreateDto } from '../../dto/template.create.dto';
import { TemplateUpdateDto } from '../../dto/template.update.dto';

@ApiCookieAuth()
@ApiTags('admin templates')
@Controller('admin/templates')
export class TemplateAdminController {
  constructor(@Inject('ITemplateService') private readonly templateService: ITemplateService) {}

  @Get()
  async findAll(): Promise<{ templates: Template[] }> {
    const templates = await this.templateService.findAll();
    return { templates };
  }

  @Post()
  @RootMethod({ response: { status: 201, type: Template } })
  async create(@Body() dto: TemplateCreateDto): Promise<Template> {
    return this.templateService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Template | null> {
    return this.templateService.findOne(id);
  }

  @Patch(':id')
  @RootMethod({ response: { status: 200, type: Template } })
  async update(@Param('id') id: string, @Body() dto: TemplateUpdateDto): Promise<Template> {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  @RootMethod({ response: { status: 200 } })
  async delete(@Param('id') id: string): Promise<void> {
    return this.templateService.delete(id);
  }
}
