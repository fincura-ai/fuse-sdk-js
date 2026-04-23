import { appointments } from '../../src/endpoints/appointments.js';
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

const makeRow = (id: string) => ({
  AppointmentDate: '2025-06-01',
  AppointmentDuration: 60,
  AppointmentEndTime: '10:00',
  AppointmentId: id,
  AppointmentStartTime: '09:00',
  AppointmentStatus: 'Missed',
  AppointmentTimezone: 'Central Standard Time',
  AppointmentType: 'Hygiene',
  Classification: 0,
  DeletedReason: null,
  HasUnreadCommunication: false,
  IsActive: true,
  IsDeletedFromPatientFile: null,
  IsPatient: true,
  LastCommunicationDate: null,
  PatientAccountId: null,
  PatientDateOfBirth: '1990-01-01',
  PatientId: 'patient-1',
  PatientName: 'John Doe',
  PreventiveCareDueDate: null,
  PreviousAppointmentDate: null,
  PreviousAppointmentDuration: null,
  PreviousAppointmentEndTime: null,
  PreviousAppointmentId: null,
  PreviousAppointmentStartTime: null,
  PreviousAppointmentTimezone: null,
  PreviousAppointmentType: null,
  ResponsiblePartyId: 'rp-1',
  ResponsiblePartyName: 'Jane Doe',
  UnreadEmailCount: 0,
  UnreadSmsCount: 0,
});

const makeResponse = (
  rows: Array<ReturnType<typeof makeRow>>,
  totalCount: number,
  currentPage = 0,
) => ({
  Count: null,
  ExtendedStatusCode: null,
  InvalidProperties: null,
  Value: {
    AppointmentTypes: [{ Key: 'type-1', Value: 'Hygiene' }],
    CurrentPage: currentPage,
    FilterCriteria: {},
    PageCount: 50,
    Providers: [] as Array<{ Key: string; Value: string }>,
    Rows: rows,
    SortCriteria: {},
    TotalCount: totalCount,
  },
});

describe('appointments endpoint', () => {
  let mockClient: jest.Mocked<FuseCoreClient>;
  let appointmentsEndpoint: ReturnType<typeof appointments>;

  const from = new Date('2025-06-01T00:00:00.000Z');
  const to = new Date('2025-06-30T23:59:59.999Z');

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    appointmentsEndpoint = appointments(mockClient);
  });

  describe('search', () => {
    it('should call POST /patients/AppointmentTab with correct body', async () => {
      const row = makeRow('appt-1');
      mockClient.request.mockResolvedValueOnce(makeResponse([row], 1));

      await appointmentsEndpoint.search({ from, to });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'patients/AppointmentTab',
        expect.objectContaining({
          data: expect.objectContaining({
            CurrentPage: 0,
            FilterCriteria: expect.objectContaining({
              AppointmentDateFrom: from.toISOString(),
              AppointmentDateTo: to.toISOString(),
              IsActive: ['true'],
              IsPatient: ['true'],
              IsScheduled: ['true', 'false'],
              LocationId: 14_817,
            }),
            PageCount: 50,
          }),
        }),
      );
    });

    it('should return all rows in a single page', async () => {
      const rows = [makeRow('appt-1'), makeRow('appt-2')];
      mockClient.request.mockResolvedValueOnce(makeResponse(rows, 2));

      const result = await appointmentsEndpoint.search({ from, to });

      expect(mockClient.request).toHaveBeenCalledTimes(1);
      expect(result.Value.Rows).toHaveLength(2);
      expect(result.Value.TotalCount).toBe(2);
    });

    it('should paginate until all rows are fetched', async () => {
      const page0Rows = [makeRow('appt-1'), makeRow('appt-2')];
      const page1Rows = [makeRow('appt-3')];

      mockClient.request
        .mockResolvedValueOnce(makeResponse(page0Rows, 3, 0))
        .mockResolvedValueOnce(makeResponse(page1Rows, 3, 1));

      const result = await appointmentsEndpoint.search({ from, to });

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result.Value.Rows).toHaveLength(3);
      expect(result.Value.Rows.map((row) => row.AppointmentId)).toEqual([
        'appt-1',
        'appt-2',
        'appt-3',
      ]);
      expect(result.Value.TotalCount).toBe(3);
    });

    it('should pass the correct page number on subsequent fetches', async () => {
      const page0Rows = [makeRow('appt-1')];
      const page1Rows = [makeRow('appt-2')];

      mockClient.request
        .mockResolvedValueOnce(makeResponse(page0Rows, 2, 0))
        .mockResolvedValueOnce(makeResponse(page1Rows, 2, 1));

      await appointmentsEndpoint.search({ from, to });

      const [, secondCall] = mockClient.request.mock.calls;
      expect(secondCall[3]).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({ CurrentPage: 1 }),
        }),
      );
    });

    it('should pass appointmentTypeIds filter when provided', async () => {
      mockClient.request.mockResolvedValueOnce(makeResponse([], 0));

      await appointmentsEndpoint.search({
        appointmentTypeIds: ['type-uuid-1'],
        from,
        to,
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'patients/AppointmentTab',
        expect.objectContaining({
          data: expect.objectContaining({
            FilterCriteria: expect.objectContaining({
              AppointmentTypes: ['type-uuid-1'],
            }),
          }),
        }),
      );
    });

    it('should pass null for AppointmentTypes when no filter provided', async () => {
      mockClient.request.mockResolvedValueOnce(makeResponse([], 0));

      await appointmentsEndpoint.search({ from, to });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        'patients/AppointmentTab',
        expect.objectContaining({
          data: expect.objectContaining({
            FilterCriteria: expect.objectContaining({
              AppointmentTypes: null,
            }),
          }),
        }),
      );
    });

    it('should return reference data (AppointmentTypes, Providers) from first page', async () => {
      const response = makeResponse([makeRow('appt-1')], 1);
      response.Value.AppointmentTypes = [{ Key: 'type-1', Value: 'Hygiene' }];
      response.Value.Providers = [{ Key: 'prov-1', Value: 'Dr. Smith' }];
      mockClient.request.mockResolvedValueOnce(response);

      const result = await appointmentsEndpoint.search({ from, to });

      expect(result.Value.AppointmentTypes).toEqual([
        { Key: 'type-1', Value: 'Hygiene' },
      ]);
      expect(result.Value.Providers).toEqual([
        { Key: 'prov-1', Value: 'Dr. Smith' },
      ]);
    });
  });
});
