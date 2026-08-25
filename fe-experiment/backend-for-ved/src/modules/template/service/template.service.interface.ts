import { Template } from './template.schema';
import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';

export interface ITemplateCreate {
  name: string;
  fileId: string;
  mapping: IExcelMapping;
  isActive?: boolean;
}

export interface ITemplateUpdate {
  name?: string;
  fileId?: string;
  mapping?: IExcelMapping;
  isActive?: boolean;
}

export interface ITemplateService {
  create(data: ITemplateCreate): Promise<Template>;
  findAll(): Promise<Template[]>;
  findOne(id: string): Promise<Template | null>;
  update(id: string, data: ITemplateUpdate): Promise<Template>;
  delete(id: string): Promise<void>;
}
