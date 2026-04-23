import { adjustments } from '../../src/endpoints/adjustments.js';
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

describe('adjustments endpoint', () => {
  let mockClient: jest.Mocked<FuseCoreClient>;
  let adjustmentsEndpoint: ReturnType<typeof adjustments>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    adjustmentsEndpoint = adjustments(mockClient);
  });

  describe('getTypes', () => {
    it('should return adjustment types from wrapped response', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [
          {
            AdjustmentTypeId: 'adj-1',
            Description: 'Insurance Write-off',
            IsActive: true,
            Name: 'Write-off',
          },
        ],
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await adjustmentsEndpoint.getTypes();

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        'adjustmenttypes?active=true',
      );
      expect(result).toHaveLength(1);
      expect(result[0].Name).toBe('Write-off');
    });

    it('should return adjustment types from unwrapped array', async () => {
      const mockResponse = [
        {
          AdjustmentTypeId: 'adj-1',
          Description: 'Insurance Write-off',
          IsActive: true,
          Name: 'Write-off',
        },
      ];
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await adjustmentsEndpoint.getTypes();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no types', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [],
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await adjustmentsEndpoint.getTypes();
      expect(result).toHaveLength(0);
    });
  });

  describe('post', () => {
    it('should send POST with adjustment request', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          Amount: -25,
          CreditTransactionDetails: [
            {
              Amount: -25,
              AppliedToServiceTransationId: 'svc-1',
              CreditTransactionDetailId: 'detail-1',
              DateCompleted: '2025-01-01T00:00:00Z',
            },
          ],
          CreditTransactionId: 'txn-1',
          Description: '',
        },
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await adjustmentsEndpoint.post({
        accountId: 'account-1',
        adjustmentTypeId: 'adj-1',
        serviceAdjustments: [
          {
            accountMemberId: 'member-1',
            amount: -25,
            dataTag: 'tag-1',
            encounterId: 'encounter-1',
            providerId: 'provider-1',
            serviceTransactionId: 'svc-1',
          },
        ],
        totalAmount: -25,
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'accounts/account-1/credittransaction',
        expect.objectContaining({
          data: expect.objectContaining({
            AccountId: 'account-1',
            AdjustmentTypeId: 'adj-1',
            Amount: -25,
            TransactionTypeId: 4,
          }),
        }),
      );
      expect(result.Value.CreditTransactionId).toBe('txn-1');
    });
  });
});
