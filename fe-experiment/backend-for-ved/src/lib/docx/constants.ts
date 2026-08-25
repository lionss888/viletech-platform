import { AlignmentType, BorderStyle, ILevelsOptions, ISectionPropertiesOptions, LevelFormat } from 'docx';

export const docxFont = 'Arial';
export const docxNormalFontSize = 20; // Размер шрифта 10
export const docxSmallFontSize = 17; // Размер шрифта 8,5
export const docxBorderWeight = 6; // Толщина линии рамок
export const docxBorderColor = '000000'; // Цвет рамок
export const docxLineHeight = 276; // Межстрочный интервал 1.15
export const docxParagraphIndentFirstLine = 720; // 720 = 0.5 дюйма = 1.27 см
export const docxParagraphBottomSpace = 200; // Отступ после параграфа
export const docxPageWidth = 11906; // Обычная ширина A4 в twip (21 см)
export const docxPageMargin = 1134; // Обычные отступы (2 см)
export const docxFullWidthTable = docxPageWidth - docxPageMargin * 2; // Таблица во всю ширину страницы
export const docxTableHorizontalPadding = 200; // Горизонтальные отступы внутри таблицы
export const docxTableVerticalPadding = 100; // Вертикальные отступы внутри таблицы

export const docxBorderParams = {
  style: BorderStyle.SINGLE, // Сплошная линия
  size: docxBorderWeight,
  color: docxBorderColor,
};

export const docxSectionProperties: ISectionPropertiesOptions = {
  page: {
    margin: {
      // Отступы страницы
      top: docxPageMargin,
      bottom: docxPageMargin,
      left: docxPageMargin,
      right: docxPageMargin,
    },
  },
};

export const docxParagraphListIndentParams = {
  left: docxParagraphIndentFirstLine, // Общий отступ списка слева
  hanging: 200,
};

export const docxDefaultNumberingLevelConfig: ILevelsOptions = {
  level: 0, // Уровень вложенности (0 — основной)
  format: LevelFormat.DECIMAL, // Формат (1, 2, 3)
  text: '%1.', // Формат отображения (например, "1.")
  alignment: AlignmentType.CENTER, // Выравнивание
  style: {
    run: {
      size: docxNormalFontSize,
      font: docxFont,
    },
  },
};
