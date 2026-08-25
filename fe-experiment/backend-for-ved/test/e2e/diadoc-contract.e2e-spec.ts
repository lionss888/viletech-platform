/**
 * VF-2: E2E tests for Diadoc contract flow
 * Tests the complete flow of sending a contract for signing via Diadoc
 */
import { app, request, mockDiadocService } from '../setup/e2e-setup';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';
import { ContractStatus } from '../../src/lib/enums/models/contract.enums';
import mongoose from 'mongoose';

describe('Diadoc Contract E2E Flow', () => {
  describe('Contract Webhook Processing', () => {
    it('should process webhook for signed contract', async () => {
      const webhookPayload = {
        documentId: 'contract-doc-id',
        status: DiadocDocumentStatus.SIGNED,
        messageId: 'contract-msg-id',
      };

      mockDiadocService.getSignedDocument.mockResolvedValueOnce(Buffer.from('signed-contract-content'));

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should process webhook for rejected contract', async () => {
      const webhookPayload = {
        documentId: 'contract-doc-id-rejected',
        status: DiadocDocumentStatus.REJECTED,
        rejectionReason: 'Contract terms not acceptable',
      };

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should process webhook for cancelled contract', async () => {
      const webhookPayload = {
        documentId: 'contract-doc-id-cancelled',
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

  describe('Contract Status Flow', () => {
    it('should handle contract status transitions', async () => {
      const statuses = [
        DiadocDocumentStatus.DRAFT,
        DiadocDocumentStatus.SENT,
        DiadocDocumentStatus.SIGNED,
      ];

      for (const status of statuses) {
        const webhookPayload = {
          documentId: 'contract-doc-id',
          status,
        };

        const response = await request(app.getHttpServer())
          .post('/api/1.0/diadoc/webhook')
          .send(webhookPayload)
          .set('X-Diadoc-Webhook-Secret', process.env.DIADOC_WEBHOOK_SECRET || 'test-secret')
          .expect(200);

        expect(response.body).toHaveProperty('success');
      }
    });
  });
});
