import { ArgumentsHost, Logger } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import * as _ from 'lodash';
import stringify from 'json-stringify-pretty-compact';

export class RpcValidationFilter extends BaseRpcExceptionFilter {
  logger: Logger = new Logger(RpcValidationFilter.name);
  secretParams = ['password', 'mnemonic', 'seed'];

  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToRpc().getContext();
    const data = _.clone(host.switchToRpc().getData());

    if (_.isObject(data)) {
      _.each(this.secretParams, (param) => {
        if (data[param]) {
          data[param] = '******';
        }
      });
    }

    let exceptionsString = stringify(exception.response || exception);
    if (exceptionsString === '{}') {
      exceptionsString = exception;
    }

    this.logger.error(
      `Pattern: ${context.args}\n` + `Input: ${stringify(data)}\n` + `Exception: ${exceptionsString}.`,
      exception.stack,
    );

    const response = exception.getResponse ? exception.getResponse() : exception;
    return super.catch(new RpcException(response), host);
  }
}
