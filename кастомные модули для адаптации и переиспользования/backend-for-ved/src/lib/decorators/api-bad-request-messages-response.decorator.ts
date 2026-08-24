import { ApiMessagessResponse } from './api-messages-response.decorator';

export const ApiBadRequestMessagesResponse = (messages: string[]) =>
  ApiMessagessResponse({ status: 400, error: 'Bad Request', messages });
