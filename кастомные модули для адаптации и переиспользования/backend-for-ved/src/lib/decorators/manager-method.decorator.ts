import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const ManagerMethod = (options: MethodOptions) => {
  const metadata = [
    ...(options.metadata || []),
    { key: 'roles', value: [AccountRole.MANAGER, AccountRole.TREASURER] },
  ];
  const summary = `${options.summary || ''} (Need manager, treasurer or root auth token.)`.trim();

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
