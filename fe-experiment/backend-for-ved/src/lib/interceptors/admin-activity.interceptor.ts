import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { IAdminActivityService } from 'lib/modules/admin-activity/service/admin-activity.service.interface';

@Injectable()
export class AdminActivityInterceptor implements NestInterceptor {
  @Inject('IAdminActivityService') private readonly service: IAdminActivityService;

  constructor(private configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async () => {
        if (context.getType() === 'rpc') {
          return;
        }

        const req = context.switchToHttp().getRequest();

        if (req.method === 'GET' || !/admin/.test(req.path)) {
          return;
        }

        const path = req.path.split(`/api/${this.configService.get('version')}/admin/`)[1];

        try {
          await this.service.create({
            path: path.substring(path.indexOf('/') + 1),
            method: req.method.toLowerCase(),
            account: req.account ? req.account : req.user?.account,
            params: req.params,
            query: req.query,
            body: req.body,
          });
        } catch (e) {}
      }),
    );
  }
}
