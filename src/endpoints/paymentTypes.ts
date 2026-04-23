import { type FuseCoreClient } from '../lib/client.js';
import { API_URLS, type FuseApiResponse } from '../lib/types.js';

// ============================================================================
// Payment Type Types
// ============================================================================

/**
 * Payment type from the /paymenttypes/minimal API.
 */
export type FusePaymentType = {
  CurrencyTypeId: number;
  DataTag: string;
  DateModified: string;
  Description: string;
  IsActive: boolean;
  PaymentTypeCategory: number;
  PaymentTypeId: string;
  Prompt: string;
  UserModified: string;
};

// ============================================================================
// Payment Types Endpoint Factory
// ============================================================================

/**
 * Create the payment types endpoint handlers.
 *
 * @param client - The Fuse core client
 * @returns The payment types endpoint methods
 */
export const paymentTypes = (client: FuseCoreClient) => {
  return {
    /**
     * Get available payment types for insurance payments.
     * PaymentTypeCategory=2 filters to insurance payment types.
     *
     * @returns Array of payment types
     */
    list: async (): Promise<FusePaymentType[]> => {
      const result = await client.request<
        FuseApiResponse<FusePaymentType[]> | FusePaymentType[]
      >(API_URLS.service2, 'GET', 'paymenttypes/minimal?paymentTypeCategory=2');

      if (Array.isArray(result)) {
        return result;
      }

      return result.Value ?? [];
    },
  };
};
