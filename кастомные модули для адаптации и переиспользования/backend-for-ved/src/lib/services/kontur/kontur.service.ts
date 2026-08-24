import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { IKonturService, IKonturOrganizationData } from './kontur.service.interface';
import { firstValueFrom } from 'rxjs';
import {
  KONTUR_API_ENDPOINT,
  KONTUR_HTTP_HEADERS,
  KONTUR_HTTP_CONFIG,
  KONTUR_ACTIVE_STATUS_RU,
  OGRN_PATTERN,
  KPP_PATTERN,
} from './kontur.constants';
import { IKonturApiResponse, IKonturUlData, IKonturIpData } from './kontur.types';
import { isNonEmptyString } from './utils/kontur-data.utils';
import { BusinessFormMapper } from './mappers/business-form.mapper';
import { CeoPositionMapper } from './mappers/ceo-position.mapper';
import { OrganizationBusinessFormType, OrganizationSignerPositionType } from 'lib/enums/models/organization.enums';

@Injectable()
export class KonturService implements IKonturService {
  private readonly logger: Logger = new Logger(KonturService.name);

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {}

  async fetchOrganizationByInn(inn: string): Promise<IKonturOrganizationData | null> {
    const config = this.getKonturConfig();
    if (!config) {
      return null;
    }

    try {
      this.logger.debug(`Fetching organization data for INN: ${inn}`);

      const responseData = await this.makeKonturApiRequest(inn, config);
      if (!responseData) {
        return null;
      }

      return this.parseKonturResponse(responseData, inn);
    } catch (error: unknown) {
      this.handleKonturApiError(error, inn);
      return null;
    }
  }

  private getKonturConfig(): { apiKey: string; apiUrl: string; timeout: number } | null {
    const { apiKey, apiUrl, timeout } = this.configService.get('kontur');

    if (!apiKey || !apiUrl) {
      this.logger.warn('Kontur API configuration is missing (KONTUR_API_KEY or KONTUR_API_URL not set)');
      return null;
    }

    return { apiKey, apiUrl, timeout };
  }

  private async makeKonturApiRequest(
    inn: string,
    config: { apiKey: string; apiUrl: string; timeout: number },
  ): Promise<unknown | null> {
    const url = `${config.apiUrl}${KONTUR_API_ENDPOINT}`;
    const fullUrl = `${url}?key=${encodeURIComponent(config.apiKey)}&inn=${encodeURIComponent(inn)}`;

    const response = await firstValueFrom(
      this.httpService.get(fullUrl, {
        timeout: config.timeout,
        headers: KONTUR_HTTP_HEADERS,
        ...KONTUR_HTTP_CONFIG,
      }),
    );

    if (!response?.data) {
      this.logger.warn(`No data received from Kontur API for INN: ${inn}`);
      return null;
    }

    return response.data;
  }

  private parseKonturResponse(data: unknown, inn: string): IKonturOrganizationData | null {
    if (!Array.isArray(data) || data.length === 0) {
      this.logger.warn(`No organizations found in Kontur API response for INN: ${inn}`);
      return null;
    }

    const firstOrg = data[0] as IKonturApiResponse;
    if (typeof firstOrg !== 'object' || firstOrg === null) {
      this.logger.error(`Invalid organization data format from Kontur API for INN: ${inn}`, { firstOrg });
      return null;
    }

    if (firstOrg.UL && typeof firstOrg.UL === 'object') {
      this.logger.debug(`Parsing as UL (Legal Entity) for INN: ${inn}`);
      return this.parseUlOrganizationData(firstOrg, firstOrg.UL as IKonturUlData, inn);
    }

    if (firstOrg.IP && typeof firstOrg.IP === 'object') {
      this.logger.debug(`Parsing as IP (Individual Entrepreneur) for INN: ${inn}`);
      return this.parseIpOrganizationData(firstOrg, firstOrg.IP as IKonturIpData, inn);
    }

    this.logger.error(`No UL or IP data found in Kontur API response for INN: ${inn}`);
    return null;
  }

  private handleKonturApiError(error: unknown, inn: string): void {
    if (isAxiosError(error)) {
      if (error.response?.status === 404) {
        this.logger.error(
          `Kontur API endpoint returned 404 for INN: ${inn}. ` +
            `This indicates API configuration issue (wrong URL or endpoint path), not missing organization.`,
          {
            url: error.config?.url,
            status: 404,
          },
        );
      } else {
        this.logger.error(`Kontur API request failed for INN: ${inn}`, {
          message: error.message,
          status: error.response?.status,
          responseData: error.response?.data,
        });
      }
    } else {
      this.logger.error(`Unexpected error fetching from Kontur for INN: ${inn}`, { error });
    }
  }

  private parseUlOrganizationData(
    topLevel: IKonturApiResponse,
    ulData: IKonturUlData,
    inn: string,
  ): IKonturOrganizationData {
    const result: IKonturOrganizationData = {
      inn,
    };

    const ogrn = this.extractOgrn(topLevel, inn);
    if (ogrn) {
      result.ogrn = ogrn;
    }

    const kpp = this.extractKpp(ulData, inn);
    if (kpp) {
      result.kpp = kpp;
    }

    const status = this.extractStatus(ulData, inn);
    if (status) {
      result.statusString = status.statusString;
      result.isActive = status.isActive;
    }

    const headData = this.extractHeadData(ulData, inn);
    if (headData) {
      result.ceoName = headData.ceoName;
      result.ceoPosition = headData.ceoPosition;
    }

    const legalAddress = ulData.legalAddress?.parsedAddressRF?.oneLineFormatOfAddress;
    if (isNonEmptyString(legalAddress)) {
      result.legalAddress = legalAddress;
    }

    if (ulData.legalName && typeof ulData.legalName === 'object') {
      if (ulData.legalName.full && typeof ulData.legalName.full === 'string') {
        result.fullName = ulData.legalName.full;
      }

      if (ulData.legalName.short && typeof ulData.legalName.short === 'string') {
        result.name = ulData.legalName.short;
      }
    }

    if (ulData.opf && typeof ulData.opf === 'string') {
      result.businessForm = BusinessFormMapper.map(ulData.opf);
    }

    return result;
  }

  private parseIpOrganizationData(
    topLevel: IKonturApiResponse,
    ipData: IKonturIpData,
    inn: string,
  ): IKonturOrganizationData {
    const result: IKonturOrganizationData = {
      inn,
      businessForm: OrganizationBusinessFormType.IP,
    };

    const ogrn = this.extractOgrn(topLevel, inn);
    if (ogrn) {
      result.ogrn = ogrn;
    }

    if (ipData.fio && typeof ipData.fio === 'string') {
      result.fullName = ipData.fio;
      result.name = ipData.fio;
      result.ceoName = ipData.fio;
    }

    if (ipData.status && typeof ipData.status === 'object') {
      if (ipData.status.statusString && typeof ipData.status.statusString === 'string') {
        result.statusString = ipData.status.statusString;
      }

      result.isActive = ipData.status.dissolved === false;
    }

    return result;
  }

  private extractOgrn(topLevel: IKonturApiResponse, inn: string): string | undefined {
    if (topLevel.ogrn && typeof topLevel.ogrn === 'string') {
      if (OGRN_PATTERN.test(topLevel.ogrn)) {
        return topLevel.ogrn;
      }
      this.logger.warn(`Invalid OGRN format from Kontur API: ${topLevel.ogrn}`, { inn });
    }
    return undefined;
  }

  private extractKpp(ulData: IKonturUlData, inn: string): string | undefined {
    if (ulData.kpp && typeof ulData.kpp === 'string') {
      if (KPP_PATTERN.test(ulData.kpp)) {
        return ulData.kpp;
      }
      this.logger.warn(`Invalid KPP format from Kontur API: ${ulData.kpp}`, { inn });
    }
    return undefined;
  }

  private extractStatus(ulData: IKonturUlData, inn: string): { statusString: string; isActive: boolean } | undefined {
    if (!ulData.status || typeof ulData.status !== 'object') {
      this.logger.debug(`No status object found in UL data for INN: ${inn}`);
      return undefined;
    }

    if (!ulData.status.statusString || typeof ulData.status.statusString !== 'string') {
      this.logger.debug(`No statusString found in UL.status for INN: ${inn}`);
      return undefined;
    }

    const isActive = ulData.status.statusString.toLowerCase() === KONTUR_ACTIVE_STATUS_RU;
    this.logger.debug(`Organization status for INN ${inn}: ${ulData.status.statusString} (active: ${isActive})`);

    return {
      statusString: ulData.status.statusString,
      isActive,
    };
  }

  private extractHeadData(
    ulData: IKonturUlData,
    inn: string,
  ): { ceoName: string; ceoPosition: OrganizationSignerPositionType | undefined } | undefined {
    if (!Array.isArray(ulData.heads) || ulData.heads.length === 0) {
      this.logger.debug(`No heads array found in UL data for INN: ${inn}`);
      return undefined;
    }

    const firstHead = ulData.heads[0];
    if (!firstHead || typeof firstHead !== 'object') {
      this.logger.warn(`Invalid head data structure for INN: ${inn}`);
      return undefined;
    }

    if (!firstHead.fio || typeof firstHead.fio !== 'string') {
      this.logger.warn(`No FIO found for head of organization with INN: ${inn}`);
      return undefined;
    }

    const ceoPosition =
      firstHead.position && typeof firstHead.position === 'string'
        ? CeoPositionMapper.map(firstHead.position)
        : undefined;

    this.logger.debug(`Extracted head data for INN ${inn}: ${firstHead.fio} (position: ${ceoPosition || 'unknown'})`);

    return {
      ceoName: firstHead.fio,
      ceoPosition,
    };
  }
}
