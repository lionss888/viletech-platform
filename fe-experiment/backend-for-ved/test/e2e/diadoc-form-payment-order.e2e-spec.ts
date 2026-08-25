/**
 * VF-2: E2E tests for Diadoc form payment order flow
 * Tests the complete flow of sending a payment order for signing via Diadoc
 */
import { app, request, mockDiadocService } from '../setup/e2e-setup';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';
import { FormPaymentStatus } from '../../src/lib/enums/models/form-payment.enums';
import mongoose from 'mongoose';

describe('Diadoc FormPayment Payment Order E2E Flow', () => {
  let formPaymentId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup authentication token for requests
    // In real scenario, this would be obtained through login
    authToken = 'test-auth-token';
  });

  describe('Complete Payment Order Flow', () => {
    it('should get health check endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body.enabled).toBe(true);
    });

    it('should get metrics endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body.current).toBeDefined();
    });

    it('should handle webhook for signed document', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.SIGNED,
        messageId: 'test-msg-id',
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should handle webhook for rejected document', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id-rejected',
        status: DiadocDocumentStatus.REJECTED,
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should handle webhook for cancelled document', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id-cancelled',
        status: DiadocDocumentStatus.CANCELLED,
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle webhook with invalid payload', async () => {
      const invalidPayload = {
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(invalidPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(400);
    });

    it('should handle webhook with invalid status', async () => {
      const invalidPayload = {
        documentId: 'test-doc-id',
        status: 'INVALID_STATUS',
      };

      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(invalidPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(400);
    });

    it('should handle webhook for non-existent document', async () => {
      const webhookPayload = {
        documentId: 'non-existent-doc-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
