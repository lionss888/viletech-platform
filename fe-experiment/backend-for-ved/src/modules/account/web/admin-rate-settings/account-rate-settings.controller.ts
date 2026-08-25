import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IAccountService } from '../../service/account.service.interface';
import { UpdateRateSettingsDto, RateSettingsResponseDto, PaginatedRateHistoryDto } from '../../dto';
import { RootMethod } from 'lib/decorators/root-method.decorator';
import { ManagerMethod } from 'lib/decorators/manager-method.decorator';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { ReqContext } from 'lib/decorators/req-context.decorator';
import { FeatureContext } from 'lib/classes/feature-context.class';

/**
 * Controller for managing account-level rate settings
 * Accessible only to ROOT and ADMIN roles through rate settings endpoints
 */
@ApiTags('admin rate settings')
@Controller('admin/account')
export class AccountRateSettingsController {
  constructor(@Inject('IAccountService') private readonly service: IAccountService) {}

  /**
   * Update rate settings for an account
   * Only ROOT and ADMIN can modify rate settings
   */
  @Put(':_id/rate-settings')
  @RootMethod({
    response: { status: 200, type: RateSettingsResponseDto },
  })
  async updateRateSettings(
    @Param() dto: IdFieldDto,
    @Body() updateDto: UpdateRateSettingsDto,
    @ReqContext() context: FeatureContext,
  ): Promise<RateSettingsResponseDto> {
    return this.service.updateRateSettings(dto._id, updateDto, context.accountId);
  }

  /**
   * Replace all rate settings for an account with the provided list.
   * Only ROOT and ADMIN can use this bulk endpoint.
   */
  @Put(':_id/rate-settings/bulk')
  @RootMethod({
    response: { status: 200, type: [RateSettingsResponseDto] },
  })
  async updateRateSettingsBulk(
    @Param() dto: IdFieldDto,
    @Body() updateDtos: UpdateRateSettingsDto[],
    @ReqContext() context: FeatureContext,
  ): Promise<RateSettingsResponseDto[]> {
    return this.service.updateRateSettingsBulk(dto._id, updateDtos, context.accountId);
  }

  /**
   * Get current rate settings for an account
   * Accessible to ROOT, ADMIN, and MANAGER
   */
  @Get(':_id/rate-settings')
  @ManagerMethod({
    response: { status: 200, type: [RateSettingsResponseDto] },
  })
  async getRateSettings(@Param() dto: IdFieldDto): Promise<RateSettingsResponseDto[]> {
    return this.service.getRateSettings(dto._id);
  }

  /**
   * Get rate settings change history for an account
   * Only ROOT and ADMIN can view history
   */
  @Get(':_id/rate-history')
  @RootMethod({
    response: { status: 200, type: PaginatedRateHistoryDto },
  })
  async getRateHistory(
    @Param() dto: IdFieldDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedRateHistoryDto> {
    // Enforce max limit of 100
    const effectiveLimit = Math.min(limit, 100);
    return this.service.getRateHistory(dto._id, page, effectiveLimit);
  }

  /**
   * Get rate settings change history for an account (manager/root)
   * This endpoint is separate to avoid embedding history into other responses.
   */
  @Get(':_id/rate-history/manager')
  @ManagerMethod({
    response: { status: 200, type: PaginatedRateHistoryDto },
  })
  async getRateHistoryForManager(
    @Param() dto: IdFieldDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedRateHistoryDto> {
    const effectiveLimit = Math.min(limit, 100);
    return this.service.getRateHistory(dto._id, page, effectiveLimit);
  }

  /**
   * Delete rate settings for an account
   * Removes custom settings and reverts to default behavior
   * Only ROOT and ADMIN can delete rate settings
   */
  @Delete(':_id/rate-settings')
  @RootMethod({
    response: { status: 200 },
  })
  async deleteRateSettings(
    @Param() dto: IdFieldDto,
    @ReqContext() context: FeatureContext,
  ): Promise<{ message: string }> {
    await this.service.deleteRateSettings(dto._id, context.accountId);
    return { message: 'Rate settings removed successfully' };
  }
}
