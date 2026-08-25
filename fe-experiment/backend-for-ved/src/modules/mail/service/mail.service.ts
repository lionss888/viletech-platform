import { Injectable, Logger } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';
import { renderFile } from 'pug';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { IMailSend, IMailService } from './mail.service.interface';
import { SenderFormPaymentEvents, SenderOrganizationEvents } from 'lib/enums/models/sender.enums';
import { SenderAccountEvents } from 'lib/enums/models/sender.account.enums';
import * as _ from 'lodash';

@Injectable()
export class MailService implements IMailService {
  private logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {}

  template(template: string, options: Record<string, unknown>) {
    return renderFile(path.join(__dirname, '../templates/', template + '.pug'), options);
  }

  getPath(event, toAdmins) {
    const organizationEvents = Object.values(SenderOrganizationEvents);
    const formEvents = Object.values(SenderFormPaymentEvents);
    const accountEvents = Object.values(SenderAccountEvents);

    let translatePath = event;
    let templatePath = event;

    if (organizationEvents.includes(event)) {
      translatePath = `organization.${event}`;
      templatePath = 'organization';
    }

    if (formEvents.includes(event)) {
      translatePath = `form.${event}.${toAdmins ? 'manager' : 'client'}`;
      templatePath = 'form';
    }

    if (accountEvents.includes(event)) {
      translatePath = `account.${event}`;
      templatePath = 'account';
    }

    return { translatePath, templatePath };
  }

  async send(dto: IMailSend): Promise<void> {
    const { translatePath, templatePath } = this.getPath(dto.type, dto.toAdmins);

    const translate = await this.i18n.translate(translatePath, {
      lang: 'ru',
      args: dto.data,
    });
    const subject = typeof translate === 'object' && translate !== null && 'subject' in translate
      ? String(translate.subject || '')
      : '';

    const data = dto.data || {};

    let toEmails = [];

    if (dto.toAdmins) {
      toEmails = dto.managerEmails;
    } else {
      if (!dto.account?.email) {
        this.logger.error('Fail send mail. To email undefined.');
        return;
      }

      toEmails = [dto.account.email];
    }
    const sendMailOptions: ISendMailOptions = {
      subject,
      html: this.template(templatePath, {
        translate: typeof translate === 'object' && translate !== null ? { ...translate } : {},
        data: {
          ...data,
          staticPath: this.configService.get('staticPath'),
          uploadFilePath: this.configService.get('uploadFilePath'),
        },
        account: dto.account,
      }),
    };

    const chunksEmails = _.chunk(toEmails, 10);

    for (const chunkEmails of chunksEmails) {
      const chunkSendMailOptions = {
        ...sendMailOptions,
        to: chunkEmails,
      };

      this.mailerService
        .sendMail(chunkSendMailOptions)
        .then(() => this.logger.log(`Success send mail to ${toEmails}`))
        .catch((e) => this.logger.error(`Fail send mail to ${toEmails} error - ${JSON.stringify(e)}`));
    }
  }
}
