import { Logger } from '@nestjs/common';
import { OrganizationBusinessFormType } from 'lib/enums/models/organization.enums';
import { BUSINESS_FORM_KEYWORDS } from '../kontur.constants';

const BUSINESS_FORM_ORGANIZATION_BUSINESS_FORM_TYPE_MAP = [
  [BUSINESS_FORM_KEYWORDS.PAO, OrganizationBusinessFormType.PAO],
  [BUSINESS_FORM_KEYWORDS.OAO, OrganizationBusinessFormType.OAO],
  [BUSINESS_FORM_KEYWORDS.OOO, OrganizationBusinessFormType.OOO],
  [BUSINESS_FORM_KEYWORDS.NPAO, OrganizationBusinessFormType.AO],
  [BUSINESS_FORM_KEYWORDS.IP, OrganizationBusinessFormType.IP],
] as const;

export class BusinessFormMapper {
  private static readonly logger: Logger = new Logger(BusinessFormMapper.name);

  static map(opf: string): OrganizationBusinessFormType | undefined {
    const opfLower = opf.toLowerCase();

    for (const [keywords, businessFormType] of BUSINESS_FORM_ORGANIZATION_BUSINESS_FORM_TYPE_MAP) {
      if (keywords.some((keyword: string) => opfLower.includes(keyword))) {
        return businessFormType;
      }
    }

    if (
      BUSINESS_FORM_KEYWORDS.AO.some((keyword) => opfLower.includes(keyword)) &&
      !opfLower.includes('публичное') &&
      !opfLower.includes('открытое') &&
      !opfLower.includes('непубличное')
    ) {
      return OrganizationBusinessFormType.AO;
    }

    this.logger.warn(`Unknown business form from Kontur: ${opf}`);
    return undefined;
  }
}
