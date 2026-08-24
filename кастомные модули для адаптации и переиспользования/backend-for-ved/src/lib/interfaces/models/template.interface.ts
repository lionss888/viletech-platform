import { Document } from 'mongoose';
import { IExcelMapping } from '../excel-parser.interface';

export interface ITemplate extends Document {
  name: string;
  fileId: string;
  mapping: IExcelMapping;
  isActive: boolean;
  createDate: Date;
  updateDate: Date;
}
