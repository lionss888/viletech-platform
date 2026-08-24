import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IVirtualAccountService } from '../../../virtual-account/service/virtual-account.service.interface';
import { IReservedDealService } from '../../../virtual-account/service/reserved-deal.service.interface';
import { IAccountService } from '../../../account/service/account.service.interface';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { FormPaymentStatus, FormPaymentDirection } from 'lib/enums/models/form-payment.enums';
import { AllCurrencies } from 'lib/enums/common.enums';
import { getIdFromAccount } from 'lib/utils/helpers/entity.helper';
import { currencyType } from '../../../currency/currency.contants';
import { CurrencyType } from 'lib/enums/models/currency.enums';
import { VirtualAccountType } from 'lib/enums/models/virtual-account.enums';

// Статусы, которые означают, что средства находятся в резерве
const RESERVED_STATUSES = new Set([
  FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
  FormPaymentStatus.SIGNING_ORDER_VERIFICATION,
  FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
  FormPaymentStatus.PAYMENT_RECEIVED,
  FormPaymentStatus.PAYMENT_PROCESSING,
  FormPaymentStatus.PAYMENT_SENT,
]);

@Injectable()
export class VirtualAccountUpdateService {
  private readonly logger: Logger = new Logger(VirtualAccountUpdateService.name);

  constructor(
    @Inject('IVirtualAccountService') private readonly virtualAccountService: IVirtualAccountService,
    @Inject('IReservedDealService') private readonly reservedDealService: IReservedDealService,
    @Inject('IAccountService') private readonly accountService: IAccountService,
  ) {}

  /**
   * Определяет тип виртуального счета (fiat/crypto) на основе типа валюты
   */
  private getVirtualAccountType(currency: AllCurrencies): VirtualAccountType {
    const currencyTypeValue = currencyType[currency];
    if (currencyTypeValue === CurrencyType.COIN || currencyTypeValue === CurrencyType.STABLECOIN) {
      return VirtualAccountType.CRYPTO;
    }
    return VirtualAccountType.FIAT;
  }

  /**
   * Проверяет, является ли клиент корпоративным
   */
  private async isCorporateClient(formPayment: IFormPayment): Promise<boolean> {
    if (!formPayment.account) {
      this.logger.warn(`Form payment ${formPayment._id}: account is missing for corporate check`);
      return false;
    }

    // Если account уже является объектом с полной информацией
    if (typeof formPayment.account === 'object' && formPayment.account !== null && '_id' in formPayment.account) {
      const account = formPayment.account as IAccount;
      // Если поле isCorporateClient присутствует и имеет значение, используем его
      if ('isCorporateClient' in account && account.isCorporateClient !== undefined) {
        const isCorporate = account.isCorporateClient === true;
        this.logger.debug(
          `Form payment ${formPayment._id}: account is object, isCorporateClient=${account.isCorporateClient}, result=${isCorporate}`,
        );
        return isCorporate;
      }
      // Если поле отсутствует, загружаем аккаунт из базы данных
      this.logger.debug(
        `Form payment ${formPayment._id}: account object exists but isCorporateClient is undefined, loading from DB`,
      );
    }

    const accountId = getIdFromAccount(formPayment.account);
    if (!accountId) {
      this.logger.warn(`Form payment ${formPayment._id}: cannot extract account ID for corporate check`);
      return false;
    }

    try {
      const account = await this.accountService.findOne({ _id: accountId });
      const isCorporate = account?.isCorporateClient === true;
      this.logger.debug(
        `Form payment ${formPayment._id}: loaded account ${accountId}, isCorporateClient=${account?.isCorporateClient}, result=${isCorporate}`,
      );
      return isCorporate;
    } catch (error) {
      this.logger.error(
        `Failed to get account ${accountId} for corporate check: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  /**
   * Обновляет виртуальные счета при изменении статуса сделки
   */
  async updateVirtualAccountsOnStatusChange(
    formPayment: IFormPayment,
    oldStatus: FormPaymentStatus,
    newStatus: FormPaymentStatus,
  ): Promise<void> {
    if (!formPayment.account || !formPayment.currency || !formPayment.totals) {
      this.logger.warn(
        `Skipping virtual account update for form payment ${
          formPayment._id
        }: missing required fields (account: ${!!formPayment.account}, currency: ${!!formPayment.currency}, totals: ${!!formPayment.totals})`,
      );
      return;
    }

    const accountId = getIdFromAccount(formPayment.account);
    const isExport = formPayment.direction === FormPaymentDirection.EXPORT;
    const currency = isExport ? formPayment.currency.counterparty : formPayment.currency.client;

    if (!currency) {
      this.logger.warn(
        `Skipping virtual account update for form payment ${formPayment._id}: currency is missing (isExport: ${isExport})`,
      );
      return;
    }

    const accountType = this.getVirtualAccountType(currency);
    const rawAmount = isExport ? formPayment.totals?.amount : formPayment.totals?.coverAmount;

    if (rawAmount === undefined || rawAmount === null) {
      this.logger.warn(
        `Skipping virtual account update for form payment ${formPayment._id}: amount is missing (isExport: ${isExport}, amount: ${rawAmount})`,
      );
      return;
    }

    const amount = rawAmount / 100;

    if (amount <= 0) {
      this.logger.warn(`Skipping virtual account update for form payment ${formPayment._id}: invalid amount ${amount}`);
      return;
    }

    try {
      // Находим виртуальный счет
      let virtualAccount = await this.virtualAccountService.findOne({
        account: accountId,
        currency: currency,
        type: accountType,
      });

      // Создаем счет, если его нет
      if (!virtualAccount) {
        this.logger.warn(
          `Virtual account not found for account ${accountId}, currency ${currency}, type ${accountType}. Creating new account.`,
        );
        virtualAccount = await this.virtualAccountService.create({
          account: accountId,
          currency: currency,
          type: accountType,
          available: 0,
          reserved: 0,
          totalBalance: 0,
        });
      }

      const virtualAccountId = String(virtualAccount._id);
      const formPaymentId = String(formPayment._id);

      // Добавляем в reserved при переходе в резервный статус
      // Проверяем наличие reserved deal - если его нет, резервируем средства
      const isNewStatusReserved = RESERVED_STATUSES.has(newStatus);

      this.logger.debug(
        `Form payment ${formPayment._id}: status change ${oldStatus} -> ${newStatus}, isNewReserved: ${isNewStatusReserved}`,
      );

      // Резервируем средства если новый статус резервный и reserved deal не существует
      if (isNewStatusReserved) {
        // Для standalone MongoDB используем операции без транзакций
        // Уникальный индекс защищает от дубликатов
        try {
          const isAlreadyReserved = await this.reservedDealService.exists(formPaymentId, virtualAccountId);
          this.logger.debug(
            `Form payment ${formPayment._id}: checking reserved deal, exists: ${isAlreadyReserved}, amount: ${amount}, currency: ${currency}`,
          );

          if (!isAlreadyReserved) {
            await this.virtualAccountService.addToReserved(accountId, currency, accountType, amount);
            await this.reservedDealService.create(formPaymentId, virtualAccountId);
            this.logger.log(
              `Added ${amount} ${currency} to reserved for account ${accountId} (form payment ${formPayment._id}) - status: ${newStatus}`,
            );
          } else {
            this.logger.debug(`Form payment ${formPayment._id}: reserved deal already exists, skipping reservation`);
          }
        } catch (error) {
          if (error?.code === 11000 || error?.codeName === 'DuplicateKey') {
            this.logger.warn(
              `Reserved deal already exists for form payment ${formPayment._id}, skipping duplicate creation`,
            );
          } else {
            this.logger.error(
              `Error adding to reserved for form payment ${formPayment._id}: ${error.message}`,
              error instanceof Error ? error.stack : undefined,
            );
            throw error;
          }
        }
      }

      // Определяем условия для списания
      const isImport = formPayment.direction === FormPaymentDirection.IMPORT;
      // Проверяем корпоративность только при переходе в PAYMENT_PROCESSING для импортных сделок
      const needsCorporateCheck = isImport && newStatus === FormPaymentStatus.PAYMENT_PROCESSING;
      const isCorporate = needsCorporateCheck ? await this.isCorporateClient(formPayment) : false;
      const shouldDeductAtProcessing = isImport && isCorporate;

      this.logger.debug(
        `Form payment ${formPayment._id}: isImport=${isImport}, needsCorporateCheck=${needsCorporateCheck}, isCorporate=${isCorporate}, shouldDeductAtProcessing=${shouldDeductAtProcessing}, status=${oldStatus}->${newStatus}`,
      );

      // Списание из резерва при переходе в PAYMENT_PROCESSING для корпоративных клиентов с импортными сделками
      const isPaymentProcessingTransition =
        newStatus === FormPaymentStatus.PAYMENT_PROCESSING && oldStatus !== FormPaymentStatus.PAYMENT_PROCESSING;

      this.logger.debug(
        `Form payment ${formPayment._id}: checking PAYMENT_PROCESSING deduction - isTransition: ${isPaymentProcessingTransition}, shouldDeduct: ${shouldDeductAtProcessing}`,
      );

      if (isPaymentProcessingTransition && shouldDeductAtProcessing) {
        try {
          const isAlreadyReserved = await this.reservedDealService.exists(formPaymentId, virtualAccountId);
          this.logger.debug(
            `Form payment ${formPayment._id}: PAYMENT_PROCESSING - reserved deal exists: ${isAlreadyReserved}, amount: ${amount}, currency: ${currency}`,
          );

          if (isAlreadyReserved) {
            await this.virtualAccountService.subtractFromReserved(accountId, currency, accountType, amount);
            try {
              await this.reservedDealService.delete(formPaymentId, virtualAccountId);
              this.logger.log(
                `Subtracted ${amount} ${currency} from reserved for account ${accountId} (form payment ${formPayment._id}) - PAYMENT_PROCESSING (corporate import)`,
              );
            } catch (deleteError) {
              if (deleteError instanceof NotFoundException) {
                this.logger.warn(`Reserved deal already deleted for form payment ${formPayment._id}, continuing`);
              } else {
                throw deleteError;
              }
            }
          } else {
            this.logger.warn(
              `Form payment ${formPayment._id}: PAYMENT_PROCESSING - no reserved deal found, cannot deduct`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error subtracting from reserved for form payment ${formPayment._id}: ${error.message}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      } else if (isPaymentProcessingTransition && !shouldDeductAtProcessing) {
        this.logger.debug(
          `Form payment ${formPayment._id}: PAYMENT_PROCESSING - skipping deduction (not corporate import: isImport=${isImport}, isCorporate=${isCorporate})`,
        );
      }

      if (newStatus === FormPaymentStatus.PAYMENT_SENT && oldStatus !== FormPaymentStatus.PAYMENT_SENT) {
        const isAlreadyReserved = await this.reservedDealService.exists(formPaymentId, virtualAccountId);

        if (isAlreadyReserved) {
          try {
            await this.virtualAccountService.subtractFromReserved(accountId, currency, accountType, amount);
            try {
              await this.reservedDealService.delete(formPaymentId, virtualAccountId);
            } catch (deleteError) {
              if (deleteError instanceof NotFoundException) {
                this.logger.warn(`Reserved deal already deleted for form payment ${formPayment._id}, continuing`);
              } else {
                throw deleteError;
              }
            }
            this.logger.log(
              `Subtracted ${amount} ${currency} from reserved for account ${accountId} (form payment ${formPayment._id}) - PAYMENT_SENT`,
            );
          } catch (error) {
            this.logger.error(
              `Error subtracting from reserved for form payment ${formPayment._id}: ${error.message}`,
              error instanceof Error ? error.stack : undefined,
            );
            throw error;
          }
        } else {
          this.logger.debug(
            `Form payment ${formPayment._id}: PAYMENT_SENT - no reserved deal found, skipping deduction (may have been already deducted at PAYMENT_PROCESSING for corporate import)`,
          );
        }
      }

      // Перемещение из reserved в available при специфических переходах статусов
      // 1. CANCELED_BY_MANAGER после SIGNING_ORDER_VERIFICATION
      if (
        newStatus === FormPaymentStatus.CANCELED_BY_MANAGER &&
        oldStatus === FormPaymentStatus.SIGNING_ORDER_VERIFICATION
      ) {
        try {
          const isAlreadyReserved = await this.reservedDealService.exists(formPaymentId, virtualAccountId);
          if (isAlreadyReserved) {
            await this.virtualAccountService.moveFromReservedToAvailable(accountId, currency, accountType, amount);
            try {
              await this.reservedDealService.delete(formPaymentId, virtualAccountId);
            } catch (deleteError) {
              if (deleteError instanceof NotFoundException) {
                this.logger.warn(`Reserved deal already deleted for form payment ${formPayment._id}, continuing`);
              } else {
                throw deleteError;
              }
            }
          }
          this.logger.log(
            `Moved ${amount} ${currency} from reserved to available for account ${accountId} (form payment ${formPayment._id}) - CANCELED_BY_MANAGER after SIGNING_ORDER_VERIFICATION`,
          );
        } catch (error) {
          this.logger.error(
            `Error moving from reserved to available for form payment ${formPayment._id}: ${error.message}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      }

      // 2. SIGNING_ORDER_ACCEPTED после PAYMENT_PROCESSING
      if (
        newStatus === FormPaymentStatus.SIGNING_ORDER_ACCEPTED &&
        oldStatus === FormPaymentStatus.PAYMENT_PROCESSING
      ) {
        try {
          const isAlreadyReserved = await this.reservedDealService.exists(formPaymentId, virtualAccountId);
          if (isAlreadyReserved) {
            await this.virtualAccountService.moveFromReservedToAvailable(accountId, currency, accountType, amount);
            try {
              await this.reservedDealService.delete(formPaymentId, virtualAccountId);
            } catch (deleteError) {
              if (deleteError instanceof NotFoundException) {
                this.logger.warn(`Reserved deal already deleted for form payment ${formPayment._id}, continuing`);
              } else {
                throw deleteError;
              }
            }
          }
          this.logger.log(
            `Moved ${amount} ${currency} from reserved to available for account ${accountId} (form payment ${formPayment._id}) - SIGNING_ORDER_ACCEPTED after PAYMENT_PROCESSING`,
          );
        } catch (error) {
          this.logger.error(
            `Error moving from reserved to available for form payment ${formPayment._id}: ${error.message}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error updating virtual accounts for form payment ${formPayment._id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Не пробрасываем ошибку, чтобы не блокировать основной процесс обновления заявки
    }
  }
}
