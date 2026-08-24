import { Method, MethodOptions } from './method.decorator';
import { ApiMessagessResponse } from './api-messages-response.decorator';

export const UserExternalMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'isExternalUser', value: true });

  const headers = options.headers || [];
  headers.push({ name: 'x-authorization', required: false });

  let summary = 'Need external x-auth token.';
  if (options.summary) {
    summary += `\n${options.summary}`;
  }

  return Method({
    ...options,
    metadata,
    summary,
    headers,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
