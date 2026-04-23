import { adjustments } from './endpoints/adjustments.js';
import { appointments } from './endpoints/appointments.js';
import { claims } from './endpoints/claims.js';
import { patients } from './endpoints/patients.js';
import { payments } from './endpoints/payments.js';
import { paymentTypes } from './endpoints/paymentTypes.js';
import { fuseClient } from './lib/client.js';
import { type FuseApiConfig } from './lib/types.js';

export { extractConfigFromToken, extractProcedureCode } from './lib/helpers.js';
export {
  createConsoleLogger,
  createNoOpLogger,
  type Logger,
  setLogger,
} from './lib/logger.js';
export * from './lib/types.js';

// Endpoints specific types
export {
  type FuseAdjustmentDetail,
  type FuseAdjustmentRequest,
  type FuseAdjustmentResponse,
  type FuseAdjustmentType,
} from './endpoints/adjustments.js';
export {
  type FuseAppointmentRow,
  type FuseAppointmentTabRequest,
  type FuseAppointmentTabResponse,
} from './endpoints/appointments.js';
export {
  CloseClaimAdjustmentType,
  type FuseClaimDetails,
  type FuseClaimDetailsResponse,
  type FuseClaimRow,
  type FuseClaimsGridRequest,
  type FuseClaimsGridResponse,
  type FuseClaimsSearchOptions,
  type FuseCloseClaimRequest,
  type FuseCloseClaimResponse,
  type FuseServiceLineItem,
} from './endpoints/claims.js';
export {
  type FuseDashboardBenefitPlan,
  type FuseDashboardBenefitPlanEntry,
  type FuseDashboardCarrier,
  type FuseDashboardPolicyHolderBenefitPlan,
  type FuseDashboardPolicyHolderDetails,
  type FusePatientDashboardResponse,
} from './endpoints/patients.js';
export {
  type FuseBulkCreditTransaction,
  type FuseBulkInsurancePaymentRequest,
  type FuseBulkInsurancePaymentResponse,
  type FuseCreditDistributionItem,
  type FuseCreditDistributionResponse,
  type FuseCreditTransaction,
  type FuseCreditTransactionDetail,
  type FusePaymentValidationResult,
} from './endpoints/payments.js';
export { type FusePaymentType } from './endpoints/paymentTypes.js';

/**
 * Create a Fuse EHR API client.
 *
 * The Fuse API requires a JWT access token obtained externally from the
 * Patterson Fuse login flow (e.g., via Playwright browser automation).
 *
 * @param config - Configuration including access token, practice ID, and location ID
 * @returns The Fuse client instance
 *
 * @example
 * ```typescript
 * const fuse = createFuseClient({
 *   accessToken: 'your-jwt-token',
 *   practiceId: 'your-practice-id',
 *   locationId: 'your-location-id',
 * });
 *
 * // Search for claims
 * const results = await fuse.claims.search('Smith');
 *
 * // Get claim details
 * const claim = await fuse.claims.getById('claim-uuid');
 *
 * // Get payment types
 * const types = await fuse.paymentTypes.list();
 * ```
 */
export const createFuseClient = (config: FuseApiConfig) => {
  const client = fuseClient(config);

  return {
    /**
     * Get the current configuration (read-only copy).
     */
    getConfig: client.getConfig,

    /**
     * Check if the current JWT token is expired.
     * Returns true if the token cannot be parsed or is past its expiration.
     */
    isTokenExpired: client.isTokenExpired,

    /**
     * Update the access token (e.g., after re-authenticating via browser).
     *
     * @param newToken - The new JWT access token
     */
    updateToken: client.updateToken,

    /**
     * Adjustments management endpoints.
     * Post adjustments (write-offs) and list adjustment types.
     */
    adjustments: adjustments(client),

    /**
     * Appointments management endpoints.
     * Search appointments across a date range with optional type filtering.
     */
    appointments: appointments(client),

    /**
     * Claims management endpoints.
     * Search, get details, and close claims.
     */
    claims: claims(client),

    /**
     * Payment types management endpoints.
     * List available insurance payment types.
     */
    paymentTypes: paymentTypes(client),

    /**
     * Patients management endpoints.
     * Fetch patient dashboard data including benefit plans.
     */
    patients: patients(client),

    /**
     * Payments management endpoints.
     * Post bulk insurance payments, calculate credit distributions,
     * and validate payment amounts.
     */
    payments: payments(client),

    // Internal reference for advanced usage
    _client: client,
  };
};

export type FuseClient = ReturnType<typeof createFuseClient>;

export default createFuseClient;
