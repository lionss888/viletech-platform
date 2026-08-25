import { Injectable, Logger } from '@nestjs/common';
import { IAnthropicPromptOptions, IAnthropicService, IGetImageBlockParamOptions } from './anthropic.service.interface';
import Anthropic from '@anthropic-ai/sdk';
import { ImageBlockParam, MessageParam, TextBlock, TextBlockParam } from '@anthropic-ai/sdk/src/resources/messages';
import _ from 'lodash';

@Injectable()
export class AnthropicService implements IAnthropicService {
  private readonly anthropicInstance = new Anthropic({});
  private readonly anthropicModel = 'claude-haiku-4-5-20251001';
  private readonly logger: Logger = new Logger(AnthropicService.name);

  async prompt(content: MessageParam['content'], options?: IAnthropicPromptOptions): Promise<TextBlock | null> {
    try {
      this.logger.log('Start request to anthropic');

      const result = await this.anthropicInstance.messages.create({
        model: this.anthropicModel,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      this.logger.log('Finish request to anthropic');

      return _.find(result.content, { type: 'text' }) as TextBlock;
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
      return null;
    }
  }

  getImageBlockParam(image: Buffer, options?: IGetImageBlockParamOptions): ImageBlockParam {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: options?.mediaType || 'image/png',
        data: image.toString('base64'),
      },
    };
  }

  getTextBlockParam(text: string): TextBlockParam {
    return {
      type: 'text',
      text,
    };
  }
}
