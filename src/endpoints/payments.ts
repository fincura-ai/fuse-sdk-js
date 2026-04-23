import { type FuseCoreClient } from '../lib/client.js';
import { extractProcedureCode } from '../lib/helpers.js';
import { API_URLS, type FuseApiResponse } from '../lib/types.js';
import { type FuseServiceLineItem } from './claims.js';

// ============================================================================
// Credit Distribution Types
// ============================================================================

/**
 * Credit distribution item returned by the creditdistribution endpoint.
 * Shows how much can be applied to each service transaction.
 */
export type FuseCreditDistributionItem = {
  AccountMemberId: string;
  AllAccountMembersSelected: boolean;
  Amount: number;
  AppliedLocationId: string | null;
  AppliedToDebitTransactionId: string | null;
  AppliedToServiceTransationId: string | null; // null = unallocated/excess
  CreditTransactionDetailId: string;
  CreditTransactionId: string;
  DataTag: string | null;
  DateCompleted: string | null;
  DateEntered: string;
  DateModified: string;
  DebitTransactionDataTag: string | null;
  EncounterId: string | null;
  FailedMessage: string | null;
  IsDeleted: boolean;
  ObjectState: unknown;
  ProviderUserId: string | null;
  ServiceTransactionDataTag: string | null;
  UserModified: string;
};

export type FuseCreditDistributionResponse = FuseApiResponse<
  FuseCreditDistributionItem[]
>;

// ============================================================================
// Bulk Insurance Payment Types
// ============================================================================

/**
 * Individual credit transaction detail (per-service payment).
 */
export type FuseCreditTransactionDetail = {
  AccountMemberId: string;
  Amount: number;
  AppliedToDebitTransactionId: string | null;
  AppliedToServiceTransationId: string; // Note: typo in API "Transation"
  DateEntered: string;
  EncounterId: string;
  ObjectState: 'Add' | 'Delete' | 'Edit';
  ProviderUserId: string;
};

/**
 * Credit transaction for a single claim.
 */
export type FuseCreditTransaction = {
  AccountId: string;
  Amount: number;
  BulkCreditTransactionId: number | null;
  ClaimId: string;
  CreditTransactionDetails: FuseCreditTransactionDetail[];
  DataTag: string | null;
  DateEntered: string;
  IsAllAccountMembersSelected: boolean;
  LocationId: number;
  PaymentTypeId: string;
  PaymentTypePromptValue: string;
  TransactionTypeId: number; // 3 = Insurance payment
};

/**
 * Bulk credit transaction wrapper.
 */
export type FuseBulkCreditTransaction = {
  BulkCreditTransactionType: number; // 2 = Insurance
  CarrierId: string;
  CreditTransactions: FuseCreditTransaction[];
  DataTag: string | null;
  DateEntered: string;
  LocationId: number;
  Note: string;
  PaymentTypeId: string;
  PaymentTypePromptValue: string;
  UpdatedEstimates: unknown[];
};

/**
 * Request payload for POST /accounts/bulkInsurancePayment
 */
export type FuseBulkInsurancePaymentRequest = {
  BulkCreditTransactions: FuseBulkCreditTransaction[];
  BulkCreditTransactionType: number;
  CarrierId: string;
  CreditTransactions: FuseCreditTransaction[];
  DataTag: string | null;
  DateEntered: string;
  LocationId: number;
  Note: string;
  PaymentTypeId: string;
  PaymentTypePromptValue: string;
  UpdatedEstimates: unknown[];
};

/**
 * Response from POST /accounts/bulkInsurancePayment
 */
export type FuseBulkInsurancePaymentResponse = FuseApiResponse<{
  BulkCreditTransactionId: number;
  BulkCreditTransactionType: number;
  CarrierId: string;
  CreditTransactions: Array<{
    Amount: number;
    ClaimId: string;
    CreditTransactionDetails: Array<{
      Amount: number;
      AppliedToServiceTransationId: string;
      CreditTransactionDetailId: string;
      DateCompleted: string;
    }>;
    CreditTransactionId: string;
  }>;
  DataTag: string;
  DateEntered: string;
  EnteredByUserId: string;
  IsAuthorized: boolean;
  IsDeposited: boolean;
  LocationId: number;
  Note: string;
  PaymentTypeId: string;
  PaymentTypePromptValue: string;
}>;

// ============================================================================
// Validation Result Type
// ============================================================================

export type FusePaymentValidationResult = {
  distribution: FuseCreditDistributionItem[];
  issues: string[];
  serviceMatches: Array<{
    canPost: boolean;
    eraAmount: number;
    maxAllowed: number;
    procedureCode: string;
    serviceTransactionId: string;
  }>;
  valid: boolean;
};

// ============================================================================
// Payments Endpoint Factory
// ============================================================================

/**
 * Create the payments endpoint handlers.
 *
 * @param client - The Fuse core client
 * @returns The payments endpoint methods
 */
export const payments = (client: FuseCoreClient) => {
  const { locationId } = client.getConfig();
  const numericLocationId = Number.parseInt(locationId, 10);

  return {
    /**
     * Calculate credit distribution for service line items.
     * This is a pre-validation endpoint that shows how much can be applied
     * to each service. Call before posting payments to validate amounts.
     *
     * @param serviceLineItems - Service line items from getClaimById
     * @param totalAmount - Total payment amount in dollars
     * @returns Distribution showing max amounts per service
     */
    calculateCreditDistribution: async (
      serviceLineItems: FuseServiceLineItem[],
      totalAmount: number,
    ): Promise<FuseCreditDistributionResponse> => {
      return client.request<FuseCreditDistributionResponse>(
        API_URLS.insurance,
        'POST',
        `accounts/claimservicetransactions/creditdistribution?Amount=${totalAmount}`,
        { data: serviceLineItems },
      );
    },

    /**
     * Post a bulk insurance payment.
     * This is the main payment posting endpoint.
     *
     * @param params - Payment parameters
     * @param params.accountId - The account ID
     * @param params.carrierId - The carrier/insurance ID
     * @param params.checkOrEftNumber - Check or EFT trace number from ERA
     * @param params.claimId - The claim ID
     * @param params.note - Optional note for the payment
     * @param params.paymentTypeId - Payment type UUID (EFT, Check, etc.)
     * @param params.servicePayments - Array of per-service payment details
     * @param params.totalAmount - Total payment amount in dollars
     * @returns Payment response with BulkCreditTransactionId on success
     */
    postBulkInsurancePayment: async (params: {
      accountId: string;
      carrierId: string;
      checkOrEftNumber: string;
      claimId: string;
      note?: string;
      paymentTypeId: string;
      servicePayments: Array<{
        accountMemberId: string;
        amount: number;
        encounterId: string;
        providerId: string;
        serviceTransactionId: string;
      }>;
      totalAmount: number;
    }): Promise<FuseBulkInsurancePaymentResponse> => {
      const now = new Date().toISOString();

      const creditTransactionDetails: FuseCreditTransactionDetail[] =
        params.servicePayments.map((svc) => ({
          AccountMemberId: svc.accountMemberId,
          Amount: svc.amount,
          AppliedToDebitTransactionId: null,
          AppliedToServiceTransationId: svc.serviceTransactionId,
          DateEntered: now,
          EncounterId: svc.encounterId,
          ObjectState: 'Add' as const,
          ProviderUserId: svc.providerId,
        }));

      const creditTransaction: FuseCreditTransaction = {
        AccountId: params.accountId,
        Amount: params.totalAmount,
        BulkCreditTransactionId: null,
        ClaimId: params.claimId,
        CreditTransactionDetails: creditTransactionDetails,
        DataTag: null,
        DateEntered: now,
        IsAllAccountMembersSelected: true,
        LocationId: numericLocationId,
        PaymentTypeId: params.paymentTypeId,
        PaymentTypePromptValue: params.checkOrEftNumber,
        TransactionTypeId: 3,
      };

      const bulkCreditTransaction: FuseBulkCreditTransaction = {
        BulkCreditTransactionType: 2,
        CarrierId: params.carrierId,
        CreditTransactions: [creditTransaction],
        DataTag: null,
        DateEntered: now,
        LocationId: numericLocationId,
        Note: params.note ?? '',
        PaymentTypeId: params.paymentTypeId,
        PaymentTypePromptValue: params.checkOrEftNumber,
        UpdatedEstimates: [],
      };

      const request: FuseBulkInsurancePaymentRequest = {
        BulkCreditTransactions: [bulkCreditTransaction],
        BulkCreditTransactionType: 2,
        CarrierId: params.carrierId,
        CreditTransactions: [creditTransaction],
        DataTag: null,
        DateEntered: now,
        LocationId: numericLocationId,
        Note: params.note ?? '',
        PaymentTypeId: params.paymentTypeId,
        PaymentTypePromptValue: params.checkOrEftNumber,
        UpdatedEstimates: [],
      };

      return client.request<FuseBulkInsurancePaymentResponse>(
        API_URLS.insurance,
        'POST',
        'accounts/bulkInsurancePayment',
        { data: request },
      );
    },

    /**
     * Validate ERA payment amounts against Fuse's calculated distribution.
     *
     * @param serviceLineItems - Service items from getClaimById
     * @param eraPayments - ERA payment amounts by procedure code
     * @param totalAmountDollars - Total payment amount in dollars
     * @returns Validation result with details about any mismatches
     */
    validatePaymentAmounts: async (
      serviceLineItems: FuseServiceLineItem[],
      eraPayments: Map<string, number>,
      totalAmountDollars: number,
    ): Promise<FusePaymentValidationResult> => {
      const distribution = await client.request<FuseCreditDistributionResponse>(
        API_URLS.insurance,
        'POST',
        `accounts/claimservicetransactions/creditdistribution?Amount=${totalAmountDollars}`,
        { data: serviceLineItems },
      );

      const issues: string[] = [];
      const serviceMatches: FusePaymentValidationResult['serviceMatches'] = [];

      const maxAmounts = new Map<string, number>();
      for (const item of distribution.Value) {
        if (item.AppliedToServiceTransationId) {
          maxAmounts.set(item.AppliedToServiceTransationId, item.Amount);
        }
      }

      for (const svc of serviceLineItems) {
        const procCode = extractProcedureCode(svc.Description);
        if (!procCode) {
          continue;
        }

        const eraAmountDollars = eraPayments.get(procCode) ?? 0;
        const maxAllowed = maxAmounts.get(svc.ServiceTransactionId) ?? 0;
        const canPost = eraAmountDollars <= maxAllowed;

        serviceMatches.push({
          canPost,
          eraAmount: eraAmountDollars,
          maxAllowed,
          procedureCode: procCode,
          serviceTransactionId: svc.ServiceTransactionId,
        });

        if (!canPost) {
          issues.push(
            `${procCode}: ERA $${eraAmountDollars.toFixed(2)} exceeds max allowed $${maxAllowed.toFixed(2)}`,
          );
        }
      }

      return {
        distribution: distribution.Value,
        issues,
        serviceMatches,
        valid: issues.length === 0,
      };
    },
  };
};
