/**
 * Tests for Mock Diadoc Server
 * 
 * Проверяет что Mock Server правильно имитирует Diadoc API.
 */
import { createMockDiadocServer, MockDiadocServer } from './diadoc-mock-server';
import axios from 'axios';

describe('Mock Diadoc Server', () => {
  let mockServer: MockDiadocServer;
  const port = 3998;
  const baseUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    mockServer = createMockDiadocServer(port);
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  afterEach(() => {
    mockServer.clearRequests();
  });

  describe('Authentication', () => {
    it('should return auth token on POST /Authenticate', async () => {
      const response = await axios.post(`${baseUrl}/Authenticate`, {}, {
        headers: {
          'Authorization': 'DiadocAuth ddauth_api_client_id=test',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toContain('mock-auth-token');
    });

    it('should reject requests without Authorization header', async () => {
      try {
        await axios.get(`${baseUrl}/V3/GetMessage`);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Post Message', () => {
    it('should return MessageId on POST /V3/PostMessage', async () => {
      const response = await axios.post(
        `${baseUrl}/V3/PostMessage`,
        { FromBoxId: 'test-box', DocumentAttachments: [] },
        {
          headers: {
            'Authorization': 'DiadocAuth ddauth_api_client_id=test,ddauth_token=token',
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('MessageId');
      expect(response.data).toHaveProperty('Entities');
    });

    it('should record request details', async () => {
      const payload = { FromBoxId: 'test-box', ToBoxId: 'target-box' };
      
      await axios.post(`${baseUrl}/V3/PostMessage`, payload, {
        headers: {
          'Authorization': 'DiadocAuth ddauth_api_client_id=test,ddauth_token=token',
        },
      });

      const requests = mockServer.getRequests();
      expect(requests.length).toBeGreaterThan(0);
      
      const lastRequest = requests[requests.length - 1];
      expect(lastRequest.method).toBe('POST');
      expect(lastRequest.path).toBe('/V3/PostMessage');
      expect(lastRequest.body).toEqual(payload);
    });
  });

  describe('Get Message', () => {
    it('should return message status on GET /V3/GetMessage', async () => {
      const response = await axios.get(`${baseUrl}/V3/GetMessage`, {
        params: { boxId: 'test-box', messageId: 'test-msg' },
        headers: {
          'Authorization': 'DiadocAuth ddauth_api_client_id=test,ddauth_token=token',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('Status');
      expect(response.data).toHaveProperty('Entities');
    });
  });

  describe('Error Simulation', () => {
    it('should simulate 401 auth error', async () => {
      mockServer.setAuthError();

      try {
        await axios.post(`${baseUrl}/Authenticate`);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should simulate 429 rate limit error', async () => {
      mockServer.setRateLimitError();

      try {
        await axios.post(`${baseUrl}/V3/PostMessage`, {}, {
          headers: {
            'Authorization': 'DiadocAuth ddauth_api_client_id=test,ddauth_token=token',
          },
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.headers['retry-after']).toBeDefined();
      }
    });

    it('should simulate 500 server error', async () => {
      mockServer.setServerError();

      try {
        await axios.post(`${baseUrl}/V3/PostMessage`, {}, {
          headers: {
            'Authorization': 'DiadocAuth ddauth_api_client_id=test,ddauth_token=token',
          },
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
      }
    });
  });

  describe('Organizations', () => {
    it('should return organizations on GET /GetOrganizationsByInnKpp', async () => {
      const response = await axios.get(`${baseUrl}/GetOrganizationsByInnKpp`, {
        params: { inn: '1234567890' },
        headers: {
          'Authorization': 'DiadocAuth ddauth_api_client_id=test,ddauth_token=token',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('Organizations');
      expect(response.data.Organizations.length).toBeGreaterThan(0);
    });
  });
});
