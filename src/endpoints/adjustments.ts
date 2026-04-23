import { type FuseCoreClient } from '../lib/client.js';
import { API_URLS, type FuseApiResponse } from '../lib/types.js';

// ============================================================================
// Adjustment Types
// ============================================================================

/**
 * Adjustment type from GET /adjustmenttypes
 */
export type FuseAdjustmentType = {
  AdjustmentTypeId: string;
  Description: string;
  IsActive: boolean;
  Name: string;
};

/**
 * Credit transaction detail for adjustments.
 */
export type FuseAdjustmentDetail = {
  AccountMemberId: string;
  Amount: number;
  AppliedLocationId: number;
  AppliedToDebitTransactionId: string | null;
  AppliedToServiceTransationId: string;
  CreditTransactionId: string;
  DateEntered: string;
  EncounterId: string;
  ObjectState: 'Add' | 'Delete' | 'Edit';
  ProviderUserId: string;
  ServiceTransactionDataTag: string;
};

/**
 * Request for POST /accounts/{accountId}/credittransaction (adjustments)
 */
export type FuseAdjustmentRequest = {
  AccountId: string;
  AdjustmentTypeId: string;
  Amount: number;
  AssignedAdjustmentTypeId: number;
  ClaimId: string | null;
  CreditTransactionDetails: FuseAdjustmentDetail[];
  CreditTransactionId: string;
  DateEntered: string;
  Description: string | null;
  EnteredByUserId: string;
  IsAllAccountMembersSelected: boolean;
  LocationId: number;
  Note: string;
  PaymentTypeId: string | null;
  PaymentTypePromptValue: string | null;
  PromptTitle: string | null;
  TransactionTypeId: number; // 4 = Adjustment
  ValidDate: boolean;
};

export type FuseAdjustmentResponse = FuseApiResponse<{
  Amount: number;
  CreditTransactionDetails: Array<{
    Amount: number;
    AppliedToServiceTransationId: string;
    CreditTransactionDetailId: string;
    DateCompleted: string;
  }>;
  CreditTransactionId: string;
  Description: string;
}>;

// ============================================================================
// Adjustments Endpoint Factory
// ============================================================================

/**
 * Create the adjustments endpoint handlers.
 *
 * @param client - The Fuse core client
 * @returns The adjustments endpoint methods
 */
export const adjustments = (client: FuseCoreClient) => {
  const { locationId } = client.getConfig();
  const numericLocationId = Number.parseInt(locationId, 10);

  return {
    /**
     * Get available adjustment types.
     *
     * @returns Array of adjustment types
     */
    getTypes: async (): Promise<FuseAdjustmentType[]> => {
      const result = await client.request<
        FuseAdjustmentType[] | FuseApiResponse<FuseAdjustmentType[]>
      >(API_URLS.insurance, 'GET', 'adjustmenttypes?active=true');

      if (Array.isArray(result)) {
        return result;
      }

      return result.Value ?? [];
    },

    /**
     * Post an adjustment (negative or positive) to service transactions.
     * Use for insurance adjustments (write-offs) after payment posting.
     *
     * @param params - Adjustment parameters
     * @param params.accountId - The account ID
     * @param params.adjustmentTypeId - Adjustment type ID from getTypes()
     * @param params.note - Optional note for the adjustment
     * @param params.serviceAdjustments - Array of service line adjustments
     * @param params.totalAmount - Total adjustment amount (negative for write-offs)
     * @returns The adjustment response
     */
    post: async (params: {
      accountId: string;
      adjustmentTypeId: string;
      note?: string;
      serviceAdjustments: Array<{
        accountMemberId: string;
        amount: number;
        dataTag: string;
        encounterId: string;
        providerId: string;
        serviceTransactionId: string;
      }>;
      totalAmount: number;
    }): Promise<FuseAdjustmentResponse> => {
      const now = new Date().toISOString();

      const creditTransactionDetails: FuseAdjustmentDetail[] =
        params.serviceAdjustments.map((adj) => ({
          AccountMemberId: adj.accountMemberId,
          Amount: adj.amount,
          AppliedLocationId: numericLocationId,
          AppliedToDebitTransactionId: null,
          AppliedToServiceTransationId: adj.serviceTransactionId,
          CreditTransactionId: '00000000-0000-0000-0000-000000000000',
          DateEntered: now,
          EncounterId: adj.encounterId,
          ObjectState: 'Add' as const,
          ProviderUserId: adj.providerId,
          ServiceTransactionDataTag: adj.dataTag,
        }));

      const request: FuseAdjustmentRequest = {
        AccountId: params.accountId,
        AdjustmentTypeId: params.adjustmentTypeId,
        Amount: params.totalAmount,
        AssignedAdjustmentTypeId: 1,
        ClaimId: null,
        CreditTransactionDetails: creditTransactionDetails,
        CreditTransactionId: '00000000-0000-0000-0000-000000000000',
        DateEntered: now,
        Description: null,
        EnteredByUserId: '00000000-0000-0000-0000-000000000000',
        IsAllAccountMembersSelected: false,
        LocationId: numericLocationId,
        Note: params.note ?? '',
        PaymentTypeId: null,
        PaymentTypePromptValue: null,
        PromptTitle: null,
        TransactionTypeId: 4,
        ValidDate: true,
      };

      return client.request<FuseAdjustmentResponse>(
        API_URLS.insurance,
        'POST',
        `accounts/${params.accountId}/credittransaction`,
        { data: request },
      );
    },
  };
};
