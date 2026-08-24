import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { IOcrService, IRecognizeAsync, ITryGetRecognitionOptions } from './ocr.service.interface';
import * as _ from 'lodash';
import { sleep } from '../../utils/sleep';
import { MimeTypes } from '../../enums/common.enums';

@Injectable()
export class OcrService implements IOcrService {
  private readonly logger: Logger = new Logger(OcrService.name);
  isAvailable: boolean = false;
  private authTimeout: any;

  private expiresToken: number = 0;
  private _token: { timeout: any; token: string } = { timeout: undefined, token: undefined };

  get token() {
    return this._token.token;
  }

  set token(token: string) {
    clearTimeout(this._token.timeout);
    this._token.token = token;
    this._token.timeout = setTimeout(() => {
      this.auth();
    }, this.expiresToken);
  }

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    if (this.configService.get('ocr.authToken')) {
      this.auth()
        .then()
        .catch((e) => this.logger.error(JSON.stringify(e.response?.data || e.message || e)));
    }
  }

  async recognizeTextAsync(data: IRecognizeAsync) {
    if (!this.isAvailable) {
      this.logger.warn('OCR service not available, skipping recognition');
      return null;
    }

    const { baseApiUrl, folderId } = this.configService.get('ocr');

    const url = baseApiUrl + '/recognizeTextAsync';

    try {
      const result = await this.httpService
        .post(url, data, {
          headers: {
            Authorization: 'Bearer ' + this.token,
            'x-folder-id': folderId,
            'x-data-logging-enabled': true,
          },
        })
        .toPromise();

      return result.data;
    } catch (e) {
      const errorData = e.response?.data;
      if (errorData && typeof errorData === 'string' && errorData.includes('<html>')) {
        this.logger.error('OCR recognition failed with 400 Bad Request - token may have expired');
      } else {
        this.logger.error(JSON.stringify(errorData || e.message || e));
      }
    }
  }

  async getRecognition(operationId: string) {
    const { baseApiUrl, folderId } = this.configService.get('ocr');

    const url = baseApiUrl + '/getRecognition';

    const result = await this.httpService
      .get(url, {
        params: { operationId },
        headers: {
          Authorization: 'Bearer ' + this.token,
          'Content-Type': MimeTypes.JSON,
          'x-folder-id': folderId,
          'x-data-logging-enabled': true,
        },
      })
      .toPromise();

    const data = [];

    if (_.isString(result.data)) {
      _.each(result.data.split('\n'), (chunk) => {
        if (chunk.length) {
          data.push(JSON.parse(chunk));
        }
      });

      return data;
    }

    return [result.data];
  }

  async tryGetRecognition(operationId: string, options?: ITryGetRecognitionOptions): Promise<any> {
    let recognition: any;
    let timeout = 1000;
    const maxAttempts = options?.maxAttempts ?? 50;
    let attempt = 0;

    while (!recognition && attempt < maxAttempts) {
      try {
        recognition = await this.getRecognition(operationId);
      } catch (err) {
        this.logger.error(JSON.stringify(err.response?.data || err.message || err));

        if (err.response?.data?.error?.message.includes('not ready')) {
          await sleep(timeout);
        } else {
          break;
        }

        attempt++;
        timeout += options?.timeoutIncrement ?? 500;
      }
    }

    return recognition;
  }

  parseRecognition(recognition: any): any[] {
    const lines: any[] = [];

    const recursive = (object) => {
      Object.keys(object).forEach((key) => {
        if (key === 'lines') {
          lines.push(..._.map(object[key], 'text'));
          return;
        }

        if (object[key] && typeof object[key] === 'object') {
          return recursive(object[key]);
        }
      });
    };

    recursive(recognition);

    return lines;
  }

  private attempt = 1;

  async auth() {
    try {
      const { authUrl, authToken, folderId } = this.configService.get('ocr');

      if (!authToken) {
        this.logger.warn('OCR_AUTH_TOKEN not configured, OCR service disabled');
        this.isAvailable = false;
        return;
      }

      if (!folderId) {
        this.logger.warn('OCR_FOLDER_ID not configured, OCR service disabled');
        this.isAvailable = false;
        return;
      }

      const result: AxiosResponse = await this.httpService
        .post(authUrl, { yandexPassportOauthToken: authToken })
        .toPromise();

      this.expiresToken = 1000 * 60 * 60; // раз в час
      this.token = result.data.iamToken;
      this.isAvailable = true;
      this.attempt = 1;
      this.logger.log('Service connected successfully');
    } catch (e) {
      this.isAvailable = false;
      const errorData = e.response?.data;
      if (errorData && typeof errorData === 'string' && errorData.includes('<html>')) {
        this.logger.error('OCR auth failed with 400 Bad Request - check OCR_AUTH_TOKEN validity');
      } else {
        this.logger.error(JSON.stringify(errorData || e.message || e));
      }

      let waitingTime = 5000;

      // первые пять попыток (по 10 раз) возводим в степень, иначе каждый час
      if (Math.ceil(this.attempt / 10) <= 5) {
        waitingTime = Math.pow(5, Math.ceil(this.attempt / 10)) * 1000;
      } else {
        waitingTime = 1000 * 60 * 60;
      }

      while (!this.isAvailable) {
        await sleep(waitingTime);
        this.attempt = this.attempt + 1;

        await this.auth();
      }
    }
  }
}
