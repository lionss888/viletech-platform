/**
 * VF-2: E2E tests for Diadoc webhook endpoint
 * Tests webhook processing with real HTTP requests
 */
import { app, request, mockDiadocService } from '../setup/e2e-setup';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';
import mongoose from 'mongoose';

describe('Diadoc Webhook E2E', () => {
  describe('Webhook Authentication', () => {
    it('should require webhook secret header', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .expect(401);
    });

    it('should accept valid webhook secret', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Webhook Payload Validation', () => {
    it('should validate required documentId field', async () => {
      const invalidPayload = {
        status: DiadocDocumentStatus.SIGNED,
        // Missing documentId
      };

      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(invalidPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(400);
    });

    it('should validate required status field', async () => {
      const invalidPayload = {
        documentId: 'test-doc-id',
        // Missing status
      };

      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(invalidPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(400);
    });

    it('should accept valid webhook payload', async () => {
      const validPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.SIGNED,
        messageId: 'test-msg-id',
        timestamp: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(validPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body.success).toBeDefined();
    });
  });

  describe('Webhook Status Processing', () => {
    it('should process SIGNED status', async () => {
      mockDiadocService.getSignedDocument.mockResolvedValueOnce(Buffer.from('signed-content'));

      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body.success).toBeDefined();
    });

    it('should process REJECTED status', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.REJECTED,
        rejectionReason: 'Invalid data',
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body.success).toBeDefined();
    });

    it('should process CANCELLED status', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.CANCELLED,
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body.success).toBeDefined();
    });
  });
});
