import { fetch } from "expo/fetch";
import { MeetingRepository } from "./repository";
import { Users } from "./users";

export namespace Meetings {
    export type Create = {
        meeting: {
            title: string;
            type_id: string;
            status?: string;
            start_time?: string;
            location?: string;
            location_url?: string;
            appointed_by?: string | null;
            assigned_to?: string | null;
        },
        participants: {
            user_id: string;
        }[];
    }

    export type MeetingCreateInfo = Create['meeting'];
    export type ParticipantCreateInfo = Create['participants'][0];

    export type MeetingType = {
        id: string;
        title: string;
        created_at: string;
        updated_at: string;
    };

    export type Meeting = {
        id: string;
        title: string;
        appointed_by: string | null;
        assigned_to: string | null;
        owner_id: string;
        type_id: string;
        status: string;
        start_time: string;
        location: string;
        location_url: string;
        created_at: string;
        updated_at: string;
        meeting_type: MeetingType;
        participants: Participant[];
    };

    export type Participant = {
        id: string;
        meeting_id: string;
        user_id: string;
        status: string;
        created_at: string;
        updated_at: string;
        user: Users.User;
    };


    type FieldError = {
        field: string;
        error: string;
    };

    type SuccessResponse = {
        success: true;
        data: Meeting | Meeting[] | Participant | Participant[];
    };

    type FailureResponse = {
        success: false;
        errors: FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;

}

const NewMeetingRepository = (host: string): MeetingRepository => {
    return {
        GetMeetings: async (status: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meeting/index`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to fetch meetings" }],
                } satisfies Meetings.Response;
            }

            // Your backend returns array directly, not wrapped in {data: ...}
            return {
                success: true,
                data: response, // response is already the array of meetings
            } satisfies Meetings.Response;
        },
        GetMeetingsRequests: async (status: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meeting/requests`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to fetch meeting requests" }],
                } satisfies Meetings.Response;
            }

            // Response is a direct array, not wrapped in {data: ...}
            return {
                success: true,
                data: response, // response is already the array of participants
            } satisfies Meetings.Response;
        },
        ApproveMeetingByParticipant: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meeting/${id}/approve`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to approve meeting" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Meetings.Response;
        },

        RejectMeetingByParticipant: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meeting/${id}/decline`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to reject meeting" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Meetings.Response;
        },

        CreateMeetingWithParticipants: async (formData: FormData, token: string): Promise<Meetings.Response> => {
            // Convert FormData to the expected JSON structure
            const requestData: {
                meeting: Partial<Meetings.MeetingCreateInfo>;
                participants: Meetings.ParticipantCreateInfo[];
            } = {
                meeting: {},
                participants: []
            };

            // Extract data from FormData (React Native specific)
            const formDataParts = (formData as any)._parts;

            if (formDataParts) {
                for (const [key, value] of formDataParts) {
                    if (key.startsWith('participants[')) {
                        requestData.participants.push({ user_id: value });
                    } else {
                        let processedValue = value;

                        // Process specific fields
                        if (key === 'type') {
                            // Send type as string - API will convert to type_id internally
                            processedValue = value;
                        } else if (key === 'type_id') {
                            // Handle UUID type_id if provided
                            processedValue = value;
                        } else if (key === 'location' && (!value || value.trim() === '')) {
                            processedValue = 'TBD';
                        } else if (key === 'location_url' && (!value || value.trim() === '')) {
                            processedValue = '';
                        }

                        (requestData.meeting as any)[key] = processedValue;
                    }
                }
            }

            // Set default status if not provided
            if (!requestData.meeting.status) {
                requestData.meeting.status = "pending";
            }

            const req = await fetch(`${host}/api/v1/meeting/create`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to create meeting" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Meetings.Response;
        },

        GetMeetingById: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meeting/${id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to fetch meeting" }],
                } satisfies Meetings.Response;
            }

            // Handle both wrapped (response.data) and direct response formats
            const meetingData = response.data || response;

            return {
                success: true,
                data: meetingData,
            } satisfies Meetings.Response;
        },

        GetParticipantsByMeetingId: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meetings/${id}/participants`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to fetch participants" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Meetings.Response;
        },

        DeleteMeetingById: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meetings/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to delete meeting" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Meetings.Response;
        },

        AddParticipant: async (formData: FormData, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meetings/participants`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
                body: formData,
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to add participant" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Meetings.Response;
        },

        DeleteParticipant: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/api/v1/meetings/participants/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to delete participant" }],
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Meetings.Response;
        },

    };
};

export default NewMeetingRepository;