import { type FuseCoreClient } from '../lib/client.js';
import { API_URLS, type FuseApiResponse } from '../lib/types.js';

// ============================================================================
// Patient Dashboard Types
// ============================================================================

/**
 * Carrier (payer) nested inside a BenefitPlan.
 */
export type FuseDashboardCarrier = {
  CarrierId: string;
  Name: string;
  PayerId: string;
};

/**
 * Benefit plan details nested inside PolicyHolderBenefitPlanDto.
 */
export type FuseDashboardBenefitPlan = {
  BenefitId: string;
  Carrier: FuseDashboardCarrier;
  CarrierName: string;
  Name: string;
  PlanGroupNumber: string | null;
};

/**
 * Policy holder benefit plan wrapper.
 */
export type FuseDashboardPolicyHolderBenefitPlan = {
  BenefitPlanDto: FuseDashboardBenefitPlan;
  PolicyHolderBenefitPlanId: string;
  PolicyHolderId: string;
};

/**
 * Minimal profile for the policy holder (subscriber).
 */
export type FuseDashboardPolicyHolderDetails = {
  DateOfBirth: string;
  FirstName: string;
  LastName: string;
  PatientId: string;
};

/**
 * A single benefit plan entry from the patient dashboard.
 */
export type FuseDashboardBenefitPlanEntry = {
  BenefitPlanId: string;
  EffectiveDate: string | null;
  MemberId: string | null;
  PatientBenefitPlanId: string;
  PatientId: string;
  PolicyHolderBenefitPlanDto: FuseDashboardPolicyHolderBenefitPlan;
  PolicyHolderDetails: FuseDashboardPolicyHolderDetails;
  PolicyHolderId: string;
  PolicyHolderStringId: string | null;
  Priority: number;
  RelationshipToPolicyHolder: string | null;
};

/**
 * Response from GET /patients/{patientId}/dashboard.
 * Only the fields needed for insurance extraction are typed.
 */
export type FusePatientDashboardResponse = FuseApiResponse<{
  BenefitPlans: FuseDashboardBenefitPlanEntry[];
  PatientId: string;
}>;

// ============================================================================
// Patients Endpoint Factory
// ============================================================================

/**
 * Create the patients endpoint handlers.
 *
 * @param client - The Fuse core client
 * @returns The patients endpoint methods
 */
export const patients = (client: FuseCoreClient) => {
  return {
    /**
     * Fetch the patient dashboard including benefit plans (insurance).
     *
     * @param patientId - Fuse patient GUID
     * @returns Dashboard response containing benefit plans and patient info
     */
    getDashboard: async (
      patientId: string,
    ): Promise<FusePatientDashboardResponse> => {
      return client.request<FusePatientDashboardResponse>(
        API_URLS.service2,
        'GET',
        `patients/${patientId}/dashboard`,
      );
    },
  };
};
