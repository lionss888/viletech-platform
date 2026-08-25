import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Template } from './template.schema';
import { ITemplateService, ITemplateCreate, ITemplateUpdate } from './template.service.interface';

@Injectable()
export class TemplateService implements ITemplateService {
  private readonly logger: Logger = new Logger(TemplateService.name);

  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<Template>,
  ) {}

  async create(data: ITemplateCreate): Promise<Template> {
    const template = new this.templateModel(data);
    const result = await template.save();
    this.logger.log(`Template created: ${result._id}, name: ${result.name}`);
    return result;
  }

  async findAll(): Promise<Template[]> {
    return this.templateModel.find().exec();
  }

  async findOne(id: string): Promise<Template | null> {
    return this.templateModel.findById(id).exec();
  }

  async update(id: string, data: ITemplateUpdate): Promise<Template> {
    const template = await this.templateModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    this.logger.log(`Template updated: ${id}`);
    return template;
  }

  async delete(id: string): Promise<void> {
    const result = await this.templateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    this.logger.log(`Template deleted: ${id}`);
  }
}
