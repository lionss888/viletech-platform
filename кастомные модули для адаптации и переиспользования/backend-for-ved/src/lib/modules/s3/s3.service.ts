import { Inject, Injectable, Logger } from '@nestjs/common';
import { IListObjects, IS3Service } from './s3.service.interface';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { IShutdownService } from 'lib/modules/shutdown/shutdown.service.interface';

@Injectable()
export class S3Service implements IS3Service {
  private readonly logger: Logger = new Logger();
  readonly s3Client;
  private bucketName;

  constructor(
    private readonly configService: ConfigService,
    @Inject('IShutdownService') private readonly shutdownService: IShutdownService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get('s3.region'),
      endpoint: this.configService.get('s3.endpoint'),
    });
  }

  async onApplicationBootstrap() {
    // Проверяем dev режим более явно
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isDevelopment = nodeEnv === 'development' || nodeEnv !== 'production';
    
    if (
      (!process.env.S3_ENDPOINT && !process.env.AWS_ACCESS_KEY_ID) ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.BUCKET_NAME
    ) {
      if (!process.env.S3_ENDPOINT) {
        this.logger.error('not found env variable S3_ENDPOINT');
      }
      if (!process.env.AWS_ACCESS_KEY_ID) {
        this.logger.error('not found env variable AWS_ACCESS_KEY_ID');
      }
      if (!process.env.AWS_SECRET_ACCESS_KEY) {
        this.logger.error('not found env variable AWS_SECRET_ACCESS_KEY');
      }
      if (!process.env.BUCKET_NAME) {
        this.logger.error('not found env variable BUCKET_NAME');
      }

      if (isDevelopment) {
        // В dev режиме только предупреждаем
        this.logger.warn('S3 configuration is missing. S3Service will not be available in development mode.');
      } else {
        // В production режиме завершаем приложение
        this.logger.error('S3 configuration is required in production mode. Shutting down...');
        await this.shutdownService.shutdown();
      }
    } else {
      this.bucketName = this.configService.get('s3.bucketName');
    }
  }

  async listObjects(params: IListObjects) {
    try {
      const limit = params.limit > 0 && params.limit < 1000 ? params.limit : 1000;

      const command = new ListObjectsV2Command({
        Bucket: `${this.bucketName}`,
        MaxKeys: limit,
        Delimiter: params.delimiter,
        Prefix: params.prefix,
        ContinuationToken: params.nextToken,
      });

      return this.s3Client.send(command);
    } catch (e) {
      this.logger.error(e, e.stack);
    }
  }

  async upload(buffer, fileId: string) {
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: fileId,
      Body: buffer,
    };

    try {
      return await this.s3Client.send(new PutObjectCommand(uploadParams));
    } catch (err) {
      this.logger.error('Error s3 PutObjectCommand - ' + err);
      throw new Error('Failed to upload file');
    }
  }

  async getFile(fileName): Promise<GetObjectCommandOutput> {
    try {
      const bucketParams = {
        Bucket: this.bucketName,
        Key: fileName,
      };

      return this.s3Client.send(new GetObjectCommand(bucketParams));
    } catch (e) {
      this.logger.error(e, e.stack);
    }
  }

  async getFileString(fileName) {
    const object = await this.getFile(fileName);

    return this.streamToString(object.Body);
  }

  async getFileStream(fileName) {
    const object = await this.getFile(fileName);

    return object.Body;
  }

  private async streamToString(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteFile(pathName: string): Promise<void> {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: pathName,
      };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      this.logger.log(`Successfully deleted file from S3: ${pathName}`);
    } catch (err) {
      this.logger.error(`Error deleting file ${pathName} from S3: ${err.message}`);
    }
  }
}
