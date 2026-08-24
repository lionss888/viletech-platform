import {
  IBaseOptions,
  IBaseQuery,
  IBaseService,
  UpdatePartial,
} from '../../../lib/services/base/base.service.interface';
import { ITreasurerTask } from '../../../lib/interfaces/models/treasurer-task.interface';
import { IFile } from '../../../lib/interfaces/models/file.interface';
import { TreasurerTaskUpdateCommissionDto } from '../dto/treasurer-task.update-commission.dto';

export interface ITreasurerTaskService
  extends IBaseService<ITreasurerTask, ITreasurerTaskQuery, IBaseOptions, ITreasurerTaskCreate, ITreasurerTaskUpdate> {
  /**
   * Генерирует платежное поручение казначея для выплаты
   * Использует основную информацию из сделки и финансовые данные из задачи казначея
   */
  generatePaymentOrder(taskId: string): Promise<IFile>;

  /**
   * Сохраняет подписанное поручение казначея клиентом
   * @param formPaymentId ID сделки (form payment)
   * @param fileId ID файла подписанного поручения
   * @param accountId ID аккаунта клиента
   */
  updateOrderSignedByUser(formPaymentId: string, fileId: string, accountId: string): Promise<ITreasurerTask>;

  /**
   * Удаляет подписанное поручение казначея клиентом
   * @param formPaymentId ID сделки (form payment)
   * @param accountId ID аккаунта клиента
   */
  deleteOrderSignedByUser(formPaymentId: string, accountId: string): Promise<ITreasurerTask>;

  /**
   * Загружает неподписанное поручение казначея (казначеем)
   * @param taskId ID задачи казначея
   * @param fileId ID файла поручения
   */
  updateOrderByTreasurer(taskId: string, fileId: string): Promise<ITreasurerTask>;

  /**
   * Удаляет неподписанное поручение казначея (казначеем)
   * @param taskId ID задачи казначея
   */
  deleteOrderByTreasurer(taskId: string): Promise<ITreasurerTask>;

  /**
   * Прикрепляет подтверждение выплаты по экспортной выручке (казначеем)
   * @param taskId ID задачи казначея
   * @param fileId ID файла подтверждения
   */
  updateExportRevenueConfirmation(taskId: string, fileId: string): Promise<ITreasurerTask>;

  /**
   * Удаляет подтверждение выплаты по экспортной выручке (казначеем)
   * @param taskId ID задачи казначея
   */
  deleteExportRevenueConfirmation(taskId: string): Promise<ITreasurerTask>;

  /**
   * Обновляет комиссию задачи казначея
   * @param findData Данные для поиска задачи
   * @param dto DTO с данными обновления комиссии
   * @param options Опции обновления
   */
  updateCommission(
    findData: ITreasurerTaskQuery,
    dto: TreasurerTaskUpdateCommissionDto,
    options?: IBaseOptions,
  ): Promise<ITreasurerTask>;
}

export interface ITreasurerTaskQuery extends IBaseQuery {
  type?: string;
  status?: string;
  clientId?: string;
  exportPaymentId?: string;
  importPaymentId?: string;
}

export interface ITreasurerTaskCreate extends Partial<ITreasurerTask> {}

export interface ITreasurerTaskUpdate extends UpdatePartial<ITreasurerTask> {}
