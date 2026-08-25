import { Request } from 'express';
import { ContractDto, ContractFullDto } from 'lib/dto/models/contract.dto';
import { Body, Controller, Get, Inject, NotFoundException, Optional, Param, Post, Put, Query, Req } from '@nestjs/common';
import { IContractService } from '../../service/contract.service.interface';
import { ApiCookieAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IContract } from 'lib/interfaces/models/contract.interface';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { ContractQuerySiteDto, ContractSitePaginateDto } from '../../dto/contract.query.dto';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ContractCreateDto } from '../../dto/contract.create.dto';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import { FileDto } from '../../../../lib/dto/models/file.dto';
import { OrganizationFieldDto } from '../../../../lib/dto/organization-field.dto';
import { IDiadocService, DiadocDocumentStatus } from '../../../diadoc/service/diadoc.service.interface';
import { DIADOC_SERVICE } from '../../../diadoc/diadoc.constants';
import { DiadocStatusResponseDto } from '../../../diadoc/dto/diadoc-status.dto';
import { ContractSignViaDiadocDto } from '../../dto/contract.create.dto';
import { ApiBadRequestMessagesResponse } from '../../../../lib/decorators/api-bad-request-messages-response.decorator';

@ApiExtraModels(ContractDto)
@ApiCookieAuth()
@ApiTags('contract')
@Controller('contract')
export class ContractSiteController {
  constructor(
    @Inject('IContractService') private readonly service: IContractService,
    @Inject(DIADOC_SERVICE) @Optional() private readonly diadocService?: IDiadocService,
  ) {}

  @Get()
  @UserMethod({ hasNextPaginate: ContractDto })
  async findWithPaginate(
    @Req() req: Request,
    @Query() dto: ContractSitePaginateDto,
  ): Promise<IPaginateHasNextResult<IContract>> {
    const { model, paginate } = queryPaginateParser(dto, ContractQuerySiteDto);
    const result = await this.service.findUser({ account: req.account._id, ...model }, paginate);
    return paginateHasNextPlainToClass(ContractDto, result);
  }

  @Get('full/:organization')
  @UserMethod({ hasNextPaginate: ContractDto })
  async findFullWithPaginate(
    @Req() req: Request,
    @Query() dto: ContractSitePaginateDto,
    @Param() dtoOrganization: OrganizationFieldDto,
  ): Promise<IPaginateHasNextResult<IContract>> {
    const { model, paginate } = queryPaginateParser(dto, ContractQuerySiteDto);
    const result = await this.service.findUser(
      { account: req.account._id, organization: dtoOrganization.organization, ...model },
      { ...paginate, include: ['file', 'agent'] },
    );
    return paginateHasNextPlainToClass(ContractFullDto, result);
  }

  @Get('count')
  @UserMethod({ response: { status: 201, type: CountFieldDto } })
  async count(@Req() req: Request, @Query() dto: ContractQuerySiteDto): Promise<CountFieldDto> {
    const model = await this.service.count({ ...dto, account: req.account._id });
    return plainModelToClass(CountFieldDto, model);
  }

  @Get('one')
  @UserMethod({ response: { status: 201, type: ContractDto } })
  async getOne(@Req() req: Request, @Query() dto: ContractQuerySiteDto): Promise<ContractDto> {
    const model = await this.service.findOneOrException({ ...dto, account: req.account._id }, { sort: '-createDate' });
    return plainModelToClass(ContractDto, model);
  }

  @Get('one/template')
  @UserMethod({ response: { status: 201, type: ContractDto } })
  async getOneTemplate(@Req() req: Request, @Query() dto: ContractQuerySiteDto): Promise<ContractDto> {
    const model = await this.service.findOneOrException({ ...dto, isTemplate: true }, { sort: '-createDate' });
    return plainModelToClass(ContractDto, model);
  }

  @Get(':_id')
  @ApiNotFoundMessagesResponse(['Contract not found.'])
  @UserMethod({ response: { status: 201, type: ContractDto } })
  async getAccount(@Req() req: Request, @Param() dto: IdFieldDto): Promise<IContract> {
    const model = await this.service.findOneOrException({
      ...dto,
      account: req.account._id,
    });
    return plainModelToClass(ContractDto, model);
  }

  @Post('')
  @UserMethod({ response: { status: 201, type: ContractDto } })
  async create(@Req() req: Request, @Body() dto: ContractCreateDto): Promise<IContract> {
    const model = await this.service.createUser({
      ...dto,
      account: req.account,
    });
    return plainModelToClass(ContractDto, model);
  }

  @Put(':_id')
  @UserMethod({ response: { status: 200, type: ContractDto } })
  async update(@Req() req: Request, @Param() dto: IdFieldDto, @Body() updateDto: FileDto): Promise<IContract> {
    const model = await this.service.updateOneUser({ account: req.account._id, ...dto }, updateDto);
    return plainModelToClass(ContractDto, model);
  }

  // VF-2: Подписание договора через Diadoc
  @Post(':_id/sign-via-diadoc')
  @ApiBadRequestMessagesResponse([
    'Diadoc integration is not enabled',
    'Contract file not found',
    'Recipient INN is required',
    'Failed to upload document to Diadoc',
    'Failed to send document for signing to Diadoc',
  ])
  @UserMethod({
    summary: 'Отправить договор на подписание через Diadoc',
    response: { status: 200, type: ContractDto },
  })
  async signContractViaDiadoc(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() body: ContractSignViaDiadocDto,
  ): Promise<IContract> {
    const model = await this.service.signContractViaDiadoc({ account: req.account._id, ...dto }, body.recipientInn);
    return plainModelToClass(ContractDto, model);
  }

  // VF-2: Получение статуса договора в Diadoc
  @Get(':_id/diadoc-status')
  @ApiBadRequestMessagesResponse(['Diadoc service is not available'])
  @UserMethod({
    summary: 'Получить статус договора в Diadoc',
    response: { status: 200, type: DiadocStatusResponseDto },
  })
  async getContractDiadocStatus(@Req() req: Request, @Param() dto: IdFieldDto): Promise<DiadocStatusResponseDto> {
    if (!this.diadocService) {
      throw new NotFoundException('Diadoc service is not available');
    }

    const contract = await this.service.findOneOrException({ account: req.account._id, ...dto });
    const documentId = (contract as any).diadocDocumentId;

    if (!documentId) {
      return { status: DiadocDocumentStatus.DRAFT };
    }

    const status = await this.diadocService.getDocumentStatus(documentId);
    return {
      status,
      documentId,
      messageId: (contract as any).diadocMessageId,
    };
  }
}
