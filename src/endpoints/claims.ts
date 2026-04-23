import { type FuseCoreClient } from '../lib/client.js';
import {
  API_URLS,
  CLAIM_STATUSES,
  type FuseApiResponse,
} from '../lib/types.js';

// ============================================================================
// Claims Grid Types
// ============================================================================

/**
 * Claim row from the claimsGrid API response.
 * Schema discovered from actual API responses.
 */
export type FuseClaimRow = {
  AccountId: string;
  ClaimCommonId: string;
  ClaimId: string;
  LocationId: number;
  PatientId: string;

  PatientFirstName: string;
  PatientLastName: string;
  PatientMiddleName: string | null;
  PatientPreferredName: string;
  PatientSuffix: string;

  ClaimForm: string;
  HasErrors: boolean;
  IsActualClaim: boolean;
  IsElectronic: boolean;
  IsReceived: boolean;
  Status: number;
  SubmittalMethod: number;
  SubmittalStatus: number;
  TotalFees: number;
  TrackClaim: boolean;
  Type: number;

  CarrierName: string;
  PatientBenefitPlanPriority: number;

  TreatingDentistSignature: string;

  DateModified: string;
  DateSubmitted: string;
  MaxServiceDate: string;
  MinServiceDate: string;

  EAttachmentEnabled: boolean;
  HasAcceptedOrRejectedAttachment: boolean;
  HasAttachemnt: boolean; // Note: API has typo "Attachemnt"
  HasUserGeneratedNotes: boolean;
  TreatmentPlanId: string | null;

  DataTag: string;
};

/**
 * Response from POST /insurance/claimsGrid
 */
export type FuseClaimsGridResponse = FuseApiResponse<{
  CurrentPage: number;
  FilterCriteria: Record<string, unknown>;
  PageCount: number;
  ReturnCount: boolean;
  ReturnRows: boolean;
  ReturnTotalFees: boolean;
  Rows: FuseClaimRow[];
  SortCriteria: Record<string, unknown>;
  TotalCount: number;
  TotalFees: number;
}>;

/**
 * Request payload for POST /insurance/claimsGrid
 */
export type FuseClaimsGridRequest = {
  FilterCriteria: {
    CarrierIds: string[];
    ClaimStatuses: number[];
    ClaimTypes: number[];
    DateSubmitted: string | null;
    HasErrors: boolean;
    IsReceived: boolean;
    LocationIds: number[];
    PatientIds: number[] | null;
    SearchText: string;
  };
  PageNumber?: number;
  PageSize?: number;
  ReturnCount: boolean;
  ReturnRows: boolean;
  ReturnTotalFees: boolean;
};

// ============================================================================
// Claim Details Types
// ============================================================================

/**
 * Service line item from getClaimById response.
 * Contains the procedure details needed for posting payments.
 */
export type FuseServiceLineItem = {
  ClaimId: string;
  ServiceTransactionId: string;
  ServiceTransactionToClaimId: string;

  Description: string;
  ServiceCodeId: string;

  AccountMemberId: string;
  EncounterId: string;
  PatientName: string;
  ProviderName: string;
  ProviderUserId: string;

  DateEntered: string;
  DateServiceCompleted: string;

  AdjustedEstimate: number;
  AllowedAmount: number;
  AllowedAmountOverride: number | null;
  Balance: number;
  Charges: number;
  InsuranceEstimate: number;
  OriginalAllowedAmount: number;
  OriginalInsuranceEstimate: number;
  PaidInsuranceEstimate: number;
  PaymentAmount: number | null;
  TotalInsurancePayments: number;

  InsuranceOrder: number;
  Roots: string | null;
  Surface: string | null;
  Tooth: string | null;

  EstimatedInsuranceId: string;
  FeeScheduleGroupDetailId: string | null;
  FeeScheduleGroupId: string | null;
  FeeScheduleId: string | null;

  DataTag: string | null;
  DateModified: string;
  UserModified: string;
};

/**
 * Detailed claim response from getClaimById endpoint.
 */
export type FuseClaimDetails = {
  AccountId: string;
  AccountMemberId: string;
  BenefitPlanId: string;
  CarrierId: string;
  CarrierName: string;
  ClaimEntityId: string;
  ClaimId: string;
  DisplayDate: string;
  LocationId: number;
  MaxServiceDate: string;
  MinServiceDate: string;
  PatientId: string;
  PatientName: string;
  PrimaryClaim: string;
  ProviderId: string;
  ProviderName: string;
  Type: number;

  ServiceTransactionToClaimPaymentDtos: FuseServiceLineItem[];

  AllowedAmount: number;
  FinalPayment: boolean;
  PaymentAmount: number | null;
  TotalCharges: number;
  TotalEstimatedInsurance: number;
  TotalEstInsuranceAdj: number;
  TotalPatientBalance: number;

  ApplyInsurancePaymentBackToPatientBenefit: boolean;
  IsReceived: boolean;
  RecreateClaim: boolean;
  Status: number;

  ClaimEntityDataTag: string;
  DataTag: string | null;
  DateModified: string;
  UserModified: string;
};

export type FuseClaimDetailsResponse = FuseApiResponse<FuseClaimDetails>;

// ============================================================================
// Close Claim Types
// ============================================================================

/**
 * Close claim adjustment options.
 * Maps to the radio buttons in the Close Claim modal.
 */
export enum CloseClaimAdjustmentType {
  /**
   * Apply a negative adjustment to the account
   */
  ApplyNegativeAdjustment = '2',
  /**
   * Apply amount unpaid back to the account
   */
  ApplyUnpaidBack = '1',
}

/**
 * Request for PUT /insurance/claims/close
 */
export type FuseCloseClaimRequest = {
  ClaimId: string;
  CloseClaimAdjustment: CloseClaimAdjustmentType;
  DataTag: string;
  IsPaid: boolean;
  NoInsurancePayment: boolean;
  Note: string;
  ReCreateClaim: boolean;
  UpdateServiceTransactions: boolean;
};

export type FuseCloseClaimResponse = FuseApiResponse<{
  ClaimCommonId: string;
  ClaimId: string;
  DataTag: string | null;
  IsReprint: boolean;
  LocationId: number;
  PatientId: string;
  PatientName: string | null;
  Status: number;
  TrackClaim: boolean | null;
  Type: number;
}>;

// ============================================================================
// Claims Search Options
// ============================================================================

export type FuseClaimsSearchOptions = {
  claimStatuses?: number[];
  isReceived?: boolean;
  pageNumber?: number;
  pageSize?: number;
  returnRows?: boolean;
};

// ============================================================================
// Claims Endpoint Factory
// ============================================================================

/**
 * Create the claims endpoint handlers.
 *
 * @param client - The Fuse core client
 * @returns The claims endpoint methods
 */
export const claims = (client: FuseCoreClient) => {
  const { locationId } = client.getConfig();

  return {
    /**
     * Close a claim after payment has been posted.
     *
     * @param params - Close claim parameters
     * @param params.applyNegativeAdjustment - Whether to apply negative adjustment
     * @param params.claimId - The claim ID to close
     * @param params.dataTag - Optimistic concurrency token from getById
     * @param params.note - Optional note for the close action
     * @param params.reCreateClaim - Whether to recreate the claim
     * @returns The close claim response
     */
    close: async (params: {
      applyNegativeAdjustment?: boolean;
      claimId: string;
      dataTag: string;
      note?: string;
      reCreateClaim?: boolean;
    }): Promise<FuseCloseClaimResponse> => {
      const request: FuseCloseClaimRequest = {
        ClaimId: params.claimId,
        CloseClaimAdjustment: params.applyNegativeAdjustment
          ? CloseClaimAdjustmentType.ApplyNegativeAdjustment
          : CloseClaimAdjustmentType.ApplyUnpaidBack,
        DataTag: params.dataTag,
        IsPaid: true,
        NoInsurancePayment: false,
        Note: params.note ?? '',
        ReCreateClaim: params.reCreateClaim ?? false,
        UpdateServiceTransactions: true,
      };

      return client.request<FuseCloseClaimResponse>(
        API_URLS.insurance,
        'PUT',
        'insurance/claims/close?calculateEstimatedInsurance=true&checkDataTag=true',
        { data: request },
      );
    },

    /**
     * Get detailed claim information including service line items.
     *
     * @param claimId - The claim UUID
     * @returns The claim details response
     */
    getById: async (claimId: string): Promise<FuseClaimDetailsResponse> => {
      return client.request<FuseClaimDetailsResponse>(
        API_URLS.insurance,
        'GET',
        `insurance/claims/getClaimById?claimId=${encodeURIComponent(claimId)}`,
      );
    },

    /**
     * Search claims using the claimsGrid endpoint.
     *
     * @param searchText - Patient name or other search text
     * @param options - Additional filter options
     * @returns The claims grid response
     */
    search: async (
      searchText: string,
      options?: FuseClaimsSearchOptions,
    ): Promise<FuseClaimsGridResponse> => {
      const body: FuseClaimsGridRequest = {
        FilterCriteria: {
          CarrierIds: [],
          ClaimStatuses: options?.claimStatuses ?? CLAIM_STATUSES.ALL,
          ClaimTypes: [1],
          DateSubmitted: null,
          HasErrors: true,
          IsReceived: options?.isReceived ?? false,
          LocationIds: [Number.parseInt(locationId, 10)],
          PatientIds: null,
          SearchText: searchText,
        },
        PageNumber: options?.pageNumber,
        PageSize: options?.pageSize,
        ReturnCount: true,
        ReturnRows: options?.returnRows ?? true,
        ReturnTotalFees: true,
      };

      return client.request<FuseClaimsGridResponse>(
        API_URLS.insurance,
        'POST',
        'insurance/claimsGrid',
        { data: body },
      );
    },

    /**
     * Search claims trying both received and non-received states.
     * Returns combined, deduplicated results.
     *
     * @param searchText - Patient name or other search text
     * @param options - Additional filter options (isReceived is ignored)
     * @returns Combined claims grid response
     */
    searchAll: async (
      searchText: string,
      options?: Omit<FuseClaimsSearchOptions, 'isReceived'>,
    ): Promise<FuseClaimsGridResponse> => {
      const searchFn = async (
        isReceived: boolean,
      ): Promise<FuseClaimsGridResponse> => {
        const body: FuseClaimsGridRequest = {
          FilterCriteria: {
            CarrierIds: [],
            ClaimStatuses: options?.claimStatuses ?? CLAIM_STATUSES.ALL,
            ClaimTypes: [1],
            DateSubmitted: null,
            HasErrors: true,
            IsReceived: isReceived,
            LocationIds: [Number.parseInt(locationId, 10)],
            PatientIds: null,
            SearchText: searchText,
          },
          PageNumber: options?.pageNumber,
          PageSize: options?.pageSize,
          ReturnCount: true,
          ReturnRows: options?.returnRows ?? true,
          ReturnTotalFees: true,
        };

        return client.request<FuseClaimsGridResponse>(
          API_URLS.insurance,
          'POST',
          'insurance/claimsGrid',
          { data: body },
        );
      };

      const nonReceivedResponse = await searchFn(false);
      const nonReceivedClaims = nonReceivedResponse.Value?.Rows ?? [];

      const receivedResponse = await searchFn(true);
      const receivedClaims = receivedResponse.Value?.Rows ?? [];

      const seenClaimIds = new Set(
        nonReceivedClaims.map((claim) => claim.ClaimId),
      );
      const combinedClaims = [
        ...nonReceivedClaims,
        ...receivedClaims.filter((claim) => !seenClaimIds.has(claim.ClaimId)),
      ];

      return {
        ...nonReceivedResponse,
        Value: {
          ...nonReceivedResponse.Value,
          Rows: combinedClaims,
          TotalCount: combinedClaims.length,
        },
      };
    },
  };
};
