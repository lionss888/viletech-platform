import { Module } from '@nestjs/common';
import { ANTHROPIC_SERVICE } from './anthropic.service.interface';
import { AnthropicService } from './anthropic.service';

@Module({
  providers: [{ provide: ANTHROPIC_SERVICE, useClass: AnthropicService }],
  exports: [{ provide: ANTHROPIC_SERVICE, useClass: AnthropicService }],
})
export class AnthropicModule {}
