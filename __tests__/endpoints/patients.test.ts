import { patients } from '../../src/endpoints/patients.js';
import { type FuseCoreClient } from '../../src/lib/client.js';

const createMockClient = (): jest.Mocked<FuseCoreClient> => ({
  getConfig: jest.fn().mockReturnValue({
    accessToken: 'mock-token',
    locationId: '14817',
    practiceId: 'mock-practice',
  }),
  isTokenExpired: jest.fn().mockReturnValue(false),
  request: jest.fn(),
  updateToken: jest.fn(),
});

const mockDashboardResponse = {
  Count: null,
  ExtendedStatusCode: null,
  InvalidProperties: null,
  Value: {
    BenefitPlans: [
      {
        BenefitPlanId: 'bp-1',
        EffectiveDate: '2024-01-01',
        MemberId: 'member-123',
        PatientBenefitPlanId: 'pbp-1',
        PatientId: 'patient-1',
        PolicyHolderBenefitPlanDto: {
          BenefitPlanDto: {
            BenefitId: 'benefit-1',
            Carrier: {
              CarrierId: 'carrier-1',
              Name: 'Delta Dental',
              PayerId: 'payer-1',
            },
            CarrierName: 'Delta Dental',
            Name: 'PPO Plan',
            PlanGroupNumber: 'GRP-123',
          },
          PolicyHolderBenefitPlanId: 'phbp-1',
          PolicyHolderId: 'holder-1',
        },
        PolicyHolderDetails: {
          DateOfBirth: '1970-05-15',
          FirstName: 'Jane',
          LastName: 'Doe',
          PatientId: 'holder-patient-1',
        },
        PolicyHolderId: 'holder-1',
        PolicyHolderStringId: null,
        Priority: 0,
        RelationshipToPolicyHolder: 'Self',
      },
    ],
    PatientId: 'patient-1',
  },
};

describe('patients endpoint', () => {
  let mockClient: jest.Mocked<FuseCoreClient>;
  let patientsEndpoint: ReturnType<typeof patients>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    patientsEndpoint = patients(mockClient);
  });

  describe('getDashboard', () => {
    it('should call GET /patients/{patientId}/dashboard', async () => {
      mockClient.request.mockResolvedValueOnce(mockDashboardResponse);

      await patientsEndpoint.getDashboard('patient-1');

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        'patients/patient-1/dashboard',
      );
    });

    it('should return the dashboard response', async () => {
      mockClient.request.mockResolvedValueOnce(mockDashboardResponse);

      const result = await patientsEndpoint.getDashboard('patient-1');

      expect(result.Value.PatientId).toBe('patient-1');
      expect(result.Value.BenefitPlans).toHaveLength(1);
      expect(result.Value.BenefitPlans[0].BenefitPlanId).toBe('bp-1');
    });

    it('should URL-encode special characters in patientId', async () => {
      mockClient.request.mockResolvedValueOnce(mockDashboardResponse);

      await patientsEndpoint.getDashboard('patient-uuid-1234');

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        'patients/patient-uuid-1234/dashboard',
      );
    });

    it('should return benefit plan carrier details', async () => {
      mockClient.request.mockResolvedValueOnce(mockDashboardResponse);

      const result = await patientsEndpoint.getDashboard('patient-1');
      const plan = result.Value.BenefitPlans[0];

      expect(plan.PolicyHolderBenefitPlanDto.BenefitPlanDto.Carrier.Name).toBe(
        'Delta Dental',
      );
      expect(plan.Priority).toBe(0);
    });
  });
});
