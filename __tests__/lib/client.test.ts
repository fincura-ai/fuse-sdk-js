import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { fuseClient } from '../../src/lib/client.js';

jest.mock('axios');
jest.mock('../../src/lib/logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

const testInsuranceUrl =
  'https://prod-fuse-service-insurance-api.fuse.pattersondental.com';

/**
 * Create a valid mock JWT token with configurable expiration.
 */
const createMockToken = (expiresInSeconds = 3_600) => {
  const now = Math.floor(Date.now() / 1_000);
  const payload = {
    exp: now + expiresInSeconds,
    extension_Fuse_PracticeId: 'test-practice',
    iat: now,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString(
    'base64url',
  );
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  return `${header}.${payloadBase64}.fake-signature`;
};

/**
 * Helper to create a mock Axios error with API response data.
 */
const createAxiosError = (
  status: number,
  data: { ExtendedStatusCode?: string; message?: string },
): AxiosError => {
  const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
  const error = new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      config,
      data,
      headers: {},
      status,
      statusText: 'Error',
    },
  );
  error.response = {
    config,
    data,
    headers: {},
    status,
    statusText: 'Error',
  };
  return error;
};

describe('fuseClient', () => {
  const mockConfig = {
    accessToken: createMockToken(),
    locationId: '14817',
    practiceId: 'test-practice-id',
  };
  let client: ReturnType<typeof fuseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = fuseClient(mockConfig);
  });

  describe('isTokenExpired', () => {
    it('should return false when token is valid', () => {
      expect(client.isTokenExpired()).toBe(false);
    });

    it('should return true when token is expired', () => {
      const expiredClient = fuseClient({
        ...mockConfig,
        accessToken: createMockToken(-60),
      });
      expect(expiredClient.isTokenExpired()).toBe(true);
    });

    it('should return true when token expires within 1-minute buffer', () => {
      const soonExpiringClient = fuseClient({
        ...mockConfig,
        accessToken: createMockToken(30),
      });
      expect(soonExpiringClient.isTokenExpired()).toBe(true);
    });

    it('should return true for malformed token', () => {
      const badClient = fuseClient({
        ...mockConfig,
        accessToken: 'not-a-jwt',
      });
      expect(badClient.isTokenExpired()).toBe(true);
    });
  });

  describe('updateToken', () => {
    it('should update the access token', () => {
      const newToken = createMockToken(7_200);
      client.updateToken(newToken);

      const config = client.getConfig();
      expect(config.accessToken).toBe(newToken);
    });

    it('should not affect other config fields', () => {
      const newToken = createMockToken();
      client.updateToken(newToken);

      const config = client.getConfig();
      expect(config.locationId).toBe(mockConfig.locationId);
      expect(config.practiceId).toBe(mockConfig.practiceId);
    });
  });

  describe('getConfig', () => {
    it('should return the current configuration', () => {
      const config = client.getConfig();
      expect(config.locationId).toBe(mockConfig.locationId);
      expect(config.practiceId).toBe(mockConfig.practiceId);
      expect(config.accessToken).toBe(mockConfig.accessToken);
    });

    it('should return a copy that cannot mutate internal state', () => {
      const config1 = client.getConfig();
      (config1 as { locationId: string }).locationId = 'hacked';

      const config2 = client.getConfig();
      expect(config2.locationId).toBe(mockConfig.locationId);
    });
  });

  describe('request', () => {
    it('should throw when token is expired', async () => {
      const expiredClient = fuseClient({
        ...mockConfig,
        accessToken: createMockToken(-60),
      });

      await expect(
        expiredClient.request(testInsuranceUrl, 'GET', '/test'),
      ).rejects.toThrow(
        'Token is expired. Provide a fresh token via updateToken() before making API requests.',
      );
    });

    it('should use Bearer token in Authorization header', async () => {
      (axios.request as jest.Mock).mockResolvedValueOnce({ data: {} });

      await client.request(testInsuranceUrl, 'GET', '/test');

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /u),
          }),
        }),
      );
    });

    it('should include Fuse-specific headers', async () => {
      (axios.request as jest.Mock).mockResolvedValueOnce({ data: {} });

      await client.request(testInsuranceUrl, 'GET', '/test');

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': expect.any(String),
            'PAT-Application-ID': '2',
            'PAT-Location-ID': mockConfig.locationId,
            'PAT-Practice-ID': mockConfig.practiceId,
          }),
        }),
      );
    });

    it('should return response data directly', async () => {
      const responseData = { Count: null, Value: { test: true } };
      (axios.request as jest.Mock).mockResolvedValueOnce({
        data: responseData,
      });

      const result = await client.request(testInsuranceUrl, 'GET', '/test');
      expect(result).toEqual(responseData);
    });

    it('should normalize path with leading slash', async () => {
      (axios.request as jest.Mock).mockResolvedValueOnce({ data: {} });

      await client.request(testInsuranceUrl, 'GET', '/test/path');

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${testInsuranceUrl}/test/path`,
        }),
      );
    });

    it('should extract error message from API response', async () => {
      const mockError = createAxiosError(400, {
        message: 'Invalid request',
      });
      (axios.request as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(
        client.request(testInsuranceUrl, 'GET', '/test'),
      ).rejects.toThrow('Fuse API request failed (GET /test): Invalid request');
    });
  });

  describe('client isolation', () => {
    it('should maintain separate state per client instance', () => {
      const client1 = fuseClient({
        ...mockConfig,
        accessToken: createMockToken(),
      });
      const client2 = fuseClient({
        ...mockConfig,
        accessToken: createMockToken(),
      });

      const newToken = createMockToken(7_200);
      client1.updateToken(newToken);

      expect(client1.getConfig().accessToken).toBe(newToken);
      expect(client2.getConfig().accessToken).not.toBe(newToken);
    });
  });
});
