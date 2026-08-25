/**
 * Mock Diadoc Server
 * 
 * Имитирует ответы реального Diadoc API по спецификации.
 * Используется для тестирования без реальной учётки.
 */
import * as http from 'http';

export interface MockDiadocServerConfig {
  port: number;
  authToken?: string;
  apiClientId?: string;
}

export interface MockDiadocResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

export class MockDiadocServer {
  private server: http.Server | null = null;
  private responses: Map<string, MockDiadocResponse> = new Map();
  private requests: Array<{ method: string; path: string; body: any; headers: any }> = [];

  constructor(private config: MockDiadocServerConfig) {
    this.setupDefaultResponses();
  }

  private setupDefaultResponses(): void {
    // Authenticate endpoint
    this.setResponse('POST /Authenticate', {
      status: 200,
      body: 'mock-auth-token-12345',
      headers: { 'Content-Type': 'text/plain' },
    });

    // Post Message (upload document)
    this.setResponse('POST /V3/PostMessage', {
      status: 200,
      body: {
        MessageId: 'mock-message-id-' + Date.now(),
        Entities: [
          {
            EntityId: 'mock-entity-id-' + Date.now(),
            AttachmentType: 'Nonformalized',
          },
        ],
      },
    });

    // Get Message V3 (legacy - for backward compatibility)
    this.setResponse('GET /V3/GetMessage', {
      status: 200,
      body: {
        MessageId: 'mock-message-id',
        Status: 'Signed',
        Entities: [
          {
            EntityId: 'mock-entity-id',
            AttachmentType: 'Nonformalized',
            DocumentInfo: {
              DocumentStatus: 'Signed',
              RecipientResponseStatus: 'WithRecipientSignature',
            },
          },
        ],
      },
    });

    // Get Message V6 (used by getDocumentStatus)
    this.setResponse('GET /V6/GetMessage', {
      status: 200,
      body: {
        MessageId: 'mock-message-id',
        Status: 'Signed',
        Entities: [
          {
            EntityId: 'mock-entity-id',
            AttachmentType: 'Nonformalized',
            EntityType: 'Attachment',
            DocumentInfo: {
              DocumentStatus: 'Signed',
              RecipientResponseStatus: 'WithRecipientSignature',
              DocflowStatus: {
                PrimaryStatus: {
                  StatusText: 'Signed',
                  Severity: 'Success',
                },
              },
            },
          },
        ],
      },
    });

    // Get Message Content (download signed document)
    this.setResponse('GET /V3/GetMessageContent', {
      status: 200,
      body: Buffer.from('Mock signed PDF content'),
      headers: { 'Content-Type': 'application/pdf' },
    });

    // Get Organizations by INN
    this.setResponse('GET /GetOrganizationsByInnKpp', {
      status: 200,
      body: {
        Organizations: [
          {
            OrgId: 'mock-org-id',
            Inn: '1234567890',
            FullName: 'Mock Organization',
            Boxes: [
              {
                BoxId: 'mock-box-id',
                Title: 'Main Box',
              },
            ],
          },
        ],
      },
    });
  }

  setResponse(key: string, response: MockDiadocResponse): void {
    this.responses.set(key, response);
  }

  setAuthError(): void {
    this.setResponse('POST /Authenticate', {
      status: 401,
      body: { message: 'Unauthorized' },
    });
  }

  setRateLimitError(): void {
    this.setResponse('POST /V3/PostMessage', {
      status: 429,
      body: { message: 'Too Many Requests' },
      headers: { 'Retry-After': '60' },
    });
  }

  setServerError(): void {
    this.setResponse('POST /V3/PostMessage', {
      status: 500,
      body: { message: 'Internal Server Error' },
    });
  }

  getRequests(): Array<{ method: string; path: string; body: any; headers: any }> {
    return this.requests;
  }

  clearRequests(): void {
    this.requests = [];
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          const parsedUrl = new URL(req.url || '/', `http://localhost:${this.config.port}`);
          let path = parsedUrl.pathname;
          const method = req.method || 'GET';
          
          // Normalize paths with query params
          if (path.startsWith('/V3/GetMessage')) path = '/V3/GetMessage';
          if (path.startsWith('/V6/GetMessage')) path = '/V6/GetMessage';
          if (path.startsWith('/V3/GetMessageContent')) path = '/V3/GetMessageContent';
          if (path.startsWith('/GetOrganizationsByInnKpp')) path = '/GetOrganizationsByInnKpp';
          
          const key = `${method} ${path}`;

          // Record request
          let parsedBody = null;
          if (body) {
            try {
              parsedBody = JSON.parse(body);
            } catch {
              parsedBody = body;
            }
          }
          this.requests.push({
            method,
            path,
            body: parsedBody,
            headers: req.headers,
          });

          // Check authorization
          const authHeader = req.headers['authorization'];
          if (path !== '/Authenticate' && !authHeader?.includes('DiadocAuth')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized' }));
            return;
          }

          // Find response
          const response = this.responses.get(key);
          if (response) {
            const headers = {
              'Content-Type': 'application/json',
              ...response.headers,
            };
            res.writeHead(response.status, headers);
            
            if (Buffer.isBuffer(response.body)) {
              res.end(response.body);
            } else if (typeof response.body === 'string') {
              res.end(response.body);
            } else {
              res.end(JSON.stringify(response.body));
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Not Found', path }));
          }
        });
      });

      this.server.on('error', reject);
      this.server.listen(this.config.port, () => {
        console.log(`Mock Diadoc Server started on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock Diadoc Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Factory function
export function createMockDiadocServer(port = 3999): MockDiadocServer {
  return new MockDiadocServer({ port });
}
