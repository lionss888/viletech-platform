import { TextRun } from 'docx';
import { docxFont, docxNormalFontSize } from '../constants';

export class CustomTextRun extends TextRun {
  constructor(options) {
    super({
      font: docxFont,
      size: docxNormalFontSize,
      ...options,
    });
  }
}
