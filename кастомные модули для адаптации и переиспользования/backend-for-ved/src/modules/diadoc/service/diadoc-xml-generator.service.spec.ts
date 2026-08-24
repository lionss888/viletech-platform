/**
 * VF-2: Тесты для сервиса генерации XML документов
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DiadocXmlGeneratorService } from './diadoc-xml-generator.service';
import { DiadocXmlDocumentType, DiadocDocumentFunction } from '../types/diadoc-api.types';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { FormPaymentStatus, FormPaymentDirection } from '../../../lib/enums/models/form-payment.enums';

describe('DiadocXmlGeneratorService', () => {
  let service: DiadocXmlGeneratorService;

  // Мок для FormPayment
  const createMockFormPayment = (overrides: Partial<IFormPayment> = {}): IFormPayment => ({
    _id: 'test-form-payment-id',
    uid: 12345,
    status: FormPaymentStatus.SIGNING_ORDER,
    prevStatus: FormPaymentStatus.FORM_ACCEPTED,
    stage: 'signing_order' as any,
    direction: FormPaymentDirection.IMPORT,
    account: 'test-account-id',
    totals: {
      amount: 10000000, // 100 000 руб в копейках
    },
    currency: {
      client: 'RUB' as any,
      counterparty: 'USD' as any,
    },
    organization: {
      _id: 'test-org-id',
      inn: '7707083893',
      kpp: '773301001',
      name: 'ООО Тестовая организация',
      fullName: 'Общество с ограниченной ответственностью "Тестовая организация"',
      address: 'г. Москва, ул. Тестовая, д. 1',
      legalAddress: 'г. Москва, ул. Тестовая, д. 1',
      isChanged: false,
    } as any,
    agent: {
      _id: 'test-agent-id',
      inn: '7728168971',
      kpp: '772801001',
      name: 'ООО Агент',
      fullName: 'Общество с ограниченной ответственностью "Агент"',
      address: 'г. Москва, ул. Агентская, д. 2',
    } as any,
    invoices: [
      {
        uuid: 'test-invoice-uuid',
        contractNumber: 'TEST-2024-001',
        contractDate: new Date('2024-01-15'),
        invoiceNumber: 'INV-001',
        invoiceDate: new Date('2024-02-01'),
      },
    ],
    signingOrderCreateDate: new Date('2024-02-15'),
    createDate: new Date(),
    updateDate: new Date(),
    ...overrides,
  } as IFormPayment);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiadocXmlGeneratorService],
    }).compile();

    service = module.get<DiadocXmlGeneratorService>(DiadocXmlGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateXml', () => {
    it('should generate Invoice XML', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateXml(DiadocXmlDocumentType.INVOICE, formPayment);

      expect(result).toBeDefined();
      expect(result.documentType).toBe(DiadocXmlDocumentType.INVOICE);
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.fileName).toMatch(/^invoice_.*\.xml$/);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should generate Torg12 XML', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateXml(DiadocXmlDocumentType.TORG12, formPayment);

      expect(result).toBeDefined();
      expect(result.documentType).toBe(DiadocXmlDocumentType.TORG12);
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.fileName).toMatch(/^torg12_.*\.xml$/);
    });

    it('should generate AcceptanceCertificate XML', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateXml(DiadocXmlDocumentType.ACCEPTANCE_CERTIFICATE, formPayment);

      expect(result).toBeDefined();
      expect(result.documentType).toBe(DiadocXmlDocumentType.ACCEPTANCE_CERTIFICATE);
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.fileName).toMatch(/^act_.*\.xml$/);
    });

    it('should generate UniversalTransferDocument (УПД) XML', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateXml(DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT, formPayment);

      expect(result).toBeDefined();
      expect(result.documentType).toBe(DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT);
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.fileName).toMatch(/^upd_.*\.xml$/);
    });

    it('should generate XmlTorg12 XML', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateXml(DiadocXmlDocumentType.XML_TORG12, formPayment);

      expect(result).toBeDefined();
      expect(result.documentType).toBe(DiadocXmlDocumentType.XML_TORG12);
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should generate XmlAcceptanceCertificate XML', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateXml(DiadocXmlDocumentType.XML_ACCEPTANCE_CERTIFICATE, formPayment);

      expect(result).toBeDefined();
      expect(result.documentType).toBe(DiadocXmlDocumentType.XML_ACCEPTANCE_CERTIFICATE);
      expect(result.xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should throw BadRequestException for unsupported document type', async () => {
      const formPayment = createMockFormPayment();

      await expect(
        service.generateXml('UnsupportedType' as DiadocXmlDocumentType, formPayment),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateInvoice', () => {
    it('should generate valid Invoice XML with seller and buyer info', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateInvoice(formPayment);

      expect(result.xmlContent).toContain('Продавец');
      expect(result.xmlContent).toContain('Покупатель');
      expect(result.xmlContent).toContain('7728168971'); // Agent INN
      expect(result.xmlContent).toContain('7707083893'); // Organization INN
    });

    it('should include contract reference if available', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateInvoice(formPayment);

      expect(result.xmlContent).toContain('TEST-2024-001');
    });
  });

  describe('generateUniversalTransferDocument', () => {
    it('should generate УПД with default function SCHFDOP', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateUniversalTransferDocument(formPayment);

      expect(result.xmlContent).toContain('СЧФДОП');
    });

    it('should generate УПД with specified function', async () => {
      const formPayment = createMockFormPayment();
      const result = await service.generateUniversalTransferDocument(formPayment, DiadocDocumentFunction.DOP);

      expect(result.xmlContent).toContain('ДОП');
    });
  });

  describe('prepareDocumentData', () => {
    it('should extract seller organization from agent', async () => {
      const formPayment = createMockFormPayment();
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.seller.inn).toBe('7728168971');
      expect(data.seller.fullName).toContain('Агент');
    });

    it('should extract buyer organization from organization', async () => {
      const formPayment = createMockFormPayment();
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.buyer.inn).toBe('7707083893');
      expect(data.buyer.fullName).toContain('Тестовая организация');
    });

    it('should throw BadRequestException if agent is missing', async () => {
      const formPayment = createMockFormPayment({ agent: undefined });

      expect(() =>
        service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if organization is missing', async () => {
      const formPayment = createMockFormPayment({ organization: undefined });

      expect(() =>
        service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE),
      ).toThrow(BadRequestException);
    });

    it('should extract invoice items from invoices', async () => {
      const formPayment = createMockFormPayment();
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.items.length).toBeGreaterThan(0);
    });

    it('should create default item if no invoices', async () => {
      const formPayment = createMockFormPayment({ invoices: [] });
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.items.length).toBe(1);
      expect(data.items[0].name).toContain('Услуги по агентскому договору');
    });

    it('should calculate totals correctly', async () => {
      const formPayment = createMockFormPayment();
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.totalAmountWithVat).toBeGreaterThan(0);
    });

    it('should extract contract reference if available', async () => {
      const formPayment = createMockFormPayment();
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.contractReference).toBeDefined();
      expect(data.contractReference?.number).toBe('TEST-2024-001');
    });

    it('should extract principal order reference if available', async () => {
      const formPayment = createMockFormPayment();
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT);

      expect(data.principalOrderReference).toBeDefined();
    });
  });

  describe('Currency handling', () => {
    it('should use RUB currency code for RUB', async () => {
      const formPayment = createMockFormPayment({
        currency: { client: 'RUB' as any, counterparty: 'USD' as any },
      });
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.currencyCode).toBe('643');
    });

    it('should use USD currency code for USD', async () => {
      const formPayment = createMockFormPayment({
        currency: { client: 'USD' as any, counterparty: 'USD' as any },
      });
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.currencyCode).toBe('840');
    });

    it('should use EUR currency code for EUR', async () => {
      const formPayment = createMockFormPayment({
        currency: { client: 'EUR' as any, counterparty: 'EUR' as any },
      });
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.currencyCode).toBe('978');
    });
  });

  describe('XML escaping', () => {
    it('should escape special XML characters in organization names', async () => {
      const formPayment = createMockFormPayment({
        organization: {
          _id: 'test-org-id',
          inn: '7707083893',
          name: 'ООО "Тест & Компания"',
          fullName: 'ООО "Тест & Компания"',
          isChanged: false,
        } as any,
      });
      const result = await service.generateInvoice(formPayment);

      expect(result.xmlContent).toContain('&amp;');
      expect(result.xmlContent).not.toContain('& ');
    });
  });

  describe('Document number generation', () => {
    it('should generate document number with uid and date', async () => {
      const formPayment = createMockFormPayment({ uid: 99999 });
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.documentNumber).toContain('99999');
    });

    it('should use _id if uid is not available', async () => {
      const formPayment = createMockFormPayment({ uid: undefined });
      const data = service.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);

      expect(data.documentNumber).toContain('test-form-payment-id');
    });
  });
});
