import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { IOrganizationService } from '../../service/organization.service.interface';
import { OrganizationDto, OrganizationFullDto } from 'lib/dto/models/organization.dto';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import { Request } from 'express';
import { OrganizationSitePaginateDto, OrganizationSiteQueryDto } from 'modules/organization/dto/organization.query.dto';
import { OrganizationSiteCreateDto } from 'modules/organization/dto/organization.create.dto';
import {
  DelegateToSubaccount,
  OrganizationSendSubaccountInviteDto,
  OrganizationSiteUpdateDto,
} from 'modules/organization/dto/organization.update.dto';
import { OrganizationSubaccountStatusType } from 'lib/enums/models/organization.enums';
import { ORGANIZATION_SERVICE, ORGANIZATION_SUBACCOUNT_SERVICE } from 'modules/organization/organization.constants';
import { IOrganizationSubaccountService } from 'modules/organization/service/organization-subaccount.service.interface';
import { AccountFieldDto } from 'lib/dto/account-field.dto';
import { ApiBadRequestMessagesResponse } from '../../../../lib/decorators/api-bad-request-messages-response.decorator';
import { IKonturService, KONTUR_SERVICE } from 'lib/services/kontur/kontur.service.interface';
import {
  OrganizationFetchByInnDto,
  OrganizationFetchByInnResponseDto,
} from 'modules/organization/dto/organization-fetch-by-inn.dto';

@ApiCookieAuth()
@ApiTags('organization')
@Controller('organization')
export class OrganizationSiteController {
  constructor(
    @Inject(ORGANIZATION_SERVICE) private readonly service: IOrganizationService,
    @Inject(ORGANIZATION_SUBACCOUNT_SERVICE) private readonly subaccountService: IOrganizationSubaccountService,
    @Inject(KONTUR_SERVICE) private readonly konturService: IKonturService,
  ) {}

  @Get()
  @UserMethod({ hasNextPaginate: OrganizationDto })
  async findWithPaginate(
    @Req() req: Request,
    @Query() dto: OrganizationSitePaginateDto,
  ): Promise<IPaginateHasNextResult<IOrganization>> {
    const { paginate, model } = queryPaginateParser(dto, OrganizationSiteQueryDto);
    const result = await this.service.find(
      { ...model, account: req.account._id, subaccount: req.account._id },
      { ...paginate, include: ['subaccounts.account'] },
    );
    return paginateHasNextPlainToClass(OrganizationDto, result);
  }

  @Get('invited')
  @UserMethod({ hasNextPaginate: OrganizationDto })
  async findInvitedWithPaginate(
    @Req() req: Request,
    @Query() dto: OrganizationSitePaginateDto,
  ): Promise<IPaginateHasNextResult<IOrganization>> {
    const { paginate, model } = queryPaginateParser(dto, OrganizationSiteQueryDto);
    const result = await this.service.find(
      { ...model, invitedSubaccount: req.account._id },
      { ...paginate, include: ['subaccounts.account'] },
    );
    return paginateHasNextPlainToClass(OrganizationDto, result);
  }

  @Get('count')
  @UserMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Req() req: Request, @Query() dto: OrganizationSiteQueryDto): Promise<ICountField> {
    const result = await this.service.count({ ...dto, account: req.account._id, subaccount: req.account._id });
    return plainModelToClass(CountFieldDto, result);
  }

  @Get('fetch-by-inn')
  @UserMethod({
    response: {
      status: HttpStatus.OK,
      type: OrganizationFetchByInnResponseDto,
      description: 'Organization data fetched from Kontur API',
    },
    summary: 'Fetch organization data from Kontur API by INN',
  })
  async fetchByInn(@Query() dto: OrganizationFetchByInnDto): Promise<OrganizationFetchByInnResponseDto> {
    // Fetch organization data from Kontur API by INN
    const result = await this.konturService.fetchOrganizationByInn(dto.inn);

    if (!result) {
      throw new NotFoundException(
        `Organization with INN ${dto.inn} not found in Kontur database or service is unavailable`,
      );
    }

    return result;
  }

  @Get(':_id')
  @UserMethod({ response: { status: 200, type: OrganizationFullDto } })
  async getOrganization(@Param() dto: IdFieldDto): Promise<IOrganization> {
    const model = await this.service.findOneOrException(dto, { include: ['organizationCard'] });
    return plainModelToClass(OrganizationFullDto, model);
  }

  @Post()
  @UserMethod({ response: { status: 200, type: OrganizationDto } })
  async create(@Req() req: Request, @Body() dto: OrganizationSiteCreateDto): Promise<IOrganization> {
    const organization = await this.service.createByUser({ ...dto, account: req.account._id });
    return plainModelToClass(OrganizationDto, organization);
  }

  @Patch(':_id/invite-subaccount')
  @UserMethod({ response: { status: 200, type: OrganizationDto } })
  async inviteSubaccountByUser(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() updateDto: OrganizationSendSubaccountInviteDto,
  ): Promise<IOrganization> {
    return this.subaccountService.inviteSubaccountByUser({ ...dto, account: req.account }, updateDto);
  }

  @Put(':_id/delegate/:delegateToSubaccount')
  @UserMethod({ response: { status: 200, type: OrganizationDto } })
  async delegateToSubaccount(@Req() req: Request, @Param() dto: DelegateToSubaccount): Promise<IOrganization> {
    return this.subaccountService.delegateToSubaccount(
      { _id: dto._id, account: req.account },
      { delegateToSubaccount: dto.delegateToSubaccount },
    );
  }

  @Patch(':_id/delete-subaccount')
  @UserMethod({ response: { status: 200, type: OrganizationDto } })
  async deleteSubaccountByUser(
    @Req() req: Request,
    @Param() dto: IdFieldDto,
    @Body() { account }: AccountFieldDto,
  ): Promise<IOrganization> {
    return this.subaccountService.deleteSubaccountByUser(
      { ...dto, account: req.account._id, subaccount: account },
      { account },
    );
  }

  @Patch(':_id/accept-invite')
  @UserMethod({ response: { status: HttpStatus.NO_CONTENT } })
  async acceptSubaccountInvite(@Req() req: Request, @Param() dto: IdFieldDto): Promise<void> {
    return this.subaccountService.replyInviteByUser(
      { ...dto, account: req.account },
      { status: OrganizationSubaccountStatusType.ACTIVE },
    );
  }

  @Patch(':_id/reject-invite')
  @UserMethod({ response: { status: HttpStatus.NO_CONTENT } })
  async rejectSubaccountInvite(@Req() req: Request, @Param() dto: IdFieldDto): Promise<void> {
    return this.subaccountService.replyInviteByUser(
      { ...dto, account: req.account },
      { status: OrganizationSubaccountStatusType.REJECTED },
    );
  }

  @Patch(':_id')
  @UserMethod({
    response: {
      status: HttpStatus.OK,
      type: OrganizationSiteUpdateDto,
      description: 'Organization data updated successfully',
    },
    summary: 'Update organization data',
  })
  @ApiBadRequestMessagesResponse(['It is not possible to change the organization if it is approved'])
  async patchById(
    @Param('_id') id: string,
    @Body() updateDto: OrganizationSiteUpdateDto,
    @Req() req: Request,
  ): Promise<IOrganization> {
    const organization = await this.service.updateByUser({ _id: id, account: req.account._id }, { ...updateDto });
    return plainModelToClass(OrganizationDto, organization);
  }

  @Delete(':_id')
  @UserMethod({ response: { status: HttpStatus.NO_CONTENT } })
  async removeOne(@Req() req: Request, @Param('_id') id: string): Promise<void> {
    const organization = await this.service.findOneOrException({ _id: id });

    if (organization.account.toString() !== req.account._id) {
      throw new ForbiddenException('You are not allowed to delete this organization');
    }

    return this.service.deleteByUser({ _id: id, account: req.account._id });
  }
}
