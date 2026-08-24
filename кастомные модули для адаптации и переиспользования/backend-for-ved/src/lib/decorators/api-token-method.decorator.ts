import { Method, MethodOptions } from 'lib/decorators/method.decorator';

export const ApiTokenMethod = (options: MethodOptions) => {
  const metadata = options.metadata || [];
  metadata.push({ key: 'api-token', value: true });

  let summary = 'Need api token.';
  if (options.summary) {
    summary += `\n${options.summary}`;
  }

  return Method({ ...options, metadata, summary });
};
