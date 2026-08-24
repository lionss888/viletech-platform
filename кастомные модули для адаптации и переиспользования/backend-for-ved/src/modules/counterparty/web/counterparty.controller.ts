import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { CounterpartyService } from '../service/counterparty.service';
import { CounterpartyCreateDto } from '../dto/counterparty.create.dto';
import { CounterpartyUpdateDto } from '../dto/counterparty.update.dto';
import { CounterpartyQueryDto } from '../dto/counterparty.query.dto';
import { CounterpartyRequestsPaginateDto } from '../dto/counterparty-requests.query.dto';
import { CounterpartyRequestsXlsxQueryDto } from '../dto/counterparty-requests.xlsx.query.dto';
import { CounterpartyRequestsDto } from '../dto/counterparty-requests.dto';
import { AddAccountDto, UpdateAccountDto } from '../dto/counterparty-account.dto';
import { ICounterparty } from 'lib/interfaces/models/counterparty.interface';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { AuthGuard } from 'lib/guards/auth.guard';
import { AccountRole } from 'lib/enums/models/account.enums';
import { CounterpartyReportsService } from '../service/counterparty-reports.service';
import {
  ICounterpartyComplianceStatistics,
  ICounterpartyWithStatistics,
} from '../service/counterparty.service.interface';

@ApiTags('Counterparty')
@UseGuards(AuthGuard)
@Controller('counterparty')
export class CounterpartyController {
  private readonly logger: Logger = new Logger(CounterpartyController.name);

  constructor(
    private readonly counterpartyService: CounterpartyService,
    private readonly counterpartyReports: CounterpartyReportsService,
  ) {}

  private isComplianceAccount(account?: { role?: AccountRole; roles?: AccountRole[] }): boolean {
    return (
      account?.role === AccountRole.COMPLIANCE_OFFICER ||
      account?.role === AccountRole.INTERNAL_COMPLIANCE_OFFICER ||
      account?.role === AccountRole.ROOT ||
      account?.roles?.includes(AccountRole.COMPLIANCE_OFFICER) ||
      account?.roles?.includes(AccountRole.INTERNAL_COMPLIANCE_OFFICER) ||
      account?.roles?.includes(AccountRole.ROOT)
    );
  }

  private async getAndValidateCounterparty(id: string, accountId: string): Promise<ICounterparty> {
    const counterparty = await this.counterpartyService.findById(id);
    if (!counterparty) {
      this.logger.warn(`Counterparty not found: ${id}, account: ${accountId}`);
      throw new NotFoundException('Counterparty not found');
    }

    // Validate user owns this counterparty
    const counterpartyCreatorId =
      typeof counterparty.createdBy === 'string'
        ? counterparty.createdBy
        : (counterparty.createdBy as { _id?: { toString(): string } })?._id?.toString() ||
          String(counterparty.createdBy);

    if (counterpartyCreatorId !== accountId) {
      this.logger.warn(`Access denied: counterparty belongs to ${counterpartyCreatorId}, accessed by ${accountId}`);
      throw new ForbiddenException('Access denied');
    }

    return counterparty;
  }

  private async getCounterpartyForRead(id: string, account: Request['account']): Promise<ICounterparty> {
    if (this.isComplianceAccount(account)) {
      const counterparty = await this.counterpartyService.findById(id);
      if (!counterparty) {
        this.logger.warn(`Counterparty not found for compliance access: ${id}`);
        throw new NotFoundException('Counterparty not found');
      }
      return counterparty;
    }

    const accountId = account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }

    return this.getAndValidateCounterparty(id, accountId);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get counterparties list' })
  @ApiResponse({ status: 200, description: 'Counterparties list returned' })
  async list(
    @Query() query: CounterpartyQueryDto,
    @Req() req: Request,
  ): Promise<IPaginateResult<ICounterpartyWithStatistics> & { statistics: ICounterpartyComplianceStatistics }> {
    return this.counterpartyService.listForAccount(req.account, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get counterparty by ID' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 200, description: 'Counterparty returned' })
  @ApiResponse({ status: 404, description: 'Counterparty not found' })
  async get(@Param('id') id: string, @Req() req: Request): Promise<ICounterparty> {
    return this.getCounterpartyForRead(id, req.account);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create new counterparty' })
  @ApiResponse({ status: 201, description: 'Counterparty created' })
  async create(@Body() createDto: CounterpartyCreateDto, @Req() req: Request): Promise<ICounterparty> {
    const accountId = req.account._id;
    this.logger.log(`Creating counterparty: ${createDto.name}, owner: ${accountId}`);

    return this.counterpartyService.create({
      ...createDto,
      createdBy: accountId,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update counterparty' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 200, description: 'Counterparty updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: CounterpartyUpdateDto,
    @Req() req: Request,
  ): Promise<ICounterparty> {
    if (!req.account?._id) {
      throw new UnauthorizedException('Account not found in request');
    }
    // Delegate full decision to service to keep controller thin
    return this.counterpartyService.updateByRequester(id, req.account as any, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete counterparty' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 204, description: 'Counterparty deleted' })
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const accountId = req.account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }
    await this.getAndValidateCounterparty(id, accountId);
    this.logger.log(`Deleting counterparty: ${id}, account: ${accountId}`);
    await this.counterpartyService.delete(id);
  }

  @Patch(':id/bank/:bankUuid/account')
  @ApiOperation({ summary: 'Add account to existing bank' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiParam({ name: 'bankUuid', description: 'Bank UUID' })
  @ApiResponse({ status: 200, description: 'Account added successfully' })
  async addAccount(
    @Param('id') id: string,
    @Param('bankUuid') bankUuid: string,
    @Body() accountDto: AddAccountDto,
    @Req() req: Request,
  ): Promise<ICounterparty> {
    const accountId = req.account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }
    await this.getAndValidateCounterparty(id, accountId);
    this.logger.log(`Adding account to bank: counterparty=${id}, bank=${bankUuid}`);
    return this.counterpartyService.addAccountToBank(id, bankUuid, accountDto);
  }

  @Delete(':id/bank/:bankUuid/account/:accountUuid')
  @ApiOperation({ summary: 'Remove account from bank' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiParam({ name: 'bankUuid', description: 'Bank UUID' })
  @ApiParam({ name: 'accountUuid', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'Account removed successfully' })
  async removeAccount(
    @Param('id') id: string,
    @Param('bankUuid') bankUuid: string,
    @Param('accountUuid') accountUuid: string,
    @Req() req: Request,
  ): Promise<ICounterparty> {
    const accountId = req.account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }
    await this.getAndValidateCounterparty(id, accountId);
    this.logger.log(`Removing account from bank: counterparty=${id}, bank=${bankUuid}, account=${accountUuid}`);
    return this.counterpartyService.removeAccountFromBank(id, bankUuid, accountUuid);
  }

  @Patch(':id/bank/:bankUuid/account/:accountUuid')
  @ApiOperation({ summary: 'Update account properties' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiParam({ name: 'bankUuid', description: 'Bank UUID' })
  @ApiParam({ name: 'accountUuid', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  async updateAccount(
    @Param('id') id: string,
    @Param('bankUuid') bankUuid: string,
    @Param('accountUuid') accountUuid: string,
    @Body() updateDto: UpdateAccountDto,
    @Req() req: Request,
  ): Promise<ICounterparty> {
    const accountId = req.account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }
    await this.getAndValidateCounterparty(id, accountId);
    this.logger.log(`Updating account: counterparty=${id}, bank=${bankUuid}, account=${accountUuid}`);
    return this.counterpartyService.updateAccount(id, bankUuid, accountUuid, updateDto);
  }

  // TEST ENDPOINTS - For comprehensive testing of business logic

  @Get(':id/approval-indicator')
  @ApiOperation({ summary: '[TEST] Get approval history indicator (6-month rule)' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 200, description: 'Approval indicator returned' })
  async getApprovalIndicator(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ requiresReview: boolean; monthsSinceApproval: number | null }> {
    await this.getCounterpartyForRead(id, req.account);
    return this.counterpartyService.getApprovalHistoryIndicator(id);
  }

  @Get(':id/can-skip-compliance')
  @ApiOperation({ summary: '[TEST] Check if can skip external compliance' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 200, description: 'Can skip result returned' })
  async canSkipCompliance(@Param('id') id: string, @Req() req: Request): Promise<{ canSkip: boolean }> {
    await this.getCounterpartyForRead(id, req.account);
    const canSkip = await this.counterpartyService.canSkipExternalCompliance(id);
    return { canSkip };
  }

  @Post('find-or-create')
  @ApiOperation({ summary: '[TEST] Find or create counterparty from bank details' })
  @ApiResponse({ status: 200, description: 'Counterparty found or created' })
  async findOrCreate(@Body() bankData: Record<string, unknown>, @Req() req: Request): Promise<ICounterparty> {
    const accountId = req.account._id;
    this.logger.log(`Finding or creating counterparty from bank details, owner: ${accountId}`);

    const result = await this.counterpartyService.findOrCreateFromFormBankDetails(accountId, bankData);

    const counterparty = await this.counterpartyService.findById(result.counterpartyId);
    if (!counterparty) {
      throw new NotFoundException('Counterparty not found after creation');
    }
    return counterparty;
  }

  @Post(':id/form-payment')
  @ApiOperation({ summary: '[TEST] Add FormPayment to counterparty' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 204, description: 'FormPayment added' })
  async addFormPayment(
    @Param('id') id: string,
    @Body() body: { formPaymentId: string },
    @Req() req: Request,
  ): Promise<void> {
    const accountId = req.account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }
    await this.getAndValidateCounterparty(id, accountId);
    await this.counterpartyService.addFormPayment(id, body.formPaymentId);
  }

  @Delete(':id/form-payment/:formPaymentId')
  @ApiOperation({ summary: '[TEST] Remove FormPayment from counterparty' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiParam({ name: 'formPaymentId', description: 'FormPayment ID to remove' })
  @ApiResponse({ status: 204, description: 'FormPayment removed' })
  async removeFormPayment(
    @Param('id') id: string,
    @Param('formPaymentId') formPaymentId: string,
    @Req() req: Request,
  ): Promise<void> {
    const accountId = req.account?._id;
    if (!accountId) {
      throw new UnauthorizedException('Account not found in request');
    }
    await this.getAndValidateCounterparty(id, accountId);
    await this.counterpartyService.removeFormPayment(id, formPaymentId);
  }

  @Get(':id/requests')
  @ApiOperation({ summary: 'Get counterparty requests history' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 200, description: 'Counterparty requests returned', type: CounterpartyRequestsDto })
  async getCounterpartyRequests(
    @Param('id') id: string,
    @Query() query: CounterpartyRequestsPaginateDto,
    @Req() req: Request,
  ): Promise<CounterpartyRequestsDto> {
    await this.getCounterpartyForRead(id, req.account);
    this.logger.debug(`Getting requests for counterparty: ${id}, account: ${req.account?._id}`);
    return this.counterpartyService.getCounterpartyRequests(id, query);
  }

  @Get(':id/requests/xlsx')
  @ApiOperation({ summary: 'Export counterparty requests to Excel' })
  @ApiParam({ name: 'id', description: 'Counterparty ID' })
  @ApiResponse({ status: 200, description: 'Excel file stream' })
  async exportCounterpartyRequestsXlsx(
    @Param('id') id: string,
    @Query() query: CounterpartyRequestsXlsxQueryDto,
    @Req() req: Request,
  ): Promise<StreamableFile> {
    await this.getCounterpartyForRead(id, req.account);
    this.logger.debug(`Exporting requests XLSX for counterparty: ${id}, account: ${req.account?._id}`);
    return this.counterpartyReports.exportRequestsXlsx(id, query);
  }
}
