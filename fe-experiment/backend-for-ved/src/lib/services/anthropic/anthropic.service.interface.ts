import { ImageBlockParam, MessageParam, TextBlock, TextBlockParam } from '@anthropic-ai/sdk/src/resources/messages';

export interface IAnthropicService {
  prompt(content: MessageParam['content'], options?: IAnthropicPromptOptions): Promise<TextBlock | null>;

  getImageBlockParam(image: any, options?: IGetImageBlockParamOptions): ImageBlockParam;

  getTextBlockParam(text: string): TextBlockParam;
}

export interface IAnthropicPromptOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface IGetImageBlockParamOptions {
  mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export const ANTHROPIC_SERVICE = 'IAnthropicService';
