import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const AnyProviderMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  // allow both provider and senior provider
  metadata.push({ key: 'roles', value: [AccountRole.PROVIDER, AccountRole.SENIOR_PROVIDER] });

  const summary = (options.summary || '') + ' (Need provider/senior-provider or root auth token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
