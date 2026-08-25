import { Injectable, NotFoundException } from '@nestjs/common';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { BduiScreen, BduiUserPage } from '../bdui.types';
import { UserScreenBuilders } from './user-screen.builders';

const USER_PAGES: readonly BduiUserPage[] = ['login', 'forms.list', 'forms.create', 'forms.detail'];

/**
 * Serves BDUI screen schemas for the User role experiment.
 */
@Injectable()
export class BduiSchemaService {
  constructor(private readonly userScreenBuilders: UserScreenBuilders) {}

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

  private isUserPage(page: string): page is BduiUserPage {
    return (USER_PAGES as readonly string[]).includes(page);
  }
}
