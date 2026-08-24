import _ from 'lodash';

export interface INatsInitiateCursor {
  initiateCursor: boolean;
  data: any;
}

export interface INatsCursorRequest {
  cursorId: string;
  data: any;
}

export interface INatsCursorResponse {
  cursorId: string;
  data?: any;
  done: boolean;
}

export class NatsCursorMessage {
  static isInitiateCursor(data: any): data is INatsInitiateCursor {
    return !!data.initiateCursor;
  }

  static isCursorRequest(data: any): data is INatsCursorRequest {
    return !!data.initiateCursor || !!data.cursorId;
  }

  static isCursorResponse(data: any): data is INatsCursorResponse {
    return !!data.cursorId && !_.isNil(data.done);
  }
}
