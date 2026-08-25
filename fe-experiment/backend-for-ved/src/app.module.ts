import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MigrationModule } from 'lib/modules/migration/migration.module';
import { RequestHandler } from 'lib/middlewares/request-handler.middleware';
import { config } from './config';
import { CommonModule } from 'lib/modules/common/common.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FileModule } from './modules/file/file.module';
import { migrations } from './migrations';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { CodeModule } from './modules/code/code.module';
import { TokenModule } from './modules/token/token.module';
import { FormPaymentModule } from './modules/form-payment/form-payment.module';
import { ContractModule } from './modules/contract/contract.module';
import { MailModule } from './modules/mail/mail.module';
import { AgentModule } from './modules/agent/agent.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { LiquidityModule } from './modules/liquidity/liquidity.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { CommentModule } from './modules/comment/comment.module';
import { CounterpartyModule } from './modules/counterparty/counterparty.module';
import { RecognitionModule } from './modules/recognition/recognition.module';
import { SocketModule } from './modules/socket/socket.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TemplateModule } from './modules/template/template.module';
import { HsCodeModule } from './modules/hs-code/hs-code.module';
import { ComplianceHistoryModule } from './modules/compliance-history/compliance-history.module';
import { VirtualAccountModule } from './modules/virtual-account/virtual-account.module';
import { TreasurerTaskModule } from './modules/treasurer-task/treasurer-task.module';
import { DiadocModule } from './modules/diadoc/diadoc.module';
import { BduiModule } from './modules/bdui/bdui.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CommonModule.register({ config }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('bullQueue'),
    }),
    ScheduleModule.forRoot(),
    MailModule,
    AccountModule,
    AuthModule,
    CodeModule,
    FileModule,
    TokenModule,
    AgentModule,
    OrganizationModule,
    CounterpartyModule,
    ContractModule,
    FormPaymentModule,
    CurrencyModule,
    LiquidityModule,
    CommentModule,
    RecognitionModule,
    SocketModule,
    ConfigurationModule,
    PaymentModule,
    TemplateModule,
    ComplianceHistoryModule,
    VirtualAccountModule,
    VirtualAccountModule,
    MigrationModule.register({ migrations }),
    TelegramModule,
    HsCodeModule,
    TreasurerTaskModule,
    DiadocModule, // VF-2: Интеграция с Диадоком для ЭДО
    BduiModule, // fe-experiment: BDUI schema layer (User role)
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestHandler).forRoutes('/');
  }
}
