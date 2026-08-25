import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

export interface INatsStreamMessage {
  isStream: boolean;
  id: string;
  isLast: boolean;
  isFirst: boolean;
  encoding: BufferEncoding;
  index: number;
  data?: string;
  isJson?: boolean;
}

export interface INatsStreamChunkRequest {
  id: string;
  isStream: boolean;
  isChunkRequest: boolean;
}

export class NatsStreamMessage implements INatsStreamMessage {
  static readonly maxNatsChunkSize: number = 1024 * 512; // 512 KB
  static readonly encoding: BufferEncoding = 'utf-8';
  static readonly chunkTimeoutMs: number = 10000;

  constructor(
    public isStream: boolean,
    public id: string,
    public isLast: boolean,
    public isFirst: boolean,
    public encoding: BufferEncoding,
    public index: number,
    public isJson?: boolean,
    public data?: string,
  ) {}

  static forRequest(isJson?: boolean): NatsStreamMessage {
    return new NatsStreamMessage(true, uuidv4(), false, true, NatsStreamMessage.encoding, 0, isJson);
  }

  static isRpcStream(data: any): data is INatsStreamMessage {
    return !!data && !!data.isStream && !!data.id && !!data.encoding && !_.isNil(data.index) && !_.isNil(data.isLast);
  }

  static isRpcStreamChunkRequest(data: any): data is INatsStreamChunkRequest {
    return !!data && !!data.isStream && !!data.id && !!data.isChunkRequest;
  }

  static isDataTooLarge(data: Buffer) {
    return data.length > NatsStreamMessage.maxNatsChunkSize;
  }

  next(data: string) {
    return new NatsStreamMessage(
      this.isStream,
      this.id,
      false,
      false,
      this.encoding,
      this.index + 1,
      this.isJson,
      data,
    );
  }

  finish() {
    return new NatsStreamMessage(this.isStream, this.id, true, false, this.encoding, this.index + 1, this.isJson);
  }
}
