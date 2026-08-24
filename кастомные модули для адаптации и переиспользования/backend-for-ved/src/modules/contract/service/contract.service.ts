import { BadRequestException, forwardRef, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDiadocService } from '../../diadoc/service/diadoc.service.interface';
import { DIADOC_SERVICE } from '../../diadoc/diadoc.constants';
import { IFileService } from '../../file/service/file.service.interface';
import { FILE_SERVICE } from '../../file/file.constants';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import {
  IContractCreate,
  IContractManagerCreate,
  IContractQuery,
  IContractService,
} from './contract.service.interface';
import { BaseService } from 'lib/services/base/base.service';
import { Contract } from './contract.schema';
import { IContract } from 'lib/interfaces/models/contract.interface';
import { IBaseOptions, UpdatePartial } from '../../../lib/services/base/base.service.interface';
import { IFile } from '../../../lib/interfaces/models/file.interface';
import { FilePattern } from '../../../lib/enums/models/file.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import { FormPaymentPattern, FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';
import { OrganizationPattern } from '../../../lib/enums/models/organization.enums';
import { SenderFormPaymentEvents, SenderPattern } from '../../../lib/enums/models/sender.enums';
import * as _ from 'lodash';

@Injectable()
export class ContractService extends BaseService<IContract, Contract, IContractQuery> implements IContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectModel(Contract.name) readonly model: PaginateModel<Contract>,
    @InjectNats() readonly client: NatsClientProxy,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => FILE_SERVICE)) @Optional() private readonly fileService?: IFileService,
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
  ) {
    super();
  }

  async findUser(
    findData: IContractQuery,
    options?: IPaginateOptions & IBaseOptions,
  ): Promise<IPaginateResult<IContract>> {
    const organization = await this.client.send(OrganizationPattern.FIND_ONE_OR_EXCEPTION, {
      query: {
        _id: findData.organization,
        account: findData.account,
        subaccount: findData.account,
      },
    });

    const accounts: string[] = [organization.account, ..._.map(organization.subaccounts, (item) => item.account)];

    return super.find({ ..._.omit(findData, ['account']), accounts }, options);
  }

  async createUser(createData: IContractCreate, options?: IBaseOptions): Promise<IContract> {
    const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
      _id: createData.file,
      account: createData.account._id,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // if (!(createData.account.verification.cuv1 || createData.account.verification.cuv2)) {
    //   throw new BadRequestException('Need verification for payments');
    // }

    // Помечаем старые контракты как rejected
    await this.model.updateMany(
      { organization: createData.organization, agent: createData.agent, status: { $ne: ContractStatus.REJECTED } },
      { $set: { status: ContractStatus.REJECTED } },
    );

    const contract = await super.create(createData, options);

    await this.client.send<void>(FormPaymentPattern.UPDATE_MANY, {
      query: {
        organization: createData.organization,
        agent: createData.agent,
      },
      update: {
        status: FormPaymentStatus.CONTRACT_VERIFICATION,
        prevStatus: FormPaymentStatus.CONTRACT_WAITING,
      },
    });

    return contract;
  }

  async createManager(
    { adminAccount, ...createData }: IContractManagerCreate,
    options?: IBaseOptions,
  ): Promise<IContract> {
    const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
      _id: createData.file,
      account: adminAccount,
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Помечаем старые контракты как rejected
    await this.model.updateMany(
      { organization: createData.organization, agent: createData.agent, status: { $ne: ContractStatus.REJECTED } },
      { $set: { status: ContractStatus.REJECTED } },
    );

    const contract = await super.create(
      {
        ...createData,
        status: ContractStatus.ACCEPTED,
      },
      options,
    );

    await this.client.send<void>(FormPaymentPattern.UPDATE_MANY, {
      query: {
        organization: createData.organization,
        agent: createData.agent,
        statuses: [
          FormPaymentStatus.CONTRACT_WAITING,
          FormPaymentStatus.CONTRACT_VERIFICATION,
          FormPaymentStatus.CONTRACT_WAITING_CORRECTION,
        ],
      },
      update: {
        status: FormPaymentStatus.FORM_ACCEPTED,
        prevStatus: FormPaymentStatus.CONTRACT_WAITING,
      },
    });

    return contract;
  }

  async updateOneUser(
    findData: IContractQuery,
    updateData: UpdatePartial<Contract>,
    options?: IBaseOptions,
  ): Promise<IContract> {
    const contract = await super.findOneOrException(findData);

    if (![ContractStatus.REJECTED].includes(contract.status)) {
      throw new BadRequestException('Can not update contract');
    }

    await this.client.send<void>(FormPaymentPattern.UPDATE_MANY, {
      query: {
        organization: contract.organization,
        agent: contract.agent,
      },
      update: {
        status: FormPaymentStatus.CONTRACT_VERIFICATION,
        prevStatus: FormPaymentStatus.CONTRACT_WAITING,
      },
    });

    updateData.status = ContractStatus.CREATED;

    return super.updateOne(findData, updateData, options);
  }

  async updateOneAdmin(
    findData: IContractQuery,
    updateData: UpdatePartial<Contract>,
    options?: IBaseOptions,
  ): Promise<IContract> {
    const contract = await super.findOneOrException(findData);

    if (contract.status === updateData.status) {
      throw new BadRequestException(
        `Contract already ${contract.status === ContractStatus.ACCEPTED ? 'accepted' : 'rejected'}`,
      );
    }

    let status = FormPaymentStatus.FORM_ACCEPTED;

    if (updateData.status === ContractStatus.REJECTED) {
      status = FormPaymentStatus.CONTRACT_WAITING_CORRECTION;
    }

    await this.client.send<void>(FormPaymentPattern.UPDATE_MANY, {
      query: {
        organization: contract.organization,
        agent: contract.agent,
      },
      update: {
        status,
        prevStatus: FormPaymentStatus.CONTRACT_VERIFICATION,
      },
    });

    return super.updateOne(findData, updateData, options);
  }

  protected async makeQuery({
    _ids,
    accounts,
    organization,
    organizations,
    ...findData
  }: any): Promise<FilterQuery<Contract>> {
    const query: FilterQuery<Contract> = { ...findData };

    if (_ids) {
      query._id = { $in: _ids };
    }

    if (accounts) {
      query.account = { $in: accounts };
    }

    if (organization) {
      query.organization = organization;
    }

    if (organizations) {
      query.organization = { $in: organizations };
    }

    return query;
  }

  // VF-2: Отправка договора на подписание через Diadoc
  async signContractViaDiadoc(findData: IContractQuery, recipientInn: string): Promise<IContract> {
    if (!this.diadocService) {
      throw new BadRequestException('Diadoc service is not available');
    }

    const contract = await this.findOneOrException(findData);

    // Проверяем, что метод подписания установлен в 'diadoc'
    if ((contract as any).signatureType !== 'diadoc') {
      throw new BadRequestException('Contract signature type is not set to diadoc. Please set signature type before sending.');
    }

    // Проверяем, что файл договора загружен
    if (!contract.file) {
      throw new BadRequestException('Contract file not found');
    }

    // Проверяем, что договор еще не отправлен в Diadoc
    const existingDiadocDocId = (contract as any).diadocDocumentId;
    if (existingDiadocDocId) {
      throw new BadRequestException('Contract already sent to Diadoc');
    }

    // Преобразуем fileId в string
    const fileId = typeof contract.file === 'string' ? contract.file : contract.file.toString();

    const file = await this.client.send<IFile>(FilePattern.FIND_ONE, {
      _id: fileId,
    });

    if (!file) {
      throw new BadRequestException('Contract file not found');
    }

    // Получаем buffer файла через FileService
    if (!this.fileService) {
      throw new BadRequestException('File service is not available');
    }

    const fileBuffer = await this.fileService.getFileBuffer({ _id: fileId });

    // Получаем ИНН организации получателя
    if (!recipientInn) {
      throw new BadRequestException('Recipient INN is required for Diadoc signing');
    }

    try {
      // Получаем BoxId получателя для отправки в одном запросе
      const recipientBoxId = await this.diadocService.getBoxIdByInn(recipientInn);
      if (!recipientBoxId) {
        throw new BadRequestException(`Recipient organization not found for INN: ${recipientInn}`);
      }

      // Загружаем и отправляем документ в Diadoc в одном запросе
      const uploadResult = await this.diadocService.uploadDocument(
        fileBuffer,
        file.originalName || `contract-${contract._id}.pdf`,
        file.mimeType || 'application/pdf',
        recipientBoxId,
        true, // needRecipientSignature
      );

      const documentId = uploadResult.documentId || uploadResult.messageId;
      const messageId = uploadResult.messageId;

      // VF-2: Обновляем договор с информацией о Diadoc и устанавливаем промежуточный статус
      const updateData: UpdatePartial<Contract> = {
        diadocDocumentId: documentId,
        diadocMessageId: messageId,
        signatureType: 'diadoc',
        isDiadocSigning: true,
        diadocSentAt: new Date(),
        // VF-2: Устанавливаем промежуточный статус "договор на подписании в ЭДО"
        status: ContractStatus.WAITING_DIADOC,
      } as any;

      const updatedContract = await this.updateOne(findData, updateData);

      // Записываем метрику отправки документа
      if (this.diadocService) {
        this.diadocService.recordDocumentSent('contract');
      }

      this.logger.log(
        `Contract sent to Diadoc for signing: contractId=${contract._id}, documentId=${documentId}, messageId=${messageId}`,
      );

      return updatedContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send contract to Diadoc: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      // VF-2: Отправка уведомления клиенту об ошибке API Diadoc (сценарий A2)
      try {
        const accountId = typeof contract.account === 'string'
          ? contract.account
          : (contract.account as any)?._id?.toString();

        if (accountId) {
          await this.client.send(SenderPattern.SEND_USER, {
            type: SenderFormPaymentEvents.DIADOC_API_ERROR,
            account: accountId,
            data: { ...contract, errorMessage },
            language: 'ru',
          });
        }
      } catch (notificationError) {
        this.logger.warn(`Failed to send error notification: ${notificationError}`);
      }

      throw new BadRequestException(`Failed to send contract to Diadoc: ${errorMessage}`);
    }
  }

  // VF-2: Поиск Contract по Diadoc document ID (для обработки webhook)
  async findOneByDiadocDocumentId(documentId: string): Promise<IContract | null> {
    try {
      const contract = await this.model.findOne({
        diadocDocumentId: documentId,
      } as any);

      return contract ? (contract as any as IContract) : null;
    } catch (error) {
      this.logger.error(`Failed to find Contract by Diadoc document ID: ${error.message}`);
      return null;
    }
  }
}
