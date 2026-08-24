/**
 * VF-2: E2E tests for Diadoc health check and metrics endpoints
 */
import { app, request, mockDiadocService } from '../setup/e2e-setup';

describe('Diadoc Health and Metrics E2E', () => {
  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('configured');
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body).toHaveProperty('apiReachable');
    });

    it('should return enabled status when configured', async () => {
      mockDiadocService.checkHealth.mockResolvedValueOnce({
        enabled: true,
        configured: true,
        authenticated: true,
        apiReachable: true,
        lastCheck: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body.enabled).toBe(true);
      expect(response.body.configured).toBe(true);
    });

    it('should return error when API is unreachable', async () => {
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
  });

  describe('Metrics Endpoint', () => {
    it('should return metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body.current).toBeDefined();
    });

    it('should return document counts', async () => {
      mockDiadocService.getMetrics.mockResolvedValueOnce({
        documentsSent: {
          paymentOrder: 10,
          report: 5,
          contract: 3,
        },
        documentsSigned: 8,
        documentsRejected: 2,
        errors: {
          temporary: 1,
          permanent: 0,
          timeout: 0,
          auth: 0,
          rateLimit: 1,
        },
        requestDurations: {},
        lastUpdated: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body.current).toHaveProperty('documentsSent');
      expect(response.body.current).toHaveProperty('documentsSigned');
      expect(response.body.current).toHaveProperty('errors');
    });

    it('should return average request durations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('averageRequestDurations');
      expect(response.body.averageRequestDurations).toBeDefined();
    });
  });
});
