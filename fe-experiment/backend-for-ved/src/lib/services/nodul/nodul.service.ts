import { Injectable, Logger } from '@nestjs/common';
import { INodulService } from './nodul.service.interface';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';

@Injectable()
export class NodulService implements INodulService {
  private readonly logger: Logger = new Logger(NodulService.name);

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {}

  async parseImage(formData: any): Promise<any> {
    const nodulSettings = this.configService.get('recognize.nodul');

    try {
      this.logger.log('Start request to Nodul');

      const response: AxiosResponse = await this.httpService
        .post(nodulSettings.url, formData, { ...formData.getHeaders() })
        .toPromise();

      this.logger.log('Finish request to Nodul');

      return response.data;
    } catch (err) {
      this.logger.error(JSON.stringify(err.response?.data || err.message || err));
      return null;
    }
  }
}
