import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch(HttpException)
export class WsValidationFilter extends BaseWsExceptionFilter {
  logger: Logger = new Logger();

  catch(exception: any, host: ArgumentsHost) {
    this.logger.error(exception);
    return super.catch(new WsException(exception.getResponse()), host);
  }
}
