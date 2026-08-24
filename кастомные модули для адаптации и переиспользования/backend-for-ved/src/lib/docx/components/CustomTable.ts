import { BorderStyle, Table } from 'docx';
import { docxBorderColor, docxBorderWeight, docxTableHorizontalPadding, docxTableVerticalPadding } from '../constants';

export class CustomTable extends Table {
  constructor(options) {
    super({
      margins: {
        top: docxTableVerticalPadding,
        bottom: docxTableVerticalPadding,
        left: docxTableHorizontalPadding,
        right: docxTableHorizontalPadding,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: docxBorderWeight, color: docxBorderColor },
        bottom: { style: BorderStyle.SINGLE, size: docxBorderWeight, color: docxBorderColor },
        left: { style: BorderStyle.SINGLE, size: docxBorderWeight, color: docxBorderColor },
        right: { style: BorderStyle.SINGLE, size: docxBorderWeight, color: docxBorderColor },
        insideVertical: { style: BorderStyle.SINGLE, size: docxBorderWeight, color: docxBorderColor }, // Перемычка между колонками
        insideHorizontal: { style: BorderStyle.SINGLE, size: docxBorderWeight, color: docxBorderColor }, // Горизонтальные линии между строками
      },
      ...options,
    });
  }
}
