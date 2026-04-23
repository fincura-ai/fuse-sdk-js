import { paymentTypes } from '../../src/endpoints/paymentTypes.js';
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

describe('paymentTypes endpoint', () => {
  let mockClient: jest.Mocked<FuseCoreClient>;
  let paymentTypesEndpoint: ReturnType<typeof paymentTypes>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    paymentTypesEndpoint = paymentTypes(mockClient);
  });

  describe('list', () => {
    it('should return payment types from wrapped response', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [
          {
            CurrencyTypeId: 1,
            DataTag: 'tag-1',
            DateModified: '2025-01-01T00:00:00Z',
            Description: 'EFT',
            IsActive: true,
            PaymentTypeCategory: 2,
            PaymentTypeId: 'eft-uuid',
            Prompt: 'EFT Number',
            UserModified: 'system',
          },
          {
            CurrencyTypeId: 1,
            DataTag: 'tag-2',
            DateModified: '2025-01-01T00:00:00Z',
            Description: 'Check',
            IsActive: true,
            PaymentTypeCategory: 2,
            PaymentTypeId: 'check-uuid',
            Prompt: 'Check Number',
            UserModified: 'system',
          },
        ],
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await paymentTypesEndpoint.list();

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        'paymenttypes/minimal?paymentTypeCategory=2',
      );
      expect(result).toHaveLength(2);
      expect(result[0].Description).toBe('EFT');
    });

    it('should return payment types from unwrapped array', async () => {
      const mockResponse = [
        {
          Description: 'EFT',
          PaymentTypeId: 'eft-uuid',
        },
      ];
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await paymentTypesEndpoint.list();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no payment types', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: [],
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await paymentTypesEndpoint.list();
      expect(result).toHaveLength(0);
    });
  });
});
