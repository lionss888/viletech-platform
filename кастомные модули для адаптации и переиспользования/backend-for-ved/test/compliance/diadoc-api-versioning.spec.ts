/**
 * VF-2: Tests for Diadoc API Versioning Compliance
 * Based on: https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Diadoc API Versioning Compliance', () => {
  let service: DiadocService;
  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'diadoc') {
        return {
          enabled: true,
          apiUrl: 'https://diadoc-api.kontur.ru',
          apiClientId: 'test-api-client-id',
          authToken: 'test-auth-token',
          boxId: 'test-box-id',
          maxRetries: 0,
        };
      }
      return null;
    }),
  };

  const mockXmlGeneratorService = {
    generatePaymentOrderXml: jest.fn(),
    generateReportXml: jest.fn(),
    generateContractXml: jest.fn(),
  };

  const createMockAxiosResponse = <T>(data: T): Partial<AxiosResponse<T>> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DIADOC_SERVICE,
          useClass: DiadocService,
        },
        DiadocService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DiadocXmlGeneratorService,
          useValue: mockXmlGeneratorService,
        },
      ],
    }).compile();

    service = module.get<DiadocService>(DIADOC_SERVICE);
    jest.clearAllMocks();
  });

  describe('Current Version Usage', () => {
    it('should use V3 as current API version for PostMessage', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[0]).toMatch(/\/V3\/PostMessage/);
    });

    it('should use V3 for all endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.getDocumentStatus('test-id');

      const allCalls = [
        ...mockHttpService.post.mock.calls,
        ...mockHttpService.get.mock.calls,
      ];

      allCalls.forEach((call) => {
        expect(call[0]).toMatch(/\/V3\//);
      });
    });

    it('should use consistent version across all endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.getDocumentStatus('test-id');

      const allCalls = [
        ...mockHttpService.post.mock.calls,
        ...mockHttpService.get.mock.calls,
      ];

      const versions = allCalls.map((call) => {
        const match = call[0].match(/\/V(\d+)\//);
        return match ? match[1] : null;
      });

      const uniqueVersions = [...new Set(versions)];
      expect(uniqueVersions.length).toBe(1);
      expect(uniqueVersions[0]).toBe('3');
    });
  });

  describe('Deprecated Version Detection', () => {
    it('should not use deprecated V2 endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[0]).not.toContain('/V2/');
    });

    it('should not use deprecated V1 endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[0]).not.toContain('/V1/');
    });

    it('should use versioned endpoints (not unversioned)', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[0]).toMatch(/^https:\/\/.*\/V\d+\//);
    });
  });
});
