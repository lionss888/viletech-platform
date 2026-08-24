import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { TREASURER_TASK_SERVICE } from '../../treasurer-task.constants';
import { ITreasurerTaskService } from '../../service/treasurer-task.service.interface';
import { TreasurerTaskUpdateStatusDto } from '../../dto/treasurer-task.update-status.dto';
import { TreasurerTaskUpdateExchangeRateDto } from '../../dto/treasurer-task.update-exchange-rate.dto';
import { TreasurerTaskUpdateCommissionDto } from '../../dto/treasurer-task.update-commission.dto';
import { TreasurerTaskUpdateOrderFileDto } from '../../dto/treasurer-task.update-order-file.dto';
import { TreasurerTaskUpdateExportRevenueConfirmationDto } from '../../dto/treasurer-task.update-export-revenue-confirmation.dto';
import { TreasurerMethod } from '../../../../lib/decorators/treasurer-method.decorator';
import { ITreasurerTask } from '../../../../lib/interfaces/models/treasurer-task.interface';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { IFile } from '../../../../lib/interfaces/models/file.interface';

@ApiCookieAuth()
@ApiTags('treasurer task')
@Controller('admin/treasurer/task')
export class TreasurerTaskTreasurerController {
  constructor(@Inject(TREASURER_TASK_SERVICE) private readonly service: ITreasurerTaskService) {}

  @Get()
  @TreasurerMethod({})
  async findAll(): Promise<ITreasurerTask[]> {
    return this.service.findMany({});
  }

  @Patch(':_id/status')
  @TreasurerMethod({})
  async updateStatus(@Param() params: IdFieldDto, @Body() dto: TreasurerTaskUpdateStatusDto): Promise<ITreasurerTask> {
    return this.service.updateOneOrException({ _id: params._id }, { status: dto.status });
  }

  @Patch(':_id/exchange-rate')
  @TreasurerMethod({})
  async updateExchangeRate(
    @Param() params: IdFieldDto,
    @Body() dto: TreasurerTaskUpdateExchangeRateDto,
  ): Promise<ITreasurerTask> {
    return this.service.updateOneOrException({ _id: params._id }, { exchangeRate: dto.exchangeRate });
  }

  @Patch(':_id/commission')
  @TreasurerMethod({})
  async updateCommission(
    @Param() params: IdFieldDto,
    @Body() dto: TreasurerTaskUpdateCommissionDto,
  ): Promise<ITreasurerTask> {
    return this.service.updateCommission({ _id: params._id }, dto);
  }

  @Post(':_id/generate-payment-order')
  @TreasurerMethod({})
  @ApiOperation({
    summary: 'Сгенерировать платежное поручение казначея',
    description: 'Генерирует PDF файл платежного поручения на основе данных задачи казначея и связанной сделки',
  })
  async generatePaymentOrder(@Param() params: IdFieldDto): Promise<IFile> {
    return this.service.generatePaymentOrder(params._id);
  }

  @Patch(':_id/order')
  @TreasurerMethod({})
  @ApiOperation({
    summary: 'Привязать существующий файл к неподписанному платежному поручению казначея',
    description:
      'Привязывает существующий файл (по ID) к неподписанному поручению казначея и сохраняет ID в поле treasurerOrder',
  })
  async updateOrder(
    @Param() params: IdFieldDto,
    @Body() dto: TreasurerTaskUpdateOrderFileDto,
  ): Promise<ITreasurerTask> {
    return this.service.updateOrderByTreasurer(params._id, dto.fileId);
  }

  @Delete(':_id/order')
  @TreasurerMethod({})
  @ApiOperation({
    summary: 'Удалить неподписанное платежное поручение казначея',
    description: 'Удаляет неподписанное поручение казначея из S3, базы данных и очищает поле treasurerOrder',
  })
  async deleteOrder(@Param() params: IdFieldDto): Promise<ITreasurerTask> {
    return this.service.deleteOrderByTreasurer(params._id);
  }

  @Patch(':_id/export-revenue-confirmation')
  @TreasurerMethod({})
  @ApiOperation({
    summary: 'Привязать файл подтверждения выплаты по экспортной выручке',
    description:
      'Привязывает существующий файл (по ID) к подтверждению выплаты по экспортной выручке и сохраняет ID в поле exportRevenueConfirmation',
  })
  async updateExportRevenueConfirmation(
    @Param() params: IdFieldDto,
    @Body() dto: TreasurerTaskUpdateExportRevenueConfirmationDto,
  ): Promise<ITreasurerTask> {
    return this.service.updateExportRevenueConfirmation(params._id, dto.fileId);
  }

  @Delete(':_id/export-revenue-confirmation')
  @TreasurerMethod({})
  @ApiOperation({
    summary: 'Удалить подтверждение выплаты по экспортной выручке',
    description:
      'Удаляет подтверждение выплаты по экспортной выручке из S3, базы данных и очищает поле exportRevenueConfirmation',
  })
  async deleteExportRevenueConfirmation(@Param() params: IdFieldDto): Promise<ITreasurerTask> {
    return this.service.deleteExportRevenueConfirmation(params._id);
  }
}
