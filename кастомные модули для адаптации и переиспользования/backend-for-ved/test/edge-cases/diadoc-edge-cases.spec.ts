/**
 * VF-2: Edge case tests for Diadoc integration
 * Tests unusual and boundary conditions
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('Diadoc Edge Cases', () => {
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

  describe('Large Files', () => {
    it('should handle large files (up to reasonable limit)', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const result = await service.uploadDocument(
        largeBuffer,
        'large-file.pdf',
        'application/pdf',
      );

      expect(result.messageId).toBeDefined();
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should handle minimum file size', async () => {
      const smallBuffer = Buffer.from('x');
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const result = await service.uploadDocument(smallBuffer, 'small.pdf', 'application/pdf');

      expect(result.messageId).toBeDefined();
    });
  });

  describe('Special Characters in Filenames', () => {
    const testFilenames = [
      'договор (копия).pdf',
      'отчёт_2024.pdf',
      'file-with-dashes.pdf',
      'file.with.dots.pdf',
      'файл с пробелами.pdf',
      'UPPERCASE.PDF',
      'mixed_Case-name.pdf',
      '123_numeric_start.pdf',
    ];

    testFilenames.forEach((filename) => {
      it(`should handle filename: ${filename}`, async () => {
        mockHttpService.post.mockReturnValueOnce(
          of(createMockAxiosResponse({ MessageId: 'test-id' })),
        );

        const buffer = Buffer.from('test');
        const result = await service.uploadDocument(buffer, filename, 'application/pdf');

        expect(result.messageId).toBeDefined();
        const callArgs = mockHttpService.post.mock.calls[0];
        const requestBody = callArgs[1];
        expect(requestBody.DocumentAttachments[0].FileName).toBe(filename);
      });
    });
  });

  describe('Invalid INN', () => {
    it('should handle invalid INN format', async () => {
      const invalidInn = '123'; // Too short
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Organizations: [] })),
      );

      const result = await service.getOrganizationsByInn(invalidInn);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle empty INN', async () => {
      const emptyInn = '';
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Organizations: [] })),
      );

      const result = await service.getOrganizationsByInn(emptyInn);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Duplicate Operations', () => {
    it('should handle duplicate document uploads', async () => {
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      const result1 = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      const result2 = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result1.messageId).toBeDefined();
      expect(result2.messageId).toBeDefined();
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Unicode in Filenames', () => {
    it('should handle Unicode characters in filenames', async () => {
      const unicodeFilename = 'документ_№123_тест.pdf';
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, unicodeFilename, 'application/pdf');

      expect(result.messageId).toBeDefined();
      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[1].DocumentAttachments[0].FileName).toBe(unicodeFilename);
    });
  });
});
