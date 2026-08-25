import { ApiMessagessResponse } from './api-messages-response.decorator';

export const ApiForbiddenMessagesResponse = (messages: string[]) =>
  ApiMessagessResponse({ status: 403, error: 'Forbidden', messages });
