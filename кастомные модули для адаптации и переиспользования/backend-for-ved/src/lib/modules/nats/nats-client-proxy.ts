import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { NatsStreamMessage } from './nats-stream-message';
import { NatsStreamingAdapter } from './nats-streaming-adapter';
import { NatsCursorMessage } from './nats-cursor-message';

export const GetNatsClientProxy = (serviceName: string) => {
  class NatsClientProxy {
    streamingAdapter: NatsStreamingAdapter;

    constructor(@Inject(serviceName) readonly client: ClientProxy) {
      this.streamingAdapter = new NatsStreamingAdapter(this);
    }

    send<TResult = any, TInput = any>(pattern: any, data: TInput, chunkify: boolean = false): Promise<TResult> {
      const streamingDisabled = process.env.NATS_STREAMING_DISABLED === 'true';
      const useStreaming = !streamingDisabled && chunkify;

      if (!useStreaming) {
        return this.client.send(pattern, data).toPromise();
      }

      const isJson = !Buffer.isBuffer(data);
      const dataBuffer = isJson ? Buffer.from(JSON.stringify(data), NatsStreamMessage.encoding) : data;

      return this.streamingAdapter.send(pattern, dataBuffer, isJson);
    }

    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Promise<TResult> {
      return this.client.emit(pattern, data).toPromise();
    }

    async cursor<TResult = any, TInput = any>(pattern: any, data: TInput): Promise<AsyncGenerator<TResult[], void>> {
      const client = this;
      const init = await client.send(pattern, {
        initiateCursor: true,
        data,
      });
      if (!NatsCursorMessage.isCursorResponse(init)) {
        throw new Error(`Pattern ${pattern} does not support cursor`);
      }

      const cursorId = init.cursorId;
      let batch = init.data;
      let done = false;

      async function* generator() {
        while (!done) {
          yield batch;

          const next = await client.send(pattern, {
            cursorId,
            data,
          });

          done = next.done;
          batch = next.data;
        }
      }

      return generator.call(this);
    }
  }

  return NatsClientProxy;
};

export class NatsClientProxy {
  send: <TResult = any, TInput = any>(pattern: any, data: TInput, chunkify?: boolean) => Promise<TResult>;
  emit: <TResult = any, TInput = any>(pattern: any, data: TInput) => Promise<TResult>;
  cursor: <TResult = any, TInput = any>(pattern: any, data: TInput) => Promise<AsyncGenerator<TResult[], void>>;
}

export const InjectNats = () => Inject(NatsClientProxy.name);
