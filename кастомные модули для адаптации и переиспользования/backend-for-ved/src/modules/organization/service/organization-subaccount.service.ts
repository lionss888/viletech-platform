import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, UpdateQuery } from 'mongoose';
import {
  IOrganizationAdminQuery,
  IOrganizationCreate,
  IOrganizationSiteQuery,
  IOrganizationUpdate,
} from './organization.service.interface';
import { BaseService } from 'lib/services/base/base.service';
import { Organization } from './organization.schema';
import { IOrganization, IOrganizationSubaccount } from 'lib/interfaces/models/organization.interface';
import { AccountPattern } from 'lib/enums/models/account.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { OrganizationSubaccountStatusType } from 'lib/enums/models/organization.enums';
import * as _ from 'lodash';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { SenderOrganizationEvents, SenderPattern } from 'lib/enums/models/sender.enums';
import { ConfigService } from '@nestjs/config';
import {
  IOrganizationDeleteSubaccount,
  IOrganizationSendSubaccountInvite,
  IOrganizationSubaccountService,
} from './organization-subaccount.service.interface';
import { FormPaymentPattern } from 'lib/enums/models/form-payment.enums';
import { ContractPattern } from '../../../lib/enums/models/contract.enums';

@Injectable()
export class OrganizationSubaccountService
  extends BaseService<
    IOrganization,
    Organization,
    IOrganizationAdminQuery,
    IBaseOptions,
    IOrganizationCreate,
    IOrganizationUpdate
  >
  implements IOrganizationSubaccountService
{
  constructor(
    @InjectModel(Organization.name) readonly model: PaginateModel<Organization>,
    @InjectNats() readonly client: NatsClientProxy,
    protected configService: ConfigService,
  ) {
    super();
  }

  async delegateToSubaccount(
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationUpdate,
  ): Promise<IOrganization> {
    const organization = await super.findOneOrException(findData, { include: ['account'] });

    const subaccount = _.find(
      organization.subaccounts,
      (item) => (item.account as IAccount)._id.toString() === updateData.delegateToSubaccount.toString(),
    );

    if (!subaccount) {
      throw new BadRequestException('Subaccount not exists.');
    }

    const subaccountId = subaccount.account;

    let update = {
      account: subaccountId,
      subaccounts: _.chain(organization.subaccounts)
        .concat({
          account: (organization.account as IAccount)._id,
          status: OrganizationSubaccountStatusType.ACTIVE,
          name: (organization.account as IAccount).fullName || (organization.account as IAccount).email.split('@')[0],
          inviteDate: new Date(),
        })
        .reject((item) => item.account.toString() === subaccountId.toString())
        .value(),
    };

    const updated = await super.updateOne(findData, update, { include: ['subaccounts.account'] });

    await this.syncFormPaymentOrganizationSubaccounts(organization._id);

    return updated;
  }

  async inviteSubaccountByUser(
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationSendSubaccountInvite,
  ): Promise<IOrganization> {
    const organization = await super.findOneOrException(findData, { include: ['account'] });

    const account = findData.account as IAccount;

    const subaccountFullData = await this.client.send<IAccount>(AccountPattern.FIND_ONE, {
      query: {
        email: updateData.email,
      },
    });

    if (!subaccountFullData) {
      throw new BadRequestException(`Account with email ${updateData.email} not found`);
    }

    if (account.email === updateData.email) {
      throw new BadRequestException("You can't make yourself a subaccount of an organization");
    }

    if (_.find(organization.subaccounts, (subaccount) => subaccount.account.toString() === subaccountFullData._id)) {
      throw new BadRequestException(
        `Account with email ${updateData.email} is already a subaccount of the organization`,
      );
    }

    const updatedOrganization = await super.updateOne(
      findData,
      {
        addSubaccount: {
          ..._.omit(updateData, 'email'),
          account: subaccountFullData._id,
          status: OrganizationSubaccountStatusType.INVITED,
        },
      },
      { include: ['subaccounts.account'] },
    );

    await this.client.send(SenderPattern.SEND_USER, {
      type: SenderOrganizationEvents.ORGANIZATION_SUBACCOUNT_INVITE,
      account: subaccountFullData,
      data: {
        organizationName: organization.name,
        subaccountName: updateData.name,
        linkHref: updateData.redirectUrl,
      },
      language: subaccountFullData.lang,
    });

    return updatedOrganization;
  }

  // Принять/отклонить инвайт
  async replyInviteByUser(
    findData: IOrganizationSiteQuery,
    updateData: Pick<IOrganizationSubaccount, 'status'>,
  ): Promise<void> {
    const { _id } = findData;
    const account = findData.account as IAccount;

    const organization = await super.findOneOrException({ _id }, { include: ['account'] });

    const organizationSubaccount = _.find(
      organization.subaccounts,
      (subaccount) => subaccount.account.toString() === account._id,
    );

    if (!organizationSubaccount) {
      throw new BadRequestException(`Subaccount with email ${account.email} not found`);
    }

    if (
      !_.includes(
        [OrganizationSubaccountStatusType.INVITED, OrganizationSubaccountStatusType.REJECTED],
        organizationSubaccount.status,
      )
    ) {
      throw new BadRequestException(
        `You cannot ${
          updateData.status === OrganizationSubaccountStatusType.ACTIVE ? 'accept' : 'reject'
        } invitations. You are already a member of the organization.`,
      );
    }

    const organizationSubaccounts = _.chain(organization.subaccounts)
      .map((subaccount) => {
        if (subaccount.account.toString() !== account._id) return subaccount;

        return { ...subaccount, status: updateData.status };
      })
      .uniqBy((item) => item.account.toString())
      .value();

    const updatedOrganization = await super.updateOne(
      { _id },
      { subaccounts: organizationSubaccounts },
      { include: ['subaccounts.account'] },
    );

    // const updateResult = await this.model.updateOne(
    //   { _id },
    //   {
    //     $set: {
    //       'subaccounts.$[elem].status': updateData.status,
    //     },
    //   },
    //   {
    //     arrayFilters: [{ 'elem.account': organizationSubaccount.account }],
    //   },
    // );

    // if (updateResult.modifiedCount > 0) {
    if (updatedOrganization) {
      await this.syncFormPaymentOrganizationSubaccounts(_id);

      const eventType =
        updateData.status === OrganizationSubaccountStatusType.ACTIVE
          ? SenderOrganizationEvents.ACCEPT_ORGANIZATION_SUBACCOUNT_INVITE
          : SenderOrganizationEvents.REJECT_ORGANIZATION_SUBACCOUNT_INVITE;

      await this.client.send(SenderPattern.SEND_USER, {
        type: eventType,
        account: organization.account,
        data: {
          organizationName: organization.name,
          subaccountEmail: account.email,
        },
        language: account.lang,
      });
    }
  }

  async deleteSubaccountByUser(
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationDeleteSubaccount,
  ): Promise<IOrganization> {
    const updateResult = await super.updateOneOrException(
      findData,
      {
        removeSubaccount: updateData.account as string,
      },
      { include: ['subaccounts.account'] },
    );

    await this.client.send(FormPaymentPattern.UPDATE_MANY, {
      query: {
        account: updateData.account as string,
      },
      update: {
        account: updateResult.account,
      },
    });

    await this.client.send(ContractPattern.UPDATE_MANY, {
      query: {
        account: updateData.account as string,
      },
      update: {
        account: updateResult.account,
      },
    });

    if (updateResult) {
      await this.syncFormPaymentOrganizationSubaccounts(updateResult._id);

      const subaccountFullData = await this.client.send<IAccount>(AccountPattern.FIND_ONE, {
        query: {
          _id: updateData.account,
        },
      });

      if (subaccountFullData) {
        await this.client.send(SenderPattern.SEND_USER, {
          type: SenderOrganizationEvents.DELETE_ORGANIZATION_SUBACCOUNT,
          account: subaccountFullData,
          data: {
            organizationName: updateResult.name,
            subaccountEmail: subaccountFullData.email,
          },
          language: subaccountFullData.lang,
        });
      }
    }

    return updateResult;
  }

  private async exitSubaccount(
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationDeleteSubaccount,
  ): Promise<IOrganization> {
    const organization = await super.findOneOrException(
      {
        _id: findData._id,
        subaccount: updateData.account as string,
      },
      { include: ['account'] },
    );

    return organization;
  }

  private async syncFormPaymentOrganizationSubaccounts(_id: string): Promise<void> {
    const organization = await super.findOneOrException({ _id });
    //
    // const activeSubaccounts = _.filter(
    //   organization.subaccounts,
    //   (acc) => acc.status === OrganizationSubaccountStatusType.ACTIVE,
    // );

    const activeSubaccounts = _.chain(organization.subaccounts)
      .filter((acc) => acc.status === OrganizationSubaccountStatusType.ACTIVE)
      .uniqBy((item) => item.account)
      .value();

    await this.client.send(FormPaymentPattern.SYNC_ORGANIZATION_SUBACCOUNTS, {
      account: organization.account,
      organizationId: _id,
      subaccounts: activeSubaccounts,
    });
  }

  protected makeUpdate({ addSubaccount, removeSubaccount, ...data }: IOrganizationUpdate) {
    const updateData: UpdateQuery<Organization> & any = {
      $set: { ...data },
      $addToSet: {},
      $pull: {},
    };

    if (addSubaccount) {
      updateData.$addToSet['subaccounts'] = {
        ...addSubaccount,
      };
    }

    if (removeSubaccount) {
      updateData.$pull['subaccounts'] = {
        account: removeSubaccount,
      };
    }

    return updateData as UpdateQuery<Organization>;
  }

  protected async makeQuery({
    _ids,
    name,
    inn,
    signerName,
    subaccount,
    isDeleted,
    exactInn,
    ...findData
  }: IOrganizationAdminQuery): Promise<FilterQuery<Organization>> {
    const query: FilterQuery<Organization> = { ...findData };

    if (_ids) {
      query._id = { $in: _ids };
    }

    if (name) {
      query.name = new RegExp(name, 'gi');
    }

    if (inn) {
      query.inn = new RegExp(inn, 'gi');
    }

    if (signerName) {
      query.signerName = new RegExp(signerName, 'g');
    }

    if (subaccount) {
      if (query.account) {
        query.$or = [
          ...(query.$or || []),
          { account: query.account },
          {
            subaccounts: {
              $elemMatch: {
                account: subaccount,
                status: OrganizationSubaccountStatusType.ACTIVE,
              },
            },
            // 'subaccounts.$elemMatch.account': subaccount,
            // 'subaccounts.$elemMatch.status': OrganizationSubaccountStatusType.ACTIVE,
          },
        ];

        delete query.account;
      } else {
        // query['subaccounts.$.account'] = subaccount;
        // query['subaccounts.$.status'] = OrganizationSubaccountStatusType.ACTIVE;
        query['subaccounts'] = {
          $elemMatch: {
            account: subaccount,
            status: OrganizationSubaccountStatusType.ACTIVE,
          },
        };
      }
    }

    if (exactInn) {
      query.inn = exactInn;
    }

    query.isDeleted = isDeleted ? true : { $ne: true };

    return query;
  }
}
