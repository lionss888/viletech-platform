import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';

@Injectable()
export class CryptoAuthService {
  private readonly logger: Logger = new Logger('CryptoAuthService');
  readonly storageClient;

  private expiresToken: number = 0;
  private _token: { timeout: any; token: string } = { timeout: undefined, token: undefined };

  get token() {
    return this._token.token;
  }

  async me(token: string) {
    const { meUrl } = this.configService.get('crypto360.auth');

    try {
      const result: AxiosResponse = await this.httpService
        .get(meUrl, {
          headers: {
            authorization: token,
          },
        })
        .toPromise();

      return result.data;
    } catch (e) {
      this.logger.error(JSON.stringify(e.response?.data || e.message || e));
      throw new UnauthorizedException();
    }
  }

  // set token(token: string) {
  //   clearTimeout(this._token.timeout);
  //   this._token.token = token;
  //   this._token.timeout = setTimeout(() => {
  //     this.auth();
  //   }, this.expiresToken);
  // }

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.storageClient = '';
  }

  // onApplicationBootstrap() {
  //   // this.auth();
  // }

  // async auth() {
  //   try {
  //     const { login, password, authUrl } = this.configService.get('storage.auth');
  //
  //     const result: AxiosResponse = await this.httpService
  //       .get(authUrl, {
  //         headers: {
  //           'X-Auth-User': login,
  //           'X-Auth-Key': password,
  //         },
  //       })
  //       .toPromise();
  //
  //     this.expiresToken = parseInt(result.headers['x-expire-auth-token'], 10) * 1000;
  //     this.token = result.headers['x-auth-token'];
  //   } catch (e) {
  //     this.logger.error(JSON.stringify(e.response?.data || e.message || e));
  //   }
  // }
}
