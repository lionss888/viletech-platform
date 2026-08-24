import { Paragraph } from 'docx';
import { docxLineHeight, docxParagraphBottomSpace } from '../constants';

export class CustomParagraph extends Paragraph {
  constructor(options) {
    super({
      spacing: {
        line: docxLineHeight,
        after: docxParagraphBottomSpace,
      },
      ...options,
    });
  }
}
