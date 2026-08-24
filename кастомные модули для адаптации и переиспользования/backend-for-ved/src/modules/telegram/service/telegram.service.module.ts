import { Module } from '@nestjs/common';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { TELEGRAM_CLIENT } from '../telegram.constants';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import path from 'path';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    NatsModule(TELEGRAM_CLIENT),
    I18nModule.forRoot({
      fallbackLanguage: 'ru',
      resolvers: [AcceptLanguageResolver],
      loaderOptions: {
        path: path.join(__dirname, '../i18n/'),
        watch: true,
      },
    }),
    NatsModule(TELEGRAM_CLIENT),
  ],
  providers: [{ provide: 'ITelegramService', useClass: TelegramService }],
  exports: [{ provide: 'ITelegramService', useClass: TelegramService }],
})
export class TelegramServiceModule {}
