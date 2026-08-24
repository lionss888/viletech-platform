import { ISchema } from '../schema.interface';
import { HsCodeLoyalty } from '../../enums/models/hs-code.enums';

export interface IHsCodeBase {
  code: string;
  description: string;
  chapter?: string;
  section?: string;
  type?: string;
  loyalty: HsCodeLoyalty;
  comment?: string;
  active: boolean;
}

export interface IHsCode extends IHsCodeBase, ISchema {}

export interface IHsCodeSnapshot {
  code: string;
  description?: string;
  chapter?: string;
  section?: string;
  type?: string;
  loyalty?: HsCodeLoyalty;
  comment?: string;
  isManual: boolean;
  isActive: boolean;
}
