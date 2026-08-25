import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

describe('S3Service local MinIO config', () => {
  const previous = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    BUCKET_NAME: process.env.BUCKET_NAME,
  };

  afterEach(() => {
    process.env.AWS_ACCESS_KEY_ID = previous.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = previous.AWS_SECRET_ACCESS_KEY;
    process.env.S3_ENDPOINT = previous.S3_ENDPOINT;
    process.env.BUCKET_NAME = previous.BUCKET_NAME;
  });

  it('builds S3Client with path-style endpoint for MinIO', () => {
    process.env.AWS_ACCESS_KEY_ID = 'minioadmin';
    process.env.AWS_SECRET_ACCESS_KEY = 'minioadmin';
    process.env.S3_ENDPOINT = 'http://127.0.0.1:9000';
    process.env.BUCKET_NAME = 'fea360';
    const configService = {
      get: (key: string) => {
        if (key === 's3.region') {
          return 'us-east-1';
        }
        if (key === 's3.endpoint') {
          return 'http://127.0.0.1:9000';
        }
        if (key === 's3.bucketName') {
          return 'fea360';
        }
        return undefined;
      },
    } as ConfigService;
    const shutdownService = { shutdown: jest.fn() };
    const service = new S3Service(configService, shutdownService as never);
    expect(service.s3Client).toBeDefined();
    const config = service.s3Client.config;
    expect(config.forcePathStyle).toBe(true);
  });
});
