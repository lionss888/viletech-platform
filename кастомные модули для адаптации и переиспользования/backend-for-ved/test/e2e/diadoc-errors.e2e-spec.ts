/**
 * VF-2: E2E tests for Diadoc error handling
 * Tests various error scenarios in Diadoc integration
 */
import { app, request, mockDiadocService } from '../setup/e2e-setup';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';

describe('Diadoc Error Handling E2E', () => {
  describe('Webhook Error Scenarios', () => {
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

    it('should handle webhook authentication failure', async () => {
      const webhookPayload = {
        documentId: 'test-doc-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send(webhookPayload)
        .set('X-Diadoc-Webhook-Secret', 'invalid-secret')
        .expect(401);
    });
  });

  describe('Health Check Error Scenarios', () => {
    it('should handle health check when API is unreachable', async () => {
      mockDiadocService.checkHealth.mockResolvedValueOnce({
        enabled: true,
        configured: true,
        authenticated: false,
        apiReachable: false,
        error: 'Connection refused',
        lastCheck: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body.apiReachable).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle health check when authentication fails', async () => {
      mockDiadocService.checkHealth.mockResolvedValueOnce({
        enabled: true,
        configured: true,
        authenticated: false,
        apiReachable: true,
        error: 'Invalid credentials',
        lastCheck: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body.authenticated).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Metrics Error Scenarios', () => {
    it('should handle metrics request when service unavailable', async () => {
      mockDiadocService.getMetrics.mockRejectedValueOnce(new Error('Service unavailable'));

      // Should still return 200 with error handling
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
