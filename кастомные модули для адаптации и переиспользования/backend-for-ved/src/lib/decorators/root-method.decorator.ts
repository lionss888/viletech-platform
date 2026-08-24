import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const RootMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'role', value: AccountRole.ROOT });

  let summary = (options.summary || '') + ' (Need root auth token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
