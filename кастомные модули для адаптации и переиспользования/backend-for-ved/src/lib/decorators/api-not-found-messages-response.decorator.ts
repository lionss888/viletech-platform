import { ApiMessagessResponse } from './api-messages-response.decorator';

export const ApiNotFoundMessagesResponse = (messages: string[]) =>
  ApiMessagessResponse({ status: 404, error: 'Not Found', messages });
