/**
 * Configuration for the Fuse API client.
 * Requires a JWT access token obtained externally from the Patterson Fuse login flow.
 */
export type FuseApiConfig = {
  /**
   * JWT access token from Duende Identity Server
   */
  accessToken: string;
  /**
   * Location ID
   */
  locationId: string;
  /**
   * Practice ID (from extension_Fuse_PracticeId claim)
   */
  practiceId: string;
  /**
   * API subscription key (uses default if not provided)
   */
  subscriptionKey?: string;
};

/**
 * Standard Fuse API response envelope.
 * All Fuse endpoints return this wrapper around the actual data.
 */
export type FuseApiResponse<T> = {
  Count: number | null;
  ExtendedStatusCode: string | null;
  InvalidProperties: unknown;
  Value: T;
};

/**
 * Claim status constants used by the Fuse API.
 * Status 8 = Closed (already posted).
 */
export const CLAIM_STATUSES = {
  ALL: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  CLOSED: 8,
};

/**
 * API base URLs for the Fuse services.
 */
export const API_URLS = {
  insurance: 'https://prod-fuse-service-insurance-api.fuse.pattersondental.com',
  service2: 'https://prod-fuse-service-2-api.fuse.pattersondental.com',
};
