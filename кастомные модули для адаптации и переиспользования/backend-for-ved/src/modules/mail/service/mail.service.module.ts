import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import path from 'path';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { MailService } from './mail.service';
import { MAIL_CLIENT } from '../mail.constants';
import { MailerAsyncOptions } from '@nestjs-modules/mailer/dist/interfaces/mailer-async-options.interface';

@Module({
  imports: [
    NatsModule(MAIL_CLIENT),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        defaults: {
          from: `V360 <${configService.get('emails.noreply')}>`,
        },
        transport: configService.get('smtp'),
      }),
    } as MailerAsyncOptions),
    I18nModule.forRoot({
      fallbackLanguage: 'ru',
      resolvers: [AcceptLanguageResolver],
      loaderOptions: {
        path: path.join(__dirname, '../i18n/'),
        watch: true,
      },
    }),
  ],
  providers: [{ provide: 'IMailService', useClass: MailService }],
  exports: [{ provide: 'IMailService', useClass: MailService }],
})
export class MailServiceModule {}
