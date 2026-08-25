import { Injectable, NotFoundException } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { BDUI_ROLE_USER, BDUI_VED_ROLES, BduiVedRoleId } from '../bdui.constants';
import { BduiCabinetPage, BduiScreen, BduiUserPage } from '../bdui.types';
import { RoleCabinetBuilders } from './role-cabinet.builders';
import { UserScreenBuilders } from './user-screen.builders';

const USER_PAGES: readonly BduiUserPage[] = ['login', 'forms.list', 'forms.create', 'forms.detail'];
const CABINET_PAGES: readonly BduiCabinetPage[] = ['login', 'forms.list', 'forms.detail'];

/**
 * Serves BDUI screen schemas for all ВИ roles.
 */
@Injectable()
export class BduiSchemaService {
  constructor(
    private readonly userScreenBuilders: UserScreenBuilders,
    private readonly roleCabinetBuilders: RoleCabinetBuilders,
  ) {}

  /**
   * Returns a screen schema for the given ВИ role and page id.
   */
  getScreen(role: string, page: string, status?: FormPaymentStatus | string): BduiScreen {
    if (!this.isVedRole(role)) {
      throw new NotFoundException(`BDUI role not found: ${role}`);
    }
    if (role === BDUI_ROLE_USER) {
      return this.getUserScreen(page, status);
    }
    return this.getCabinetScreen(role, page, status);
  }

  /**
   * Returns a screen schema for role=user and the given page id.
   */
  getUserScreen(page: string, status?: FormPaymentStatus | string): BduiScreen {
    if (!this.isUserPage(page)) {
      throw new NotFoundException(`BDUI page not found: ${page}`);
    }
    switch (page) {
      case 'login':
        return this.userScreenBuilders.buildLoginScreen();
      case 'forms.list':
        return this.userScreenBuilders.buildFormsListScreen();
      case 'forms.create':
        return this.userScreenBuilders.buildFormsCreateScreen();
      case 'forms.detail':
        return this.userScreenBuilders.buildFormsDetailScreen(status);
      default:
        throw new NotFoundException(`BDUI page not found: ${page}`);
    }
  }

  private getCabinetScreen(
    role: BduiVedRoleId,
    page: string,
    status?: FormPaymentStatus | string,
  ): BduiScreen {
    if (!this.isCabinetPage(page)) {
      throw new NotFoundException(`BDUI page not found for ${role}: ${page}`);
    }
    switch (page) {
      case 'login':
        return this.roleCabinetBuilders.buildLoginScreen(role);
      case 'forms.list':
        return this.roleCabinetBuilders.buildFormsListScreen(role);
      case 'forms.detail':
        return this.roleCabinetBuilders.buildFormsDetailScreen(role, status);
      default:
        throw new NotFoundException(`BDUI page not found for ${role}: ${page}`);
    }
  }

  private isVedRole(role: string): role is BduiVedRoleId {
    return (BDUI_VED_ROLES as readonly string[]).includes(role);
  }

  private isUserPage(page: string): page is BduiUserPage {
    return (USER_PAGES as readonly string[]).includes(page);
  }

  private isCabinetPage(page: string): page is BduiCabinetPage {
    return (CABINET_PAGES as readonly string[]).includes(page);
  }
}
