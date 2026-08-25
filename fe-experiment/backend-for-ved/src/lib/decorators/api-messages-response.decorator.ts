import { ApiResponse } from '@nestjs/swagger';

export const ApiMessagessResponse = (data: { status: number; messages: string[]; error?: string }) => {
  const examples = {};
  for (const message of data.messages) {
    examples[message] = { value: { statusCode: data.status, message } };
    if (data.error) {
      examples[message].value.error = data.error;
    }
  }
  return ApiResponse({
    status: data.status,
    content: { 'application/json': { examples } },
  });
};
