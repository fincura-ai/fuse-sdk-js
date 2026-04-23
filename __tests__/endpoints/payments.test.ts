import { payments } from '../../src/endpoints/payments.js';
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

describe('payments endpoint', () => {
  let mockClient: jest.Mocked<FuseCoreClient>;
  let paymentsEndpoint: ReturnType<typeof payments>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    paymentsEndpoint = payments(mockClient);
  });

  describe('postBulkInsurancePayment', () => {
    it('should send POST with bulk payment request', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          BulkCreditTransactionId: 12_345,
          BulkCreditTransactionType: 2,
          CarrierId: 'carrier-1',
          CreditTransactions: [],
          DataTag: 'tag-1',
          DateEntered: '2025-01-01T00:00:00Z',
          EnteredByUserId: 'user-1',
          IsAuthorized: true,
          IsDeposited: false,
          LocationId: 14_817,
          Note: '',
          PaymentTypeId: 'eft-uuid',
          PaymentTypePromptValue: 'TRACE123',
        },
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await paymentsEndpoint.postBulkInsurancePayment({
        accountId: 'account-1',
        carrierId: 'carrier-1',
        checkOrEftNumber: 'TRACE123',
        claimId: 'claim-1',
        paymentTypeId: 'eft-uuid',
        servicePayments: [
          {
            accountMemberId: 'member-1',
            amount: 50,
            encounterId: 'encounter-1',
            providerId: 'provider-1',
            serviceTransactionId: 'svc-1',
          },
        ],
        totalAmount: 50,
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'accounts/bulkInsurancePayment',
        expect.objectContaining({
          data: expect.objectContaining({
            BulkCreditTransactionType: 2,
            CarrierId: 'carrier-1',
            LocationId: 14_817,
          }),
        }),
      );
      expect(result.Value.BulkCreditTransactionId).toBe(12_345);
    });
  });

  describe('calculateCreditDistribution', () => {
    it('should send POST with service line items and amount', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [
          {
            Amount: 50,
            AppliedToServiceTransationId: 'svc-1',
            CreditTransactionDetailId: 'detail-1',
          },
        ],
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const serviceLineItems = [
        { Description: 'D4910: test', ServiceTransactionId: 'svc-1' },
      ] as Parameters<typeof paymentsEndpoint.calculateCreditDistribution>[0];

      const result = await paymentsEndpoint.calculateCreditDistribution(
        serviceLineItems,
        50,
      );

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'accounts/claimservicetransactions/creditdistribution?Amount=50',
        expect.objectContaining({
          data: serviceLineItems,
        }),
      );
      expect(result.Value).toHaveLength(1);
    });
  });

  describe('validatePaymentAmounts', () => {
    it('should return valid when amounts are within limits', async () => {
      const mockDistribution = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [
          {
            Amount: 100,
            AppliedToServiceTransationId: 'svc-1',
          },
        ],
      };
      mockClient.request.mockResolvedValueOnce(mockDistribution);

      const serviceLineItems = [
        {
          Description: 'D4910: periodontal maintenance (D4910)',
          ServiceTransactionId: 'svc-1',
        },
      ] as Parameters<typeof paymentsEndpoint.validatePaymentAmounts>[0];

      const eraPayments = new Map([['D4910', 50]]);

      const result = await paymentsEndpoint.validatePaymentAmounts(
        serviceLineItems,
        eraPayments,
        50,
      );

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.serviceMatches[0].canPost).toBe(true);
    });

    it('should return invalid when amount exceeds limit', async () => {
      const mockDistribution = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [
          {
            Amount: 30,
            AppliedToServiceTransationId: 'svc-1',
          },
        ],
      };
      mockClient.request.mockResolvedValueOnce(mockDistribution);

      const serviceLineItems = [
        {
          Description: 'D4910: periodontal maintenance (D4910)',
          ServiceTransactionId: 'svc-1',
        },
      ] as Parameters<typeof paymentsEndpoint.validatePaymentAmounts>[0];

      const eraPayments = new Map([['D4910', 50]]);

      const result = await paymentsEndpoint.validatePaymentAmounts(
        serviceLineItems,
        eraPayments,
        50,
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.serviceMatches[0].canPost).toBe(false);
    });
  });
});
