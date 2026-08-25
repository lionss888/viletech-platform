import { IBaseService, OmitBaseSchema } from 'lib/services/base/base.service.interface';
import { IHsCode } from 'lib/interfaces/models/hs-code.interface';
import { IPaginateOptions, IPaginateResult } from 'lib/interfaces/paginate.interface';

export interface IHsCodeImportResult {
  imported: number;
  updated: number;
  errors?: string[];
  warnings?: string[];
  totalRows?: number;
}

export interface IHsCodeService extends IBaseService<IHsCode, IHsCodeQuery> {
  findByCode(code: string): Promise<IHsCode | undefined>;

  findActive(search?: string, options?: IPaginateOptions): Promise<IPaginateResult<IHsCode>>;

  deactivate(hsCodeId: string): Promise<IHsCode>;

  activate(hsCodeId: string): Promise<IHsCode>;

  importFromExcel(buffer: Buffer): Promise<IHsCodeImportResult>;

  deleteHsCode(hsCodeId: string): Promise<void>;

  countByRegex(codeRegex: string, active?: boolean): Promise<number>;
}

export interface IHsCodeCreate extends OmitBaseSchema<IHsCode> {}

export interface IHsCodeUpdate extends Partial<OmitBaseSchema<IHsCode>> {}

export interface IHsCodeQuery extends Partial<IHsCode> {
  _ids?: string[];
  codes?: string[];
  code?: string;
  search?: string;
}
