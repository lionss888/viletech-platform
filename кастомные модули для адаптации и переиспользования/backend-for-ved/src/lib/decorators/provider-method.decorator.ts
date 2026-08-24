import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const ProviderMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'role', value: AccountRole.PROVIDER });

  let summary = (options.summary || '') + ' (Need provider or root auth token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
