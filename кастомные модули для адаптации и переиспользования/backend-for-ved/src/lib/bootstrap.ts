import { NestFactory } from '@nestjs/core';
import helmet, { HelmetOptions } from 'helmet';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { OpenAPIObject, SwaggerDocumentOptions } from '@nestjs/swagger/dist/interfaces';
import { CorsOptions, CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';

interface BootstrapParams {
  AppModule: any;
  serviceName: string;
  helmetOptions?: HelmetOptions;
  productionSwaggerDocument?: OpenAPIObject;
  additionalSwaggerOptions?: SwaggerDocumentOptions;
  additionalOneCSwaggerOptions?: SwaggerDocumentOptions;
  corsOptions?: boolean | CorsOptions | CorsOptionsDelegate<any>;
  addMiddlewares?: (app: INestApplication, configService: ConfigService) => void;
  microservicesOptions?: (configService: ConfigService) => MicroserviceOptions[];
  connectWsAdapter?: (app: INestApplication, configService: ConfigService) => Promise<void>;
}

const logger = new Logger('Common');
process.on('unhandledRejection', async (reason, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:');
  // @ts-ignore
  /* eslint-disable-next-line no-console */
  console.error(promise);
  logger.error('Reason:', reason);
});

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export async function bootstrap(params: BootstrapParams) {
  const app = await NestFactory.create(params.AppModule, {
    cors: params.corsOptions || { origin: true, credentials: true },
  });

  app.use(
    helmet(
      params.helmetOptions || {
        hsts: true,
        noSniff: true,
        ieNoOpen: true,
        xssFilter: true,
        frameguard: true,
        hidePoweredBy: true,
        referrerPolicy: true,
        dnsPrefetchControl: true,
        originAgentCluster: true,
        contentSecurityPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginEmbedderPolicy: true,
        permittedCrossDomainPolicies: true,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      },
    ),
  );

  const configService: any = app.get(ConfigService);

  if (params.addMiddlewares) {
    params.addMiddlewares(app, configService);
  }

  if (params.connectWsAdapter) {
    await params.connectWsAdapter(app, configService);
  }

  app.get('IShutdownService').subscribeToShutdown(async () => app.close());

  addMicroservices();

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix(`api/${configService.get('version')}`);

  addSwagger();
  add1CSwagger();

  const isDevelopment = Boolean(configService.get('isDevelopment'));

  // In dev environments we don't want a broken NATS (or any other transport) to block HTTP startup forever.
  // We still start microservices in background and log failures, but allow the app to serve HTTP.
  if (isDevelopment) {
    const microservicesStart = app.startAllMicroservices();
    microservicesStart.catch((e) => {
      logger.error('Failed to start microservices (dev mode, continuing with HTTP only).', e);
    });

    await Promise.race([
      microservicesStart,
      new Promise<void>((resolve) =>
        setTimeout(() => {
          logger.warn('Microservices startup timeout (dev mode, continuing with HTTP only).');
          resolve();
        }, 10_000),
      ),
    ]);
  } else {
    await app.startAllMicroservices();
  }

  await app.listen(configService.get('port'), '0.0.0.0');

  return app;

  /*** configuration functions***/
  function addSwagger() {
    let swaggerDocument: OpenAPIObject = params.productionSwaggerDocument;

    if (configService.get('isDevelopment')) {
      const swaggerOptions = new DocumentBuilder()
        .setTitle(`${params.serviceName.toUpperCase()} API`)
        .setDescription('The online checkout API description')
        .setVersion(configService.get('version'))
        .addBearerAuth()
        .build();

      swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions, params.additionalSwaggerOptions);
    }

    if (swaggerDocument) {
      const logger: Logger = new Logger();
      logger.debug(
        `http://localhost:${configService.get('port')}/api/${configService.get('version')}/${
          params.serviceName
        }/swagger`,
      );

      SwaggerModule.setup(`api/${configService.get('version')}/${params.serviceName}/swagger`, app, swaggerDocument, {
        customSiteTitle: `${params.serviceName.toUpperCase()} API`,
      });
    }
  }

  function add1CSwagger() {
    let swaggerDocument: OpenAPIObject = params.productionSwaggerDocument;

    if (configService.get('isDevelopment')) {
      const swaggerOptions = new DocumentBuilder()
        .setTitle(`${params.serviceName.toUpperCase()} 1C API`)
        .setDescription(
          `
          ## 📌 Описание API
        
          - \`formPayment -> organization\` – Информация об организации клиента  
          - \`formPayment -> counterparty\` – Информация о контрагенте  
          - \`formPayment -> docs -> paymentOrderSigned\` – Подписанное поручение принципала  
          - \`formPayment -> docs -> reportSigned\` – Подписанный отчет агента  
          - \`formPayment -> docs -> payments\` – Платежные документы *(определять, кто загрузил документ, нужно по полю \`account\`)*:  
            - **Клиент**: \`account = formPayment -> account\`  
            - **Провайдер**: \`account = formPayment -> provider\`  
            - **Менеджер**: остальные значения  
        `,
        )
        .setVersion(configService.get('version'))
        .addBearerAuth()
        .build();

      swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions, {
        ...params.additionalSwaggerOptions,
        ...params.additionalOneCSwaggerOptions,
      });
    }

    if (swaggerDocument) {
      const logger: Logger = new Logger();
      logger.debug(
        `http://localhost:${configService.get('port')}/api/${configService.get('version')}/${
          params.serviceName
        }/1c/swagger`,
      );

      SwaggerModule.setup(
        `api/${configService.get('version')}/${params.serviceName}/1c/swagger`,
        app,
        swaggerDocument,
        {
          customSiteTitle: `${params.serviceName.toUpperCase()} 1C API`,
        },
      );
    }
  }

  function addMicroservices() {
    let microservicesOptions: MicroserviceOptions[] = params.microservicesOptions
      ? params.microservicesOptions(configService)
      : [{ transport: Transport.NATS, options: configService.get('nats') }];

    for (const microservicesOption of microservicesOptions) {
      app.connectMicroservice(microservicesOption);
    }
  }
}
