import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, Types } from 'mongoose';
import { File } from './file.schema';
import {
  IBaseUpload,
  ICreateDocument,
  ICreateDocumentDocx,
  IFileCreateZip,
  IFileFormPreview,
  IFileOrganizationPreview,
  IFileQuery,
  IFileService,
  IStatics,
} from './file.service.interface';
import { createSalt } from 'lib/utils/helpers/crypto.helper';
import { ConfigService } from '@nestjs/config';
import { IFile } from 'lib/interfaces/models/file.interface';
import crypto from 'crypto';
import * as _ from 'lodash';
import { BaseService } from 'lib/services/base/base.service';
import mime from 'mime-types';
import path from 'path';
import fs from 'fs';
import { IS3Service } from 'lib/modules/s3/s3.service.interface';
import { gotenberg, html, pipe, please, convert } from 'gotenberg-js-client';
import { runWorkerCreateArchive } from '../../../workers';
import { FormPaymentPattern } from '../../../lib/enums/models/form-payment.enums';
import { IOcrService, OCR_SERVICE } from '../../../lib/services/ocr/ocr.service.interface';
import { Packer } from 'docx';
import { generateDocxFile } from 'lib/docx/generators';
import { splitBuffer } from '../../../lib/utils/split-buffer';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { MimeTypes } from '../../../lib/enums/common.enums';
import { ContractPattern } from '../../../lib/enums/models/contract.enums';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { IOrganizationService } from '../../organization/service/organization.service.interface';
import { ORGANIZATION_SERVICE } from '../../organization/organization.constants';

@Injectable()
export class FileService extends BaseService<IFile, File, IFileQuery> implements IFileService {
  private readonly logger: Logger = new Logger(FileService.name);

  constructor(
    @InjectModel(File.name) readonly model: PaginateModel<File>,
    @Inject('IS3Service') private readonly s3Service: IS3Service,
    @InjectNats() readonly client: NatsClientProxy,
    @Inject(OCR_SERVICE) protected readonly ocrService: IOcrService,
    private readonly configService: ConfigService,
    @Inject(FORM_PAYMENT_SERVICE)
    private readonly formPaymentService: IFormPaymentService,
    @Inject(ORGANIZATION_SERVICE)
    private readonly organizationService: IOrganizationService,
  ) {
    super();
  }

  /**
   * Извлекает строковый ID из значения, которое может быть строкой, ObjectId или объектом с _id
   */
  private getIdAsString(id: string | Types.ObjectId | { _id?: string | Types.ObjectId } | undefined): string | null {
    if (!id) {
      return null;
    }

    if (typeof id === 'string') {
      return id;
    }

    if (id instanceof Types.ObjectId) {
      return id.toString();
    }

    if (typeof id === 'object' && '_id' in id) {
      return this.getIdAsString(id._id);
    }

    return null;
  }

  async baseUpload(data: IBaseUpload) {
    const salt = createSalt();

    const fileModel = new this.model({
      account: data.account,
      private: data.private,
      originalName: data.originalName,
      mimeType: data.mimeType,
      salt: salt.toString('hex'),
      size: data.size,
    });

    const cipher = crypto.createCipheriv('aes-256-ctr', this.configService.get('secretKey'), salt);
    const bufferHash = Buffer.concat([cipher.update(data.buffer), cipher.final()]);

    const pathName = `fea/documents/${fileModel._id}`;

    await this.s3Service.upload(bufferHash, pathName);

    await fileModel.save();

    return fileModel.toJSON({ flattenMaps: false });
  }

  async upload(file: Express.Multer.File, dto: Partial<File>): Promise<IFile> {
    return this.baseUpload({
      account: dto.account as string,
      private: dto.private,
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf-8'),
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  async createPdf(data: ICreateDocument): Promise<IFile> {
    const toPDF = pipe(gotenberg(this.configService.get('gotenberg.html')), convert, html, please);

    const stream = await toPDF(data.text);
    const buffer = await this.stream2buffer(stream);

    return this.baseUpload({
      private: true,
      originalName: data.filename || 'order.pdf',
      mimeType: MimeTypes.PDF,
      size: Buffer.byteLength(buffer),
      buffer,
    });
  }

  async compress({ files, uid }: IFileCreateZip) {
    const filesMap = await Promise.all(
      _.map(files, async (file) => {
        const result = await this.getFileString({ _id: file._id });
        return {
          content: result.content,
          originalName: file.originalName,
        };
      }),
    );

    const originalName = `archive-${uid}.zip`;
    const archivePath = path.join(__dirname, originalName);

    await runWorkerCreateArchive({ data: { archivePath, files: filesMap } });

    const buffer = fs.readFileSync(archivePath);

    const file = await this.baseUpload({
      private: true,
      originalName,
      mimeType: MimeTypes.ZIP,
      size: Buffer.byteLength(buffer),
      buffer,
    });

    fs.unlinkSync(archivePath);

    return file;
  }

  private async stream2buffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const _buf: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => _buf.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(_buf)));
      stream.on('error', (err) => reject(`error converting stream - ${err}`));
    });
  }

  async preview(findData: IFileQuery) {
    // Сначала пытаемся найти файл с проверкой прямого доступа
    let file: IFile;
    try {
      file = await this.findOneOrException(findData);
    } catch (error) {
      // Если файл не найден и указан account, проверяем доступ через организацию
      if (findData.account && findData._id) {
        const formPayment = await this.findFormPaymentByFileId(findData._id);
        if (formPayment && formPayment._id) {
          // Получаем ID сделки как строку
          const formPaymentId = this.getIdAsString(formPayment._id);

          if (!formPaymentId) {
            throw error;
          }

          // Проверяем доступ к сделке через организацию
          await this.formPaymentService.checkFormPaymentAccess(formPaymentId, findData.account);
          // Если доступ есть, находим файл без проверки account
          file = await this.findOneOrException({ _id: findData._id });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const pathName = `fea/documents/${file._id}`;

    const result = await this.s3Service.getFileString(pathName);

    const decipher = crypto.createDecipheriv(
      'aes-256-ctr',
      this.configService.get('secretKey'),
      Buffer.from(file.salt, 'hex'),
    );

    decipher.write(result);
    decipher.end();

    return { stream: decipher, file };
  }

  async previewByCompliance(fileId: string) {
    const file = await this.findOneOrException({ _id: fileId, private: true });

    const pathName = `fea/documents/${file._id}`;

    const result = await this.s3Service.getFileString(pathName);

    const decipher = crypto.createDecipheriv(
      'aes-256-ctr',
      this.configService.get('secretKey'),
      Buffer.from(file.salt, 'hex'),
    );

    decipher.write(result);
    decipher.end();

    return { stream: decipher, file };
  }

  async previewInForm(findData: IFileFormPreview) {
    let formPayment: IFormPayment;

    // Проверяем доступ к сделке через организацию (включая сабаккаунты и владельцев)
    // checkFormPaymentAccess возвращает сделку, используем её для избежания дублирования запроса
    if (findData.account) {
      formPayment = await this.formPaymentService.checkFormPaymentAccess(findData.form, findData.account);
    } else {
      // Если account не указан, получаем сделку напрямую
      formPayment = await this.client.send(FormPaymentPattern.FIND_ONE_OR_EXCEPTION, {
        query: {
          _id: findData.form,
        },
        options: {
          include: ['agent'],
        },
      });
    }

    if (!formPayment) {
      throw new NotFoundException('Form payment not found');
    }

    const file = _.get(formPayment, findData.filePath);

    if (!file) {
      throw new BadRequestException('File path not found');
    }

    // Получаем ID файла (может быть строка, ObjectId или объект IFile)
    const fileId = this.getIdAsString(file);

    if (!fileId) {
      throw new BadRequestException('File path not found');
    }

    // Получаем файл без проверки account, так как доступ уже проверен через сделку
    return this.preview({ _id: fileId });
  }

  async previewInContract(findData: IFileOrganizationPreview) {
    const contract = await this.client.send(ContractPattern.FIND_ONE, { query: { _id: findData.contract } });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Проверяем, что контракт привязан к организации
    if (!contract.organization) {
      throw new NotFoundException('Contract not found');
    }

    // Проверяем доступ к организации через новую систему доступа
    if (findData.account) {
      const organizationId = this.getIdAsString(contract.organization);

      if (organizationId) {
        const hasAccess = await this.organizationService.hasOrganizationAccess(organizationId, findData.account);
        if (!hasAccess) {
          throw new NotFoundException('Contract not found');
        }
      }
    }

    // Получаем ID файла контракта
    const fileId = this.getIdAsString(contract.file);

    if (!fileId) {
      throw new NotFoundException('Contract file not found');
    }

    // Получаем файл без проверки account, так как доступ уже проверен через организацию
    return this.preview({ _id: fileId });
  }

  /**
   * Находит сделку (FormPayment), в которой используется файл с указанным ID
   * Файл может быть в любом из полей docs, в contract/importFile или в invoices
   */
  private async findFormPaymentByFileId(fileId: string): Promise<IFormPayment | null> {
    // Ищем сделку, где файл используется в любом из полей
    const query = {
      $or: [
        { 'docs.paymentOrder': fileId },
        { 'docs.paymentOrderDocx': fileId },
        { 'docs.paymentAdvanceOrder': fileId },
        { 'docs.paymentAdvanceOrderDocx': fileId },
        { 'docs.paymentOrderSigned': fileId },
        { 'docs.report': fileId },
        { 'docs.docxFile': fileId },
        { 'docs.reportSigned': fileId },
        { 'docs.archive': fileId },
        { 'docs.payments': fileId },
        { 'docs.closing': fileId },
        { 'docs.refund': fileId },
        { 'docs.additional': fileId },
        { 'docs.swift': fileId },
        { contract: fileId },
        { importFile: fileId },
        { 'invoices.file': fileId },
      ],
    };

    const formPayment = await this.client.send<IFormPayment>(FormPaymentPattern.FIND_ONE, {
      query,
    });

    return formPayment || null;
  }

  async getFileString(findData: IFileQuery) {
    const result = await this.preview(findData);

    const buffer = await this.stream2buffer(_.clone(result.stream));

    return { content: buffer.toString('base64') };
  }

  async getFileBuffer(findData: IFileQuery) {
    const result = await this.preview(findData);

    return this.stream2buffer(_.clone(result.stream));
  }

  statics(findData: IStatics) {
    const pathName = path.join(__dirname, '../statics', findData.type, findData.name);

    if (!fs.existsSync(pathName)) {
      throw new NotFoundException('File not found');
    }

    const mimetype = mime.lookup(findData.name);
    if (!mimetype) {
      throw new BadRequestException('Unable to determine mimetype.');
    }

    return {
      stream: fs.createReadStream(pathName),
      mimetype: mime.lookup(findData.name) as string,
    };
  }

  async streamRpcFile(destination: string, findData: IFileQuery): Promise<void> {
    const { stream, file } = await this.preview(findData);
    const buffer = await this.stream2buffer(_.clone(stream));
    const chunks = splitBuffer(buffer, 1024 * 512); // 512 KB
    let chunkIndex = 0;

    try {
      for (const chunk of chunks) {
        chunkIndex++;
        await this.client.send(destination, {
          _id: file._id,
          index: chunkIndex,
          data: chunk.toString('base64'),
          isLast: false,
        });
      }

      await this.client.send(destination, {
        _id: file._id,
        index: chunkIndex,
        isLast: true,
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  protected async makeQuery({ _id, account, accounts, _ids, ...findData }: IFileQuery): Promise<FilterQuery<File>> {
    let result: FilterQuery<File> = {};

    if (_id) {
      result._id = _id;
    }

    if (_.isBoolean(findData.private)) {
      result.private = findData.private;
    }

    if (_ids) {
      result._id = { $in: _ids };
    }

    if (account) {
      result = {
        $or: [
          { _id: result._id, account },
          { _id: result._id, private: false },
        ],
      };
    }

    if (accounts) {
      result.accounts = { $in: accounts };
    }

    return result;
  }

  private getMimeType(name: string) {
    const nameArray = name.split('.');
    if (!nameArray.length) return;

    const extension = nameArray.pop();

    if (['jpeg', 'jpg'].includes(extension)) {
      return 'image/jpeg';
    }

    if (['png'].includes(extension)) {
      return 'image/png';
    }
  }

  async createDocx(createDocumentData: ICreateDocumentDocx): Promise<IFile> {
    try {
      const { data } = createDocumentData;

      const doc = generateDocxFile(createDocumentData.name, data);

      const buffer = await Packer.toBuffer(doc);

      // Загрузка файла через baseUpload
      return this.baseUpload({
        ...(createDocumentData.account ? { account: createDocumentData.account } : {}),
        private: createDocumentData.private || false,
        originalName: createDocumentData.filename || 'document.docx',
        mimeType: MimeTypes.DOCX,
        size: Buffer.byteLength(buffer),
        buffer,
      });
    } catch (error) {
      this.logger.error('Failed to create DOCX:', error);
      throw new InternalServerErrorException('Cannot create DOCX file');
    }
  }
}
