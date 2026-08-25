import { Injectable, Logger } from '@nestjs/common';
import { IOrganization } from 'lib/interfaces/models/organization.interface';

export interface IProviderMatch extends IOrganization {
  matchCount: number;
}

@Injectable()
export class ProviderMatchingService {
  private readonly logger = new Logger(ProviderMatchingService.name);

  matchProvidersByHsCodes(hsCodes: string[], providers: IOrganization[]): IProviderMatch[] {
    if (!hsCodes || hsCodes.length === 0) {
      this.logger.debug('No HS codes provided for matching');
      return [];
    }

    const codeSet = new Set(hsCodes);
    const uniqueCodesArray = Array.from(codeSet);
    this.logger.debug(`Matching providers for HS codes: ${uniqueCodesArray.join(', ')}`);

    const matches = providers
      .filter((org) => (org.hsCodes && org.hsCodes.length > 0) || (org.hsCodePrefixes && org.hsCodePrefixes.length > 0))
      .map((org) => {
        const exactMatches = (org.hsCodes || []).filter((code) => codeSet.has(code)).length;

        const prefixMatches = (org.hsCodePrefixes || []).filter((prefix) =>
          uniqueCodesArray.some((code) => code.startsWith(prefix)),
        ).length;

        const matchCount = exactMatches + prefixMatches;

        return {
          ...org,
          matchCount,
        };
      })
      .filter((match) => match.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    this.logger.debug(`Found ${matches.length} matching providers for ${codeSet.size} codes`);

    return matches;
  }
}
