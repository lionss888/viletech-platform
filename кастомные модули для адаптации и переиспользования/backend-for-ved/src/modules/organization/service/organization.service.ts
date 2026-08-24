import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, UpdateQuery } from 'mongoose';
import {
  IOrganizationAdminQuery,
  IOrganizationCreate,
  IOrganizationService,
  IOrganizationSiteCreate,
  IOrganizationSiteDelete,
  IOrganizationInternalComplianceOfficerUpdate,
  IOrganizationSiteQuery,
  IOrganizationSiteUpdate,
  IOrganizationUpdate,
  IOrganizationQuery,
  IOrganizationProviderCreate,
} from './organization.service.interface';
import { BaseService } from 'lib/services/base/base.service';
import { Organization } from './organization.schema';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { AccountPattern } from 'lib/enums/models/account.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { IBaseOptions } from '../../../lib/services/base/base.service.interface';
import { FormPaymentPattern } from '../../../lib/enums/models/form-payment.enums';
import {
  OrganizationStatus,
  OrganizationSubaccountStatusType,
  OrganizationType,
} from '../../../lib/enums/models/organization.enums';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { ContractPattern, ContractStatus } from '../../../lib/enums/models/contract.enums';
import {
  IKonturService,
  KONTUR_SERVICE,
  IKonturOrganizationData,
} from '../../../lib/services/kontur/kontur.service.interface';
import { IHsCodeService } from '../../hs-code/service/hs-code.service.interface';
import { FeatureContext } from 'lib/classes/feature-context.class';
import { OrganizationStatusesHistoryService } from './history/organization-statuses-history.service';

@Injectable()
export class OrganizationService
  extends BaseService<
    IOrganization,
    Organization,
    IOrganizationAdminQuery,
    IBaseOptions,
    IOrganizationCreate,
    IOrganizationUpdate
  >
  implements IOrganizationService
{
  private readonly logger: Logger = new Logger(OrganizationService.name);

  constructor(
    @InjectModel(Organization.name) readonly model: PaginateModel<Organization>,
    @InjectNats() readonly client: NatsClientProxy,
    @Inject(KONTUR_SERVICE) private readonly konturService: IKonturService,
    @Inject(forwardRef(() => 'IHsCodeService')) private readonly hsCodeService: IHsCodeService,
    private readonly organizationStatusesHistoryService: OrganizationStatusesHistoryService,
  ) {
    super();
  }

  async createByUser(createData: IOrganizationSiteCreate): Promise<IOrganization> {
    const existedOrganization = await super.findOne({
      exactInn: createData.inn,
    });

    if (existedOrganization && !existedOrganization.isDeleted) {
      throw new BadRequestException('Organization with such INN already exists');
    }

    if (existedOrganization?.status === OrganizationStatus.BLOCKED) {
      throw new BadRequestException('The organization is blocked for this INN');
    }

    const enrichedData = await this.enrichOrganizationFromKontur(createData);

    let createdOrganization: IOrganization;

    if (existedOrganization) {
      createdOrganization = await super.updateOneOrException(
        { _id: existedOrganization._id },
        {
          ...enrichedData,
          isDeleted: false,
        },
      );
    } else {
      createdOrganization = await super.create(enrichedData);
    }

    const { account } = createData;

    await this.client.send<void>(AccountPattern.UPDATE_ONE, {
      query: {
        _id: account,
      },
      update: {
        addOrganizations: [createdOrganization._id],
      },
    });

    return createdOrganization;
  }

  async createProviderOrganization(createData: IOrganizationProviderCreate): Promise<IOrganization> {
    const existingOrganization = await super.findOne({
      exactInn: createData.inn,
      type: OrganizationType.PROVIDER,
      isActive: true,
    });

    if (existingOrganization) {
      this.logger.warn(
        `Duplicate provider organization creation attempt: INN ${createData.inn}, existing org ID: ${existingOrganization._id}`,
      );
      throw new BadRequestException(`Provider organization with INN ${createData.inn} already exists`);
    }

    const organization = await super.create({ ...createData, type: OrganizationType.PROVIDER });
    this.logger.log(`Provider organization created: INN ${createData.inn}, ID: ${organization._id}`);
    return organization;
  }

  async deleteByUser(data: IOrganizationSiteDelete): Promise<void> {
    await super.updateOne({ _id: data._id }, { isDeleted: true });

    await this.client.send<void>(AccountPattern.UPDATE_ONE, {
      query: {
        _id: data.account,
      },
      update: {
        removeOrganizations: [data._id],
      },
    });
  }

  async updateByUser(findData: IOrganizationSiteQuery, updateData: IOrganizationSiteUpdate): Promise<IOrganization> {
    const organization = await super.findOneOrException(findData);

    const contract = await this.client.send<IContract>(ContractPattern.FIND_ONE, {
      query: {
        organization: findData._id,
      },
      options: {
        sort: '-createDate',
      },
    });

    if (organization.status === OrganizationStatus.APPROVED) {
      throw new BadRequestException('It is not possible to change the organization if it is approved');
    }

    if (contract?.status === ContractStatus.ACCEPTED) {
      throw new BadRequestException('It is not possible to change the organization if there is an accepted contract');
    }

    await this.handleNameFieldsUpdate(organization, updateData);

    const updatedOrganization = await super.updateOneOrException(findData, { ...updateData });

    await this.syncFormPaymentsWithOrganization(updatedOrganization);

    return updatedOrganization;
  }

  async updateByAdmin(findData: IOrganizationAdminQuery, updateData: IOrganizationUpdate): Promise<IOrganization> {
    const organization = await super.findOneOrException(findData);

    let enrichedUpdateData = { ...updateData };

    if (updateData.inn && updateData.inn !== organization.inn) {
      this.logger.log(`Admin updating INN for organization ${findData._id}: ${organization.inn} -> ${updateData.inn}`);
      enrichedUpdateData = await this.enrichAdminUpdateFromKontur(updateData, organization.inn);
    }

    const updatedOrganization = await super.updateOneOrException(findData, enrichedUpdateData);

    await this.syncFormPaymentsWithOrganization(updatedOrganization);

    this.logger.log(`Successfully updated organization ${updatedOrganization._id} and synced with FormPayments`);

    return updatedOrganization;
  }

  async find(
    findData: IOrganizationQuery,
    options?: IPaginateOptions & IBaseOptions,
  ): Promise<IPaginateResult<IOrganization>> {
    let organizations = await super.find(findData, options);

    return organizations;
  }

  async updateByInternalCompliance(
    ctx: FeatureContext,
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationInternalComplianceOfficerUpdate,
  ): Promise<IOrganization> {
    const before = await this.model.findOne(findData as FilterQuery<Organization>).lean();

    const updatedOrganization = await super.updateOneOrException(findData, updateData);

    await this.syncFormPaymentsStatus(updatedOrganization._id, updateData.status);

    if (updateData.status && before?.status !== updateData.status) {
      await this.organizationStatusesHistoryService.create({
        organizationId: updatedOrganization._id,
        status: updateData.status,
        accountId: ctx.accountId,
        accountRoles: [...ctx.accountRoles],
      });
    }

    await this.client.send(FormPaymentPattern.UPDATE_MANY, {
      query: {
        organization: updatedOrganization._id,
      },
      update: {
        organizationStatus: updateData.status,
      },
    });

    return updatedOrganization;
  }

  private async handleNameFieldsUpdate(
    organization: IOrganization,
    updateData: IOrganizationSiteUpdate,
  ): Promise<void> {
    const innChanged = updateData.inn && updateData.inn !== organization.inn;
    const hasNameFields = !!(updateData.name || updateData.fullName || updateData.businessForm);

    if (innChanged) {
      const allFieldsProvided = updateData.name && updateData.fullName && updateData.businessForm;

      if (!allFieldsProvided) {
        throw new BadRequestException('When changing INN, you must provide name, fullName, and businessForm fields');
      }

      const enrichedData = await this.enrichOrganizationFromKontur({
        ...organization,
        ...updateData,
      } as IOrganizationSiteCreate);

      updateData.name = enrichedData.name;
      updateData.fullName = enrichedData.fullName;
      updateData.businessForm = enrichedData.businessForm;
    } else if (hasNameFields) {
      throw new BadRequestException('Cannot update name, fullName, or businessForm without changing INN');
    }
  }

  private async enrichOrganizationFromKontur(
    organizationData: IOrganizationSiteCreate,
  ): Promise<IOrganizationSiteCreate> {
    if (!organizationData.inn || typeof organizationData.inn !== 'string') {
      this.logger.debug('Skipping Kontur enrichment: no INN provided');
      return organizationData;
    }

    try {
      const konturData = await this.fetchKonturData(organizationData.inn);

      if (!konturData) {
        return this.handleKonturUnavailable(organizationData);
      }

      this.validateOrganizationActive(konturData, organizationData.inn);

      const enrichedData = this.mergeKonturData(organizationData, konturData);
      this.logger.log(`Successfully enriched organization data from Kontur for INN: ${organizationData.inn}`);

      return enrichedData;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        this.logger.warn(`Rejecting organization creation for INN ${organizationData.inn}: ${error.message}`);
        throw error;
      }

      this.logger.error(
        `Unexpected error while enriching from Kontur for INN: ${organizationData.inn}. ` +
          `Attempting graceful degradation with manual fields.`,
        error instanceof Error ? error.stack : String(error),
      );
      return this.handleKonturUnavailable(organizationData);
    }
  }

  private async fetchKonturData(inn: string) {
    return this.konturService.fetchOrganizationByInn(inn);
  }

  private async enrichAdminUpdateFromKontur(
    updateData: IOrganizationUpdate,
    oldInn: string,
  ): Promise<IOrganizationUpdate> {
    if (!updateData.inn || typeof updateData.inn !== 'string') {
      this.logger.debug('Skipping Kontur enrichment for admin update: no valid INN in update data');
      return updateData;
    }

    try {
      const konturData = await this.fetchAndValidateKonturData(updateData.inn, oldInn);

      if (!konturData) {
        this.logger.warn(
          `Kontur API unavailable for admin INN update: ${oldInn} -> ${updateData.inn}. ` +
            `Proceeding with manual update data only.`,
        );
        return updateData;
      }

      this.validateOrganizationActive(konturData, updateData.inn);

      const enrichedUpdate: IOrganizationUpdate = {
        ...updateData,
        fullName: konturData.fullName,
        name: konturData.name,
        businessForm: konturData.businessForm,
        ogrn: updateData.ogrn ?? konturData.ogrn,
        kpp: updateData.kpp ?? konturData.kpp,
        legalAddress: updateData.legalAddress ?? konturData.legalAddress,
      };

      this.logger.log(
        `Successfully enriched admin update from Kontur for INN: ${updateData.inn}. ` +
          `Auto-filled: name, fullName, businessForm`,
      );

      return enrichedUpdate;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        this.logger.warn(`Rejecting admin INN update to ${updateData.inn}: ${error.message}`);
        throw error;
      }

      this.logger.error(
        `Unexpected error while enriching admin update from Kontur for INN: ${updateData.inn}. ` +
          `Proceeding with manual update data only.`,
        error instanceof Error ? error.stack : String(error),
      );
      return updateData;
    }
  }

  private async fetchAndValidateKonturData(newInn: string, oldInn: string) {
    const konturData = await this.konturService.fetchOrganizationByInn(newInn);

    if (!konturData) {
      this.logger.warn(
        `Kontur API unavailable for admin INN update: ${oldInn} -> ${newInn}. ` +
          `Proceeding with manual update data only.`,
      );
      return null;
    }

    this.validateOrganizationActive(konturData, newInn);
    return konturData;
  }

  private createEnrichedUpdate(
    updateData: IOrganizationUpdate,
    konturData: IKonturOrganizationData,
  ): IOrganizationUpdate {
    const enrichedUpdate: IOrganizationUpdate = {
      ...updateData,
      fullName: konturData.fullName,
      name: konturData.name,
      businessForm: konturData.businessForm,
      ogrn: updateData.ogrn ?? konturData.ogrn,
      kpp: updateData.kpp ?? konturData.kpp,
      legalAddress: updateData.legalAddress ?? konturData.legalAddress,
    };

    this.logger.log(
      `Successfully enriched admin update from Kontur for INN: ${updateData.inn}. ` +
        `Auto-filled: name, fullName, businessForm`,
    );

    return enrichedUpdate;
  }

  private handleKonturUnavailable(data: IOrganizationSiteCreate): IOrganizationSiteCreate {
    const hasRequiredManualFields = data.name && data.businessForm && data.fullName;

    if (!hasRequiredManualFields) {
      this.logger.error(
        `Cannot create/update organization for INN: ${data.inn}. ` +
          `Kontur API is unavailable and required manual fields (name, fullName, businessForm) are not provided by user.`,
      );
      throw new BadRequestException(
        `Service unavailable. Please provide organization name, full name, and business form manually, or try again later.`,
      );
    }

    this.logger.warn(
      `Kontur API unavailable for INN: ${data.inn}. ` +
        `Using manual fallback: name="${data.name}", fullName="${data.fullName}", businessForm="${data.businessForm}"`,
    );

    return data;
  }

  private validateOrganizationActive(konturData: IKonturOrganizationData, inn: string): void {
    if (konturData.isActive === false) {
      throw new BadRequestException(
        `Organization with INN ${inn} is not active. Status: ${konturData.statusString || 'Inactive'}`,
      );
    }
  }

  private mergeKonturData(data: IOrganizationSiteCreate, konturData: IKonturOrganizationData): IOrganizationSiteCreate {
    return {
      ...data,
      fullName: konturData.fullName,
      name: konturData.name,
      businessForm: konturData.businessForm,
      ogrn: data.ogrn ?? konturData.ogrn,
      kpp: data.kpp ?? konturData.kpp,
      legalAddress: data.legalAddress ?? konturData.legalAddress,
      signerName: data.signerName ?? konturData.ceoName,
      signerPosition: data.signerPosition ?? konturData.ceoPosition,
    };
  }

  private async syncFormPaymentsWithOrganization(organization: IOrganization): Promise<void> {
    const updateData = this.buildOrganizationUpdateData(organization);

    try {
      await this.client.send(FormPaymentPattern.UPDATE_MANY, {
        query: {
          organization: organization._id,
        },
        update: updateData,
      });

      this.logger.debug(`Synced FormPayments with organization ${organization._id}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync FormPayments with organization ${organization._id} (INN: ${organization.inn})`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error(
        `Organization updated successfully, but FormPayments sync failed for org ${organization._id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private buildOrganizationUpdateData(organization: IOrganization): Record<string, unknown> {
    const update: Record<string, unknown> = {};

    const fields = [
      'phone',
      'email',
      'signerName',
      'signerPosition',
      'name',
      'inn',
      'businessForm',
      'ogrn',
      'kpp',
      'legalAddress',
      'fullName',
    ] as const;

    for (const field of fields) {
      const value = organization[field];
      if (value !== undefined && value !== null) {
        update[`organization${field.charAt(0).toUpperCase()}${field.slice(1)}`] = value;
      }
    }

    return update;
  }

  private async syncFormPaymentsStatus(organizationId: string, status: OrganizationStatus): Promise<void> {
    try {
      await this.client.send(FormPaymentPattern.UPDATE_MANY, {
        query: {
          organization: organizationId,
        },
        update: {
          organizationStatus: status,
        },
      });

      this.logger.debug(`Synced FormPayments status for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync FormPayments status for organization ${organizationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error(
        `Organization status updated, but FormPayments sync failed for org ${organizationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  protected makeUpdate({
    addRequisites,
    removeRequisites,
    addHsCodes,
    removeHsCodes,
    addHsCodePrefixes,
    removeHsCodePrefixes,
    ...data
  }: IOrganizationUpdate) {
    // Validate: cannot add and remove from same field in one operation
    if (addHsCodes?.length && removeHsCodes?.length) {
      throw new BadRequestException(
        'Cannot add and remove HS codes in the same request. Please use separate requests.',
      );
    }

    if (addHsCodePrefixes?.length && removeHsCodePrefixes?.length) {
      throw new BadRequestException(
        'Cannot add and remove HS code prefixes in the same request. Please use separate requests.',
      );
    }

    const updateData: UpdateQuery<Organization> = {
      $set: { ...data },
      $addToSet: {},
      $unset: {},
      $pull: {},
    };

    if (addRequisites?.length) {
      updateData.$addToSet['requisites'] = { $each: addRequisites };
    }

    if (removeRequisites?.length) {
      updateData.$pull['requisites'] = { uuid: { $in: removeRequisites } };
    }

    if (addHsCodes?.length) {
      updateData.$addToSet['hsCodes'] = { $each: addHsCodes };
    }

    if (removeHsCodes?.length) {
      updateData.$pull['hsCodes'] = { $in: removeHsCodes };
    }

    if (addHsCodePrefixes?.length) {
      updateData.$addToSet['hsCodePrefixes'] = { $each: addHsCodePrefixes };
    }

    if (removeHsCodePrefixes?.length) {
      updateData.$pull['hsCodePrefixes'] = { $in: removeHsCodePrefixes };
    }

    return updateData;
  }

  async removeHsCode(code: string, prefix?: string): Promise<void> {
    if (!code || typeof code !== 'string') {
      this.logger.error(`Invalid HS code provided for removal: ${code}`);
      throw new BadRequestException('Invalid HS code: code must be a non-empty string');
    }

    this.logger.debug(`Removing HS code ${code} from organizations, prefix: ${prefix}`);

    try {
      const fullCodeResult = await this.model.updateMany({ hsCodes: code }, { $pull: { hsCodes: code } });

      this.logger.log(`Removed code ${code} from ${fullCodeResult.modifiedCount} organizations`);

      if (prefix && typeof prefix === 'string') {
        await this.removePrefixIfLastCode(prefix, code);
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove HS code ${code} from organizations`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async removePrefixIfLastCode(prefix: string, deletedCode: string): Promise<void> {
    try {
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const otherCodesWithPrefix = await this.hsCodeService.countByRegex(`^${escapedPrefix}`, true);

      if (otherCodesWithPrefix === 0) {
        const prefixResult = await this.model.updateMany(
          { hsCodePrefixes: prefix },
          { $pull: { hsCodePrefixes: prefix } },
        );

        this.logger.log(
          `Removed prefix ${prefix} from ${prefixResult.modifiedCount} organizations (last code with this prefix)`,
        );
      } else {
        this.logger.debug(
          `Prefix ${prefix} not removed: ${otherCodesWithPrefix} other active codes with this prefix exist`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove prefix ${prefix} for code ${deletedCode}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error(
        `HS code ${deletedCode} removed from organizations, but prefix cleanup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  protected async makeQuery({
    _ids,
    name,
    inn,
    signerName,
    subaccount,
    invitedSubaccount,
    isDeleted,
    isActive,
    exactInn,
    ...findData
  }: IOrganizationAdminQuery): Promise<FilterQuery<Organization>> {
    const query: FilterQuery<Organization> = { ...findData };

    this.applyIdFilters(query, _ids);
    this.applySearchFilters(query, { name, inn, signerName, exactInn });
    this.applySubaccountFilters(query, { subaccount, invitedSubaccount });
    this.applyStatusFilters(query, { isDeleted, isActive });

    return query;
  }

  private applyIdFilters(query: FilterQuery<Organization>, ids?: string[]): void {
    if (ids) {
      query._id = { $in: ids };
    }
  }

  private applySearchFilters(
    query: FilterQuery<Organization>,
    filters: { name?: string; inn?: string; signerName?: string; exactInn?: string },
  ): void {
    if (filters.name) {
      query.name = new RegExp(filters.name, 'gi');
    }

    if (filters.inn) {
      query.inn = new RegExp(filters.inn, 'gi');
    }

    if (filters.signerName) {
      query.signerName = new RegExp(filters.signerName, 'g');
    }

    if (filters.exactInn) {
      query.inn = filters.exactInn;
    }
  }

  private applySubaccountFilters(
    query: FilterQuery<Organization>,
    filters: { subaccount?: string; invitedSubaccount?: string },
  ): void {
    if (filters.subaccount) {
      if (query.account) {
        query.$or = [
          ...(query.$or || []),
          { account: query.account },
          {
            subaccounts: {
              $elemMatch: {
                account: filters.subaccount,
                status: OrganizationSubaccountStatusType.ACTIVE,
              },
            },
          },
        ];

        delete query.account;
      } else {
        query['subaccounts'] = {
          $elemMatch: {
            account: filters.subaccount,
            status: OrganizationSubaccountStatusType.ACTIVE,
          },
        };
      }
    }

    if (filters.invitedSubaccount) {
      query['subaccounts'] = {
        $elemMatch: {
          account: filters.invitedSubaccount,
          status: OrganizationSubaccountStatusType.INVITED,
        },
      };

      delete query.account;
    }
  }

  private applyStatusFilters(
    query: FilterQuery<Organization>,
    filters: { isDeleted?: boolean; isActive?: boolean },
  ): void {
    query.isDeleted = filters.isDeleted ? true : { $ne: true };

    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }
  }

  async getAccessibleOrganizationIds(accountId: string): Promise<string[]> {
    // Объединяем запросы в один: сервис автоматически создаст $or условие
    // для поиска организаций, где пользователь либо владелец, либо сабаккаунт
    const organizations = await this.findMany({
      account: accountId,
      subaccount: accountId,
      isActive: true,
    });

    return organizations.map((org) => org._id.toString());
  }

  async hasOrganizationAccess(organizationId: string, accountId: string): Promise<boolean> {
    // Находим организацию с заполненными subaccounts и account
    // Проверяем isActive для безопасности
    const org = await this.findOne(
      { _id: organizationId, isActive: true },
      { include: ['subaccounts.account', 'account'] },
    );

    if (!org) {
      return false;
    }

    // Проверяем, является ли пользователь сабаккаунтом этой организации
    const isSubaccount = org.subaccounts?.some(
      (subaccount) =>
        (typeof subaccount.account === 'string' ? subaccount.account : subaccount.account._id.toString()) ===
          accountId.toString() && subaccount.status === OrganizationSubaccountStatusType.ACTIVE,
    );

    // Проверяем, является ли пользователь владельцем этой организации
    const isOwner =
      org.account &&
      (typeof org.account === 'string' ? org.account : org.account._id.toString()) === accountId.toString();

    return isSubaccount || isOwner;
  }
}
