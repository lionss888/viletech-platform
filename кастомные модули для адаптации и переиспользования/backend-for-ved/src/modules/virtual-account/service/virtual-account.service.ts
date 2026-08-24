import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { VirtualAccount } from './virtual-account.schema';
import { Model } from 'mongoose';
import {
  IVirtualAccountCreate,
  IVirtualAccountQuery,
  IVirtualAccountService,
  IVirtualAccountUpdate,
} from './virtual-account.service.interface';
import { IVirtualAccount } from 'lib/interfaces/models/virtual-account.interface';
import { InjectNats, NatsClientProxy } from 'lib/modules/nats/nats-client-proxy';
import { SocketEventPattern, SocketMessageAction, SocketMessageContext } from 'lib/enums/models/socket.enum';
import { ISocketMessage, ISocketMessageData } from 'lib/interfaces/models/socket.interface';
import { getIdFromAccount } from 'lib/utils/helpers/entity.helper';

@Injectable()
export class VirtualAccountService implements IVirtualAccountService {
  private readonly logger = new Logger(VirtualAccountService.name);

  constructor(
    @InjectModel(VirtualAccount.name) private model: Model<VirtualAccount>,
    @InjectNats() readonly client: NatsClientProxy,
  ) {}

  async create(data: IVirtualAccountCreate): Promise<IVirtualAccount> {
    const virtualAccount = new this.model({
      currency: data.currency,
      available: data.available ?? 0,
      reserved: data.reserved ?? 0,
      totalBalance: data.totalBalance ?? (data.available ?? 0) + (data.reserved ?? 0),
      type: data.type,
      account: data.account,
    });

    await virtualAccount.save();

    const createdVirtualAccount = await this.model.findOne({ _id: virtualAccount._id }).populate('account').exec();
    await this.sendVirtualAccountNotification(createdVirtualAccount);
    return createdVirtualAccount;
  }

  async findOne(findData: IVirtualAccountQuery): Promise<IVirtualAccount | null> {
    return this.model.findOne(findData).populate('account').exec();
  }

  async findMany(findData: IVirtualAccountQuery): Promise<IVirtualAccount[]> {
    return this.model.find(findData).populate('account').exec();
  }

  async update(id: string, data: IVirtualAccountUpdate): Promise<IVirtualAccount> {
    const virtualAccount = await this.model.findById(id).exec();

    if (!virtualAccount) {
      throw new NotFoundException('Virtual account not found');
    }

    if (data.available !== undefined) {
      virtualAccount.available = data.available;
    }

    if (data.reserved !== undefined) {
      virtualAccount.reserved = data.reserved;
    }

    // totalBalance автоматически пересчитывается в pre-save hook схемы
    await virtualAccount.save();

    const updatedVirtualAccount = await this.model.findOne({ _id: virtualAccount._id }).populate('account').exec();
    await this.sendVirtualAccountNotification(updatedVirtualAccount);
    return updatedVirtualAccount;
  }

  async delete(id: string): Promise<void> {
    const result = await this.model.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Virtual account not found');
    }
  }

  async addToReserved(accountId: string, currency: string, type: string, amount: number): Promise<IVirtualAccount> {
    const virtualAccount = await this.model.findOne({ account: accountId, currency, type }).exec();

    if (!virtualAccount) {
      // Создаем новый счет, если его нет
      return this.create({
        account: accountId,
        currency,
        type,
        available: 0,
        reserved: amount,
        // totalBalance автоматически вычисляется в pre-save hook схемы
      });
    }

    virtualAccount.reserved += amount;
    await virtualAccount.save();

    const updatedVirtualAccount = await this.model.findOne({ _id: virtualAccount._id }).populate('account').exec();
    await this.sendVirtualAccountNotification(updatedVirtualAccount);
    return updatedVirtualAccount;
  }

  async subtractFromReserved(
    accountId: string,
    currency: string,
    type: string,
    amount: number,
  ): Promise<IVirtualAccount> {
    const virtualAccount = await this.model.findOne({ account: accountId, currency, type }).exec();

    if (!virtualAccount) {
      throw new NotFoundException('Virtual account not found');
    }

    if (virtualAccount.reserved < amount) {
      throw new Error(`Insufficient reserved balance. Available: ${virtualAccount.reserved}, Required: ${amount}`);
    }

    virtualAccount.reserved -= amount;
    await virtualAccount.save();

    const updatedVirtualAccount = await this.model.findOne({ _id: virtualAccount._id }).populate('account').exec();
    await this.sendVirtualAccountNotification(updatedVirtualAccount);
    return updatedVirtualAccount;
  }

  async moveFromReservedToAvailable(
    accountId: string,
    currency: string,
    type: string,
    amount: number,
  ): Promise<IVirtualAccount> {
    const virtualAccount = await this.model.findOne({ account: accountId, currency, type }).exec();

    if (!virtualAccount) {
      throw new NotFoundException('Virtual account not found');
    }

    if (virtualAccount.reserved < amount) {
      throw new Error(`Insufficient reserved balance. Available: ${virtualAccount.reserved}, Required: ${amount}`);
    }

    virtualAccount.reserved -= amount;
    virtualAccount.available += amount;
    await virtualAccount.save();

    const updatedVirtualAccount = await this.model.findOne({ _id: virtualAccount._id }).populate('account').exec();
    await this.sendVirtualAccountNotification(updatedVirtualAccount);
    return updatedVirtualAccount;
  }

  /**
   * Отправляет сокет-уведомление об изменении виртуального аккаунта
   */
  private async sendVirtualAccountNotification(virtualAccount: IVirtualAccount): Promise<void> {
    try {
      const accountId = getIdFromAccount(virtualAccount.account);

      const socketMessageData: ISocketMessageData<IVirtualAccount> = {
        context: SocketMessageContext.VIRTUAL_ACCOUNT,
        action: SocketMessageAction.UPDATE,
        payload: virtualAccount,
      };

      const notification: ISocketMessage<IVirtualAccount> = {
        account: accountId,
        data: socketMessageData,
      };

      await this.client.emit(SocketEventPattern.SEND_ONE, notification);
      this.logger.debug(`Sent virtual account update notification for account ${accountId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send virtual account notification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Не пробрасываем ошибку, чтобы не блокировать основной процесс
    }
  }
}
