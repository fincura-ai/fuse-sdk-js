import { claims } from '../../src/endpoints/claims.js';
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

describe('claims endpoint', () => {
  let mockClient: jest.Mocked<FuseCoreClient>;
  let claimsEndpoint: ReturnType<typeof claims>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    claimsEndpoint = claims(mockClient);
  });

  describe('search', () => {
    it('should send POST to claimsGrid with search text', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          CurrentPage: 1,
          FilterCriteria: {},
          PageCount: 1,
          ReturnCount: true,
          ReturnRows: true,
          ReturnTotalFees: true,
          Rows: [
            {
              ClaimId: 'claim-1',
              PatientFirstName: 'John',
              PatientLastName: 'Smith',
            },
          ],
          SortCriteria: {},
          TotalCount: 1,
          TotalFees: 100,
        },
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await claimsEndpoint.search('Smith');

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'insurance/claimsGrid',
        expect.objectContaining({
          data: expect.objectContaining({
            FilterCriteria: expect.objectContaining({
              LocationIds: [14_817],
              SearchText: 'Smith',
            }),
          }),
        }),
      );
      expect(result.Value.Rows).toHaveLength(1);
    });

    it('should return empty rows when no results', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          CurrentPage: 1,
          FilterCriteria: {},
          PageCount: 0,
          ReturnCount: true,
          ReturnRows: true,
          ReturnTotalFees: true,
          Rows: [],
          SortCriteria: {},
          TotalCount: 0,
          TotalFees: 0,
        },
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await claimsEndpoint.search('NonExistent');
      expect(result.Value.Rows).toHaveLength(0);
    });
  });

  describe('searchAll', () => {
    it('should merge received and non-received results', async () => {
      const nonReceivedResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          CurrentPage: 1,
          FilterCriteria: {},
          PageCount: 1,
          ReturnCount: true,
          ReturnRows: true,
          ReturnTotalFees: true,
          Rows: [{ ClaimId: 'claim-1' }, { ClaimId: 'claim-2' }],
          SortCriteria: {},
          TotalCount: 2,
          TotalFees: 200,
        },
      };
      const receivedResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          CurrentPage: 1,
          FilterCriteria: {},
          PageCount: 1,
          ReturnCount: true,
          ReturnRows: true,
          ReturnTotalFees: true,
          Rows: [{ ClaimId: 'claim-2' }, { ClaimId: 'claim-3' }],
          SortCriteria: {},
          TotalCount: 2,
          TotalFees: 200,
        },
      };

      mockClient.request
        .mockResolvedValueOnce(nonReceivedResponse)
        .mockResolvedValueOnce(receivedResponse);

      const result = await claimsEndpoint.searchAll('Smith');

      // Should deduplicate claim-2
      expect(result.Value.Rows).toHaveLength(3);
      expect(result.Value.TotalCount).toBe(3);
    });
  });

  describe('getById', () => {
    it('should send GET with encoded claimId', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          ClaimId: 'test-uuid',
          ServiceTransactionToClaimPaymentDtos: [],
        },
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await claimsEndpoint.getById('test-uuid');

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        'insurance/claims/getClaimById?claimId=test-uuid',
      );
      expect(result.Value.ClaimId).toBe('test-uuid');
    });
  });

  describe('close', () => {
    it('should send PUT with close claim request', async () => {
      const mockResponse = {
        Count: null,
        ExtendedStatusCode: null,
        InvalidProperties: null,
        Value: {
          ClaimId: 'test-uuid',
          Status: 8,
        },
      };
      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await claimsEndpoint.close({
        claimId: 'test-uuid',
        dataTag: 'tag-123',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'PUT',
        'insurance/claims/close?calculateEstimatedInsurance=true&checkDataTag=true',
        expect.objectContaining({
          data: expect.objectContaining({
            ClaimId: 'test-uuid',
            DataTag: 'tag-123',
            IsPaid: true,
          }),
        }),
      );
      expect(result.Value.Status).toBe(8);
    });
  });
});
