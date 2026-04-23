import axios, { AxiosError, type AxiosRequestConfig, type Method } from 'axios';

import { getLogger } from './logger.js';
import { type FuseApiConfig } from './types.js';

const DEFAULT_SUBSCRIPTION_KEY = 'f416dd564e424fd8a835eab72fcc0b1c';
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Create a client for the Fuse EHR API.
 *
 * Unlike NexHealth, Fuse does not have a programmatic authentication endpoint.
 * The caller must provide a valid JWT token obtained from the browser login flow.
 *
 * @param initialConfig - The Fuse API configuration including access token
 * @returns The Fuse client
 */
export const fuseClient = (initialConfig: FuseApiConfig) => {
  let config = { ...initialConfig };

  /**
   * Build the full set of headers required by the Fuse API.
   */
  const getHeaders = (): Record<string, string> => ({
    Accept: 'application/json, text/plain, */*',
    ApplicationID: '2',
    Authorization: `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json',
    'Location-TimeZone': 'Central Standard Time',
    'Ocp-Apim-Subscription-Key':
      config.subscriptionKey ?? DEFAULT_SUBSCRIPTION_KEY,
    'PAT-Application-ID': '2',
    'PAT-Location-ID': config.locationId,
    'PAT-Practice-ID': config.practiceId,
    PtcSoarUtcOffset: '-5',
    TimeZone: 'Central Standard Time',
  });

  /**
   * Check if the current JWT token is expired.
   * Parses the token's exp claim and adds a 1-minute safety buffer.
   */
  const isTokenExpired = (): boolean => {
    try {
      const [, payloadB64] = config.accessToken.split('.');
      if (!payloadB64) {
        return true;
      }

      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64').toString('utf8'),
      );

      if (!payload.exp) {
        return true;
      }

      // 1-minute safety buffer
      return Date.now() >= payload.exp * 1_000 - 60 * 1_000;
    } catch {
      return true;
    }
  };

  /**
   * Update the access token (e.g., after re-authenticating via browser).
   *
   * @param newToken - The new JWT access token
   */
  const updateToken = (newToken: string): void => {
    config = { ...config, accessToken: newToken };
  };

  /**
   * Get the current configuration (read-only copy).
   */
  const getConfig = (): Readonly<FuseApiConfig> => ({ ...config });

  /**
   * Execute a request to the Fuse API.
   *
   * @param baseUrl - The base URL to use (insurance or service2)
   * @param method - The HTTP method
   * @param path - The API path
   * @param requestConfig - Optional axios request configuration
   * @returns The response data
   */
  const request = async <T>(
    baseUrl: string,
    method: Method,
    path: string,
    requestConfig?: AxiosRequestConfig,
  ): Promise<T> => {
    const log = getLogger();

    if (isTokenExpired()) {
      throw new Error(
        'Token is expired. Provide a fresh token via updateToken() before making API requests.',
      );
    }

    try {
      log.debug('Fuse API request', { method, path });

      const response = await axios.request<T>({
        ...requestConfig,
        headers: {
          ...getHeaders(),
          ...requestConfig?.headers,
        },
        method,
        timeout: DEFAULT_TIMEOUT_MS,
        url: `${baseUrl}/${path.replace(/^\//u, '')}`,
      });

      log.debug('Fuse API response', {
        status: response.status,
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        delete error.config;
        delete error.request;
        delete error.response?.request;

        const errorText =
          error.response?.data?.message ||
          error.response?.data?.ExtendedStatusCode ||
          error.message ||
          'Unknown error';

        throw new Error(
          `Fuse API request failed (${method} ${path}): ${errorText}`,
          { cause: error },
        );
      } else {
        throw error;
      }
    }
  };

  return {
    getConfig,
    isTokenExpired,
    request,
    updateToken,
  };
};

export type FuseCoreClient = ReturnType<typeof fuseClient>;
