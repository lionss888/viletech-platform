import { Logger } from '@nestjs/common';
import { OrganizationSignerPositionType } from 'lib/enums/models/organization.enums';
import { CEO_POSITION_KEYWORDS } from '../kontur.constants';

const CEO_POSITION_ORGANIZATION_SIGNER_POSITION_MAP = [
  [CEO_POSITION_KEYWORDS.GENERAL_DIRECTOR, OrganizationSignerPositionType.GENERAL_DIRECTOR],
  [CEO_POSITION_KEYWORDS.EXECUTIVE_DIRECTOR, OrganizationSignerPositionType.EXECUTIVE_DIRECTOR],
  [CEO_POSITION_KEYWORDS.MANAGING_DIRECTOR, OrganizationSignerPositionType.MANAGING_DIRECTOR],
  [CEO_POSITION_KEYWORDS.FINANCE_DIRECTOR, OrganizationSignerPositionType.FINANCE_DIRECTOR],
  [CEO_POSITION_KEYWORDS.COMMERCIAL_DIRECTOR, OrganizationSignerPositionType.COMMERCIAL_DIRECTOR],
  [CEO_POSITION_KEYWORDS.CHIEF_ACCOUNTANT, OrganizationSignerPositionType.CHIEF_ACCOUNTANT],
] as const;

export class CeoPositionMapper {
  private static readonly logger: Logger = new Logger(CeoPositionMapper.name);

  static map(position: string): OrganizationSignerPositionType | undefined {
    const positionLower = position.toLowerCase();

    for (const [keywords, signerPosition] of CEO_POSITION_ORGANIZATION_SIGNER_POSITION_MAP) {
      if (keywords.some((keyword: string) => positionLower.includes(keyword.toLowerCase()))) {
        return signerPosition;
      }
    }

    this.logger.debug(`Unknown CEO position from Kontur, using GENERAL_DIRECTOR as default: ${position}`);
    return OrganizationSignerPositionType.GENERAL_DIRECTOR;
  }
}
