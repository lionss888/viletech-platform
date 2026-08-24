import { Method, MethodOptions } from './method.decorator';
import { ApiMessagessResponse } from './api-messages-response.decorator';

export const UserMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'isUser', value: true });

  let summary = (options.summary || '') + ' (Need auth user token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
