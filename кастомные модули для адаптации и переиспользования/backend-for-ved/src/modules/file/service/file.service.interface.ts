import { IFile } from 'lib/interfaces/models/file.interface';
import { IBaseService } from 'lib/services/base/base.service.interface';
import { StaticsType } from 'lib/enums/models/file.enums';
import crypto from 'crypto';
import { ReadStream } from 'fs';
import { ITextField } from '../../../lib/interfaces/text-field.interface';
import { DOCX_FILES } from 'lib/docx/enums';
import { IIdFieldQuery } from '../../../lib/interfaces/id-field.query.interface';
import { IIdsFieldQuery } from '../../../lib/interfaces/ids-field.query.interface';

export interface IFileService extends IBaseService<IFile, Partial<IFile>> {
  upload(file: Express.Multer.File, params: Partial<IFile>): Promise<IFile>;

  // VF-2: Базовый метод для загрузки файла из буфера
  baseUpload(data: IBaseUpload): Promise<IFile>;

  createPdf(data: ITextField): Promise<IFile>;

  createDocx(data: ICreateDocumentDocx): Promise<IFile>;

  preview(findData: Partial<IFile>): Promise<IFileData>;

  previewByCompliance(fileId: string): Promise<IFileData>;

  previewInForm(findData: IFileFormPreview): Promise<IFileData>;

  previewInContract(findData: IFileOrganizationPreview): Promise<IFileData>;

  getFileString(findData: Partial<IFile>): Promise<IFileString>;

  getFileBuffer(findData: Partial<IFile>): Promise<Buffer>;

  statics(findData: IStatics): IStaticsData;

  compress(files: IFileCreateZip): Promise<IFile>;

  streamRpcFile(destination: string, findData: IFileQuery): Promise<void>;
}

export interface IFileQuery extends IIdFieldQuery, IIdsFieldQuery {
  private?: boolean;
  account?: string;
  accounts?: string[];
}

export interface IFileString {
  content: string;
}

export interface IFileFormPreview {
  account?: string;
  provider?: string;
  form: string;
  filePath: string;
}

export interface IFileOrganizationPreview {
  contract: string;
  account?: string;
}

export interface IFileData {
  stream: crypto.Decipher;
  file: IFile;
}

export interface IStatics {
  name: string;
  type: StaticsType;
}

export interface IStaticsData {
  mimetype: string;
  stream: ReadStream;
}

export interface IFileCreateZip {
  files: Pick<IFile, '_id' | 'originalName'>[];
  uid: number;
}

export interface IBaseUpload {
  account?: string;
  private: boolean;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface ICreateDocument {
  text: string;
  account?: string;
  filename?: string;
  private?: boolean;
}

export interface ICreateReportDocuments {
  _id: string;
  paymentOrderNumber?: string;
  paymentOrderDate?: Date;
}

export interface ICreateDocumentDocx extends Partial<ICreateDocument> {
  name: DOCX_FILES;
  data?: object;
  account?: string;
  filename?: string;
  private?: boolean;
}

export interface IRequestedMethodCallChunk {
  index: number;
  data: string;
}
