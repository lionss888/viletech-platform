/**
 * VF-2: Tests for Diadoc Webhook Structure Compliance
 * Based on: https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { validate } from 'class-validator';
import { DiadocWebhookDto } from '../../src/modules/diadoc/dto/diadoc-webhook.dto';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';

describe('Diadoc Webhook Structure Compliance', () => {
  describe('Required Fields', () => {
    it('should require documentId in webhook payload', async () => {
      const dto = new DiadocWebhookDto();
      dto.status = DiadocDocumentStatus.SIGNED;
      // documentId is missing

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'documentId')).toBe(true);
    });

    it('should require status in webhook payload', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'test-doc-id';
      // status is missing

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'status')).toBe(true);
    });

    it('should validate documentId is non-empty string', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = '';
      dto.status = DiadocDocumentStatus.SIGNED;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid webhook payload', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'valid-doc-id';
      dto.status = DiadocDocumentStatus.SIGNED;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Optional Fields', () => {
    it('should optionally include messageId', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'doc-id';
      dto.status = DiadocDocumentStatus.SIGNED;
      dto.messageId = 'message-id';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.messageId).toBe('message-id');
    });

    it('should handle webhook without optional fields', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'doc-id';
      dto.status = DiadocDocumentStatus.SIGNED;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.messageId).toBeUndefined();
    });

    it('should optionally include timestamp', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'doc-id';
      dto.status = DiadocDocumentStatus.SIGNED;
      dto.timestamp = new Date().toISOString();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.timestamp).toBeDefined();
    });
  });

  describe('Status Values', () => {
    const validStatuses = [
      DiadocDocumentStatus.DRAFT,
      DiadocDocumentStatus.SENT,
      DiadocDocumentStatus.SIGNED,
      DiadocDocumentStatus.REJECTED,
      DiadocDocumentStatus.CANCELLED,
    ];

    validStatuses.forEach((status) => {
      it(`should accept ${status} as valid status`, async () => {
        const dto = new DiadocWebhookDto();
        dto.documentId = 'doc-id';
        dto.status = status;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    it('should reject invalid status values', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'doc-id';
      (dto as any).status = 'INVALID_STATUS';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'status')).toBe(true);
    });
  });

  describe('Field Types', () => {
    it('should validate documentId is string', async () => {
      const dto = new DiadocWebhookDto();
      (dto as any).documentId = 123;
      dto.status = DiadocDocumentStatus.SIGNED;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate messageId is string when provided', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'doc-id';
      dto.status = DiadocDocumentStatus.SIGNED;
      (dto as any).messageId = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate timestamp is ISO date string when provided', async () => {
      const dto = new DiadocWebhookDto();
      dto.documentId = 'doc-id';
      dto.status = DiadocDocumentStatus.SIGNED;
      (dto as any).timestamp = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
