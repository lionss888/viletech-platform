import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';
import { TemplateType } from '../template.enum';
import { TEMPLATE_1_MAPPING } from './template-1.mapping';
import { TEMPLATE_2_MAPPING } from './template-2.mapping';

/**
 * Реестр маппингов Excel шаблонов
 *
 * Как добавить новый шаблон:
 * 1. Создать template-N.mapping.ts
 * 2. Добавить в enum TemplateType
 * 3. Добавить в TEMPLATE_MAPPINGS ниже
 */
export const TEMPLATE_MAPPINGS: Record<TemplateType, IExcelMapping> = {
  [TemplateType.TEMPLATE_1]: TEMPLATE_1_MAPPING,
  [TemplateType.TEMPLATE_2]: TEMPLATE_2_MAPPING,
};

export { TEMPLATE_1_MAPPING } from './template-1.mapping';
export { TEMPLATE_2_MAPPING } from './template-2.mapping';
export { TemplateType } from '../template.enum';
