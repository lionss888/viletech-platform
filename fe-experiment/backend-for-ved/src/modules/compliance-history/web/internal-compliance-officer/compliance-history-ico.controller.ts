import { Controller, Get, Inject, NotFoundException, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { InternalComplianceOfficerMethod } from 'lib/decorators/internal-compliance-officer-method.decorator';
import { ComplianceHistoryService } from '../../service/compliance-history.service';
import { GenerateReportsService } from '../../service/additional/generate-reports.service';
import { ClientOrganizationPaginateDto } from '../../dto/client-organization.query.dto';
import { ClientOrganizationListDto } from '../../dto/client-organization-list.dto';
import { ClientOrganizationDto } from '../../dto/client-organization.dto';
import { ClientOrganizationRequestsPaginateDto } from '../../dto/client-organization-requests.query.dto';
import { ClientOrganizationRequestsDto } from '../../dto/client-organization-requests.dto';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { AccountRole } from 'lib/enums/models/account.enums';
import { IFileService } from '../../../file/service/file.service.interface';
import { FILE_SERVICE } from '../../../file/file.constants';

@ApiCookieAuth()
@ApiTags('Internal Compliance Officer - Clients')
@Controller('admin/internal-compliance-officer/clients')
export class ComplianceHistoryICOController {
  constructor(
    private readonly complianceHistoryService: ComplianceHistoryService,
    private readonly generateReportsService: GenerateReportsService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
  ) {}

  @Get()
  @InternalComplianceOfficerMethod({
    summary: 'Получить список клиентов с агрегированной статистикой',
    response: { status: 200, type: ClientOrganizationListDto },
  })
  async getClientsList(@Query() dto: ClientOrganizationPaginateDto): Promise<ClientOrganizationListDto> {
    return this.complianceHistoryService.getClientsList(AccountRole.INTERNAL_COMPLIANCE_OFFICER, dto);
  }

  @Get('xlsx')
  @InternalComplianceOfficerMethod({
    summary: 'Экспорт списка клиентов в Excel',
    response: {
      status: 200,
      description: 'Return Excel file',
    },
  })
  async exportClientsToExcel(@Query() dto: ClientOrganizationPaginateDto): Promise<StreamableFile> {
    return this.generateReportsService.generateInternalComplianceReport(dto);
  }

  @Get(':_id')
  @InternalComplianceOfficerMethod({
    summary: 'Получить детальную информацию о клиенте',
    response: { status: 200, type: ClientOrganizationDto },
  })
  async getClientDetails(@Param() params: IdFieldDto): Promise<ClientOrganizationDto> {
    return this.complianceHistoryService.getClientDetails(params._id);
  }

  @Get(':_id/requests')
  @InternalComplianceOfficerMethod({
    summary: 'Получить историю заявок клиента',
    response: { status: 200, type: ClientOrganizationRequestsDto },
  })
  async getClientRequests(
    @Param() params: IdFieldDto,
    @Query() dto: ClientOrganizationRequestsPaginateDto,
  ): Promise<ClientOrganizationRequestsDto> {
    return this.complianceHistoryService.getClientRequests(params._id, AccountRole.INTERNAL_COMPLIANCE_OFFICER, dto);
  }

  @Get(':_id/requests/xlsx')
  @InternalComplianceOfficerMethod({
    summary: 'Экспорт истории заявок клиента в Excel',
    response: {
      status: 200,
      description: 'Return Excel file',
    },
  })
  async exportClientRequestsToExcel(
    @Param() params: IdFieldDto,
    @Query() dto: ClientOrganizationRequestsPaginateDto,
  ): Promise<StreamableFile> {
    return this.generateReportsService.generateClientRequestsReport(
      params._id,
      AccountRole.INTERNAL_COMPLIANCE_OFFICER,
      dto,
    );
  }

  @Get(':_id/organization-card')
  @InternalComplianceOfficerMethod({
    summary: 'Скачать файл карточки организации клиента',
    response: {
      status: 200,
      description: 'Return file stream',
    },
  })
  async downloadOrganizationCard(@Param() params: IdFieldDto, @Res() res: Response) {
    const client = await this.complianceHistoryService.getClientDetails(params._id);

    if (!client.organizationCard) {
      throw new NotFoundException('Organization card file not found');
    }

    const { stream, file } = await this.fileService.previewByCompliance(client.organizationCard);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.originalName || 'organization-card'}"`,
    });

    stream.pipe(res);
  }
}
