import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const SeniorProviderMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'role', value: AccountRole.SENIOR_PROVIDER });

  const summary = (options.summary || '') + ' (Need senior provider or root auth token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
