import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { ClassConstructor, instanceToPlain, plainToInstance } from 'class-transformer';
import * as _ from 'lodash';
import { ITelegramSend, ITelegramService } from './telegram.service.interface';
import { mapDtoEvent, mapEventChannels } from '../telegram.constants';
import { SenderFormPaymentEvents } from '../../../lib/enums/models/sender.enums';
import { AccountPattern } from '../../../lib/enums/models/account.enums';
import { IAccountTelegram } from '../../../lib/interfaces/models/account.interface';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';

@Injectable()
export class TelegramService implements ITelegramService {
  private logger = new Logger(TelegramService.name);

  private readonly bot: Telegraf;
  private readonly channels: Record<string, number>;

  constructor(
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
    @InjectNats() readonly client: NatsClientProxy,
  ) {
    this.bot = new Telegraf(this.configService.get('telegram').token);

    this.bot.telegram
      .setMyCommands([
        { command: 'start', description: 'Старт' },
        { command: 'stop', description: 'Стоп' },
      ])
      .then()
      .catch((e) => this.logger.error(e));

    this.bot.command('start', this.start.bind(this));

    this.bot.command('stop', this.stop.bind(this));

    this.bot
      .launch()
      .then()
      .catch((e) => this.logger.error(e));

    this.channels = configService.get('telegram').channels;
  }

  private async updateAccountTelegram(update: IAccountTelegram) {
    const { username, userId } = update;

    const account = await this.client.send(AccountPattern.FIND_ONE, {
      query: { telegram: { username: username } },
      options: {
        select: '_id telegram',
      },
    });

    if (account) {
      await this.client.send(AccountPattern.UPDATE_ONE, {
        query: { _id: account._id },
        update: {
          telegramUserId: userId,
          telegramUserName: username,
        },
      });
    }
  }

  private async start(ctx) {
    const { username, id: userId, first_name: firstName } = ctx.message.from;

    await this.updateAccountTelegram({ username, userId });

    const { id: chatId } = ctx.message.chat;

    await this.bot.telegram.sendMessage(chatId, `${firstName} подписался на события`);
  }

  private async stop(ctx) {
    const { username, first_name: firstName } = ctx.message.from;

    await this.updateAccountTelegram({ username, userId: null });

    const { id: chatId } = ctx.message.chat;

    await this.bot.telegram.sendMessage(chatId, `${firstName} отписался от событий`);
  }

  async send(telegramSend: ITelegramSend): Promise<void> {
    const channels = mapEventChannels[telegramSend.event];

    if (!channels?.length) {
      return;
    }

    const dtoEntry = mapDtoEvent.find(([, events]) => _.includes(events, telegramSend.event))?.[0];

    if (!dtoEntry) {
      this.logger.error('Fail send message. Translate not found.');
      return;
    }

    const [Dto, entityName] = dtoEntry;

    const plain = _.defaults({}, telegramSend.data, {
      event: telegramSend.event,
    });

    const args = instanceToPlain(
      plainToInstance(Dto, plain, {
        excludeExtraneousValues: true,
      }),
    ) as Record<string, unknown>;

    const translateEventPath = `event.${telegramSend.event}`;

    const eventText: string = await this.i18n.translate(translateEventPath, {
      lang: telegramSend.language,
      args: { ...args },
      defaultValue: '',
    });

    if (!eventText) {
      this.logger.error('Fail send message. Text is empty.');
      return;
    }

    const translateEntityPath = `entity.${entityName}`;

    const text: string = await this.i18n.translate(translateEntityPath, {
      lang: telegramSend.language,
      args: { ...args, event: eventText },
      defaultValue: '',
    });

    // Sanitize: remove confidential personal/company details at all stages
    const sanitize = (s: string) => {
      if (!s) return s;
      const lines = s.split('\n');
      // Only redact confidential fields, keep financial/operational data
      const dropLabels = [
        'ИНН:',
        'Телефон:',
        'E-mail:',
        'Должность подписанта:',
        'Подписант:',
      ];

      const result: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const isDrop = dropLabels.some((label) => trimmed.startsWith(label));
        if (isDrop) {
          // Skip this label line and the immediate value line if present on the next line
          if (i + 1 < lines.length && lines[i + 1].trim().length > 0 && !lines[i + 1].includes(':')) {
            i += 1;
          }
          continue;
        }
        result.push(line);
      }

      return result.join('\n');
    };

    const finalText = sanitize(text);

    for (const channel of channels) {
      const chatId = this.channels[channel];

      if (!chatId) {
        this.logger.error('Fail send message. Chat not found.');
        return;
      }

      this.bot.telegram
        .sendMessage(chatId, finalText, { parse_mode: 'HTML' })
        .then(() => this.logger.log(`Success send telegram message to ${chatId}`))
        .catch((e) => this.logger.error(`Fail send telegram message to ${chatId} error - ${JSON.stringify(e)}`));
    }
  }
}
