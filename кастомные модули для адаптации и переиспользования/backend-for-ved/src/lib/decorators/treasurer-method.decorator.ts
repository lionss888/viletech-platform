import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const TreasurerMethod = (options: MethodOptions) => {
  const metadata = [...(options.metadata || []), { key: 'role', value: AccountRole.TREASURER }];
  const summary = `${options.summary || ''} (Need treasurer or root auth token.)`.trim();

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
