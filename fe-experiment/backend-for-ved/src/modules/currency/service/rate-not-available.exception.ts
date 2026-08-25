import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when exchange rate is not available from specified source
 *
 * V-51 Phase 3: Rate lookup by source
 */
export class RateNotAvailableException extends HttpException {
  constructor(
    message: string,
    public readonly context?: {
      formPaymentId?: string;
      accountId?: string;
      currencyCode?: string;
      source?: string;
    }
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'Rate Not Available',
        context
      },
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}
