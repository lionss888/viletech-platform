import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import {
  IAgentCreateMany,
  IAgentOptions,
  IAgentQuery,
  IAgentService,
  IAgentUpdateByAdmin,
} from './agent.service.interface';
import { IAgent } from 'lib/interfaces/models/agent.interface';
import { BaseService } from 'lib/services/base/base.service';
import { Agent } from './agent.schema';
import { IS3Service } from '../../../lib/modules/s3/s3.service.interface';
import { File } from '../../file/service/file.schema';
import { UpdatePartial } from 'lib/services/base/base.service.interface';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { AgentFilesDto } from '../dto/agent-files.dto';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';

@Injectable()
export class AgentService extends BaseService<IAgent, Agent> implements IAgentService {
  constructor(
    @InjectModel(Agent.name) readonly model: PaginateModel<Agent>,
    @InjectNats() readonly client: NatsClientProxy,
    @Inject('IS3Service') private readonly s3Service: IS3Service,
  ) {
    super();
  }

  async createMany({ agents }: IAgentCreateMany): Promise<void> {
    await this.model.insertMany(agents);
  }

  protected async makeQuery({
    _ids,
    organizationName,
    email,
    phone,
    inn,
    kpp,
    ...findData
  }: any): Promise<FilterQuery<Agent>> {
    const query: FilterQuery<Agent> = { ...findData };

    if (_ids) {
      query._id = { $in: _ids };
    }

    if (organizationName) {
      query.organizationName = new RegExp(organizationName, 'g');
    }

    if (email) {
      query.email = new RegExp(email, 'g');
    }

    if (phone) {
      query.phone = new RegExp(phone, 'g');
    }

    if (inn) {
      query.inn = new RegExp(inn, 'g');
    }

    if (kpp) {
      query.kpp = new RegExp(kpp, 'g');
    }

    return query;
  }

  async updateByAdmin(findData: IAgentQuery, updateData: IAgentUpdateByAdmin): Promise<IAgent> {
    try {
      // Находим агента или выбрасываем исключение
      const agent = await super.findOneOrException({ _id: findData._id });

      // Создаем копию данных для обновления с правильным типом
      const updatePayload = {
        ...updateData,
        cryptoRequisites: agent.cryptoRequisites,
      };

      // Добавление новых криптореквизитов
      if (updateData.addCryptoRequisites?.length) {
        const addCryptoRequisites = _.map(updateData.addCryptoRequisites, (requisites) => ({
          ...requisites,
          uuid: uuidv4(),
        }));

        updatePayload.cryptoRequisites.push(...addCryptoRequisites);
        delete updateData.addCryptoRequisites;
      }

      // Удаление криптореквизитов
      if (updateData.removeCryptoRequisites?.length) {
        updatePayload.cryptoRequisites = _.reject(updatePayload.cryptoRequisites, (transaction) =>
          _.some(updateData.removeCryptoRequisites, (removeTransaction) => transaction.uuid === removeTransaction.uuid),
        );
        delete updateData.removeCryptoRequisites;
      }

      // Если нет файлов, просто обновляем данные
      return super.updateOne(findData, updatePayload as UpdatePartial<Agent>);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update agent');
    }
  }

  async updateFilesOnly(findData: { _id: string }, dto: AgentFilesDto): Promise<IAgent> {
    try {
      const agent = await super.findOneOrException(findData);

      if (!dto.stamp && !dto.signature) {
        return agent;
      }

      const updatePayload = {
        stamp: dto.stamp || undefined,
        signatures: dto.signature || undefined,
      };

      return super.updateOne(findData, updatePayload);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update agent files: ${JSON.stringify(error)}`);
    }
  }

  async create(createData: any, options?: IAgentOptions): Promise<IAgent> {
    try {
      const { files, ...baseOptions } = options || {};

      if (files?.stamp || files?.signature) {
        const updatedData = { ...createData };

        if (files.stamp) {
          const fileDto: Partial<File> = {
            account: createData._id,
            private: false,
          };
          const stampUrl = await this.s3Service.upload(files.stamp, fileDto);
          _.set(updatedData, 'director.stamp', stampUrl);
        }

        if (files.signature) {
          const fileDto: Partial<File> = {
            account: createData._id,
            private: false,
          };
          const signatureUrl = await this.s3Service.upload(files.signature, fileDto);
          _.set(updatedData, 'director.signatures', signatureUrl);
        }

        return super.create(updatedData, baseOptions);
      }

      return super.create(createData, baseOptions);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create agent');
    }
  }
}
