import { Method, MethodOptions } from './method.decorator';
import { ApiMessagessResponse } from './api-messages-response.decorator';

export const AuthMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'isNeedAuth', value: true });

  let summary = (options.summary || '') + ' (Need auth token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
