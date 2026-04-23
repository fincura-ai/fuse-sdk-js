import { type FuseCoreClient } from '../lib/client.js';
import { API_URLS, type FuseApiResponse } from '../lib/types.js';

// ============================================================================
// Appointment Tab Types
// ============================================================================

/**
 * Request payload for POST /patients/AppointmentTab.
 */
export type FuseAppointmentTabRequest = {
  CurrentPage: number;
  FilterCriteria: {
    AppointmentBlocks: null;
    AppointmentDate: [string, string];
    AppointmentDateFrom: string;
    AppointmentDateTo: string;
    AppointmentState: string[];
    AppointmentStatus: string;
    AppointmentStatusList: null;
    AppointmentTypes: string[] | null;
    BusinessDays: null;
    IsActive: [string];
    IsPatient: [string];
    IsScheduled: [string, string];
    LastCommunicationDate: null;
    LocationId: number;
    PatientDateOfBirth: string;
    PatientName: string;
    PreventiveCareDueDateFrom: null;
    PreventiveCareDueDateTo: null;
    Providers: null;
    Rooms: null;
    SoonerIfPossible: null;
  };
  PageCount: number;
  SortCriteria: {
    AppointmentDate: number;
    AppointmentStatus: number;
    PatientDateOfBirth: number;
    PreventiveCareDueDate: number;
  };
};

/**
 * Single appointment row from the AppointmentTab response.
 */
export type FuseAppointmentRow = {
  AppointmentDate: string;
  AppointmentDuration: number;
  AppointmentEndTime: string;
  AppointmentId: string;
  AppointmentStartTime: string;
  AppointmentStatus: string;
  AppointmentTimezone: string;
  AppointmentType: string;
  Classification: number;
  DeletedReason: string | null;
  HasUnreadCommunication: boolean;
  IsActive: boolean;
  IsDeletedFromPatientFile: boolean | null;
  IsPatient: boolean;
  LastCommunicationDate: string | null;
  PatientAccountId: string | null;
  PatientDateOfBirth: string;
  PatientId: string;
  PatientName: string;
  PreventiveCareDueDate: string | null;
  PreviousAppointmentDate: string | null;
  PreviousAppointmentDuration: number | null;
  PreviousAppointmentEndTime: string | null;
  PreviousAppointmentId: string | null;
  PreviousAppointmentStartTime: string | null;
  PreviousAppointmentTimezone: string | null;
  PreviousAppointmentType: string | null;
  ResponsiblePartyId: string;
  ResponsiblePartyName: string;
  UnreadEmailCount: number;
  UnreadSmsCount: number;
};

/**
 * Response wrapper from POST /patients/AppointmentTab.
 * Includes reference data (appointment types, providers) alongside the rows.
 */
export type FuseAppointmentTabResponse = FuseApiResponse<{
  AppointmentTypes: Array<{ Key: string; Value: string }>;
  CurrentPage: number;
  FilterCriteria: Record<string, unknown>;
  PageCount: number;
  Providers: Array<{ Key: string; Value: string }>;
  Rows: FuseAppointmentRow[];
  SortCriteria: Record<string, unknown>;
  TotalCount: number;
}>;

// ============================================================================
// Appointments Endpoint Factory
// ============================================================================

const PAGE_SIZE = 50;

/**
 * Create the appointments endpoint handlers.
 *
 * @param client - The Fuse core client
 * @returns The appointments endpoint methods
 */
export const appointments = (client: FuseCoreClient) => {
  const { locationId } = client.getConfig();
  const numericLocationId = Number.parseInt(locationId, 10);

  return {
    /**
     * Fetch appointments from the AppointmentTab endpoint.
     * Handles pagination internally — returns all rows across pages.
     *
     * @param options - Date range and optional appointment type filter
     * @param options.from - Start of the date range (inclusive)
     * @param options.to - End of the date range (inclusive)
     * @param options.appointmentTypeIds - Optional GUID filter for appointment types
     * @returns All appointment rows merged into a single response
     */
    search: async (options: {
      appointmentTypeIds?: string[];
      from: Date;
      to: Date;
    }): Promise<FuseAppointmentTabResponse> => {
      const buildBody = (page: number): FuseAppointmentTabRequest => ({
        CurrentPage: page,
        FilterCriteria: {
          AppointmentBlocks: null,
          AppointmentDate: ['', ''],
          AppointmentDateFrom: options.from.toISOString(),
          AppointmentDateTo: options.to.toISOString(),
          AppointmentState: ['0|Cancellation', '1|Missed'],
          AppointmentStatus: '',
          AppointmentStatusList: null,
          AppointmentTypes: options.appointmentTypeIds ?? null,
          BusinessDays: null,
          IsActive: ['true'],
          IsPatient: ['true'],
          IsScheduled: ['true', 'false'],
          LastCommunicationDate: null,
          LocationId: numericLocationId,
          PatientDateOfBirth: '',
          PatientName: '',
          PreventiveCareDueDateFrom: null,
          PreventiveCareDueDateTo: null,
          Providers: null,
          Rooms: null,
          SoonerIfPossible: null,
        },
        PageCount: PAGE_SIZE,
        SortCriteria: {
          AppointmentDate: 0,
          AppointmentStatus: 0,
          PatientDateOfBirth: 0,
          PreventiveCareDueDate: 0,
        },
      });

      const fetchPage = (page: number): Promise<FuseAppointmentTabResponse> =>
        client.request<FuseAppointmentTabResponse>(
          API_URLS.service2,
          'POST',
          'patients/AppointmentTab',
          { data: buildBody(page) },
        );

      const firstPage = await fetchPage(0);
      const allRows = [...firstPage.Value.Rows];
      const totalCount = firstPage.Value.TotalCount;

      let currentPage = 1;
      while (allRows.length < totalCount) {
        const nextPage = await fetchPage(currentPage);
        allRows.push(...nextPage.Value.Rows);
        currentPage += 1;
      }

      return {
        ...firstPage,
        Value: {
          ...firstPage.Value,
          Rows: allRows,
          TotalCount: totalCount,
        },
      };
    },
  };
};
