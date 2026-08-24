import { INatsStreamMessage, NatsStreamMessage } from './nats-stream-message';
import { splitBuffer } from '../../utils/split-buffer';
import { NatsClientProxy } from './nats-client-proxy';
import _ from 'lodash';

export class NatsStreamingAdapter {
  constructor(private client: NatsClientProxy) {}

  async send<TResult = any>(pattern: any, data: Buffer, isJson?: boolean): Promise<TResult> {
    // Разбиваем данные для запроса на чанки
    const chunks = splitBuffer(data, NatsStreamMessage.maxNatsChunkSize);

    let message = NatsStreamMessage.forRequest(isJson);
    // Отправляем все чанки по очереди
    for (const chunk of chunks) {
      message = message.next(chunk.toString(NatsStreamMessage.encoding));

      await this.client.send(pattern, message, false);
    }
    // Отправка последнего чанка
    const result = await this.client.send(pattern, message.finish(), false);
    // Если ответ не является стримом - return
    if (!NatsStreamMessage.isRpcStream(result)) {
      return result;
    }
    const messages: INatsStreamMessage[] = [result];

    // Запрашиваем по очереди все чанки ответа
    while (true) {
      const chunk = await this.client.send<INatsStreamMessage>(
        pattern,
        {
          id: result.id,
          isStream: true,
          isChunkRequest: true,
        },
        false,
      );

      messages.push(chunk);

      if (chunk.isLast) {
        break;
      }
    }

    // Упорядочиваем данные
    const orderedChunks = _.orderBy(messages, 'index', 'asc');
    // Формируем результат
    const buffer = Buffer.concat(orderedChunks.map(({ data, encoding }) => Buffer.from(data, encoding)));

    const encoding = orderedChunks[0].encoding;
    const isJsonResponse = orderedChunks[0].isJson;

    return isJsonResponse ? JSON.parse(buffer.toString(encoding)) : buffer;
  }
}
