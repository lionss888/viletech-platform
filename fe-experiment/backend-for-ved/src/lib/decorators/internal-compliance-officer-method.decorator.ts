import { Method, MethodOptions } from './method.decorator';
import { AccountRole } from 'lib/enums/models/account.enums';
import { ApiMessagessResponse } from 'lib/decorators/api-messages-response.decorator';

export const InternalComplianceOfficerMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'role', value: AccountRole.INTERNAL_COMPLIANCE_OFFICER });

  let summary = (options.summary || '') + ' (Need compliance officer or root auth token.)';

  return Method({
    ...options,
    metadata,
    summary,
    decorators: [ApiMessagessResponse({ messages: ['Unauthorized'], status: 401 })],
  });
};
