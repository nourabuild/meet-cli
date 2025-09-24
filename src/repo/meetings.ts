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


    export type FieldError = {
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

    // Form validation types
    export type ValidationErrors = {
        title?: string;
        type?: string;
        location?: string;
        date?: string;
        participants?: string;
    };

    // Validation functions
    export const validateTitle = (title: string): string | undefined => {
        if (!title.trim()) {
            return 'Meeting title is required';
        }
        if (title.trim().length < 3) {
            return 'Meeting title must be at least 3 characters long';
        }
        return undefined;
    };

    export const validateType = (type: string): string | undefined => {
        if (!type.trim()) {
            return 'Meeting type is required';
        }
        if (type.trim().length < 2) {
            return 'Meeting type must be at least 2 characters long';
        }
        return undefined;
    };

    export const validateLocation = (location: string): string | undefined => {
        if (!location.trim()) {
            return 'Location is required';
        }
        if (location.trim().length < 2) {
            return 'Location must be at least 2 characters long';
        }
        return undefined;
    };

    export const validateDate = (date: Date): string | undefined => {
        const now = new Date();
        if (date <= now) {
            return 'Meeting date must be in the future';
        }
        return undefined;
    };

    export const validateParticipants = (participants: any[], currentUserId?: string): string | undefined => {
        // Count participants excluding the current user (owner)
        const otherParticipants = participants.filter(p => p.id !== currentUserId);
        if (otherParticipants.length === 0) {
            return 'At least one participant besides yourself is required';
        }
        return undefined;
    };

    export const validateMeetingForm = (data: {
        title: string;
        type: string;
        location: string;
        date?: Date;
        participants?: any[];
        currentUserId?: string;
    }): ValidationErrors => {
        const errors: ValidationErrors = {};

        const titleError = validateTitle(data.title);
        if (titleError) errors.title = titleError;

        const typeError = validateType(data.type);
        if (typeError) errors.type = typeError;

        const locationError = validateLocation(data.location);
        if (locationError) errors.location = locationError;

        if (data.date) {
            const dateError = validateDate(data.date);
            if (dateError) errors.date = dateError;
        }

        if (data.participants && data.currentUserId) {
            const participantsError = validateParticipants(data.participants, data.currentUserId);
            if (participantsError) errors.participants = participantsError;
        }

        return errors;
    };

    export const hasValidationErrors = (errors: ValidationErrors): boolean => {
        return Object.values(errors).some(error => error !== undefined);
    };

}

const API_ROUTE_DOMAIN = "api/v1/meeting";


const NewMeetingRepository = (host: string): MeetingRepository => {
    return {
        GetMeetings: async (status: string, token: string): Promise<Meetings.Response> => {
            try {
                const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/index`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                });

                let response;
                try {
                    response = await req.json();
                } catch {
                    // Handle cases where response is not valid JSON
                    return {
                        success: false,
                        errors: [{ field: "general", error: "Invalid server response" }],
                    } satisfies Meetings.Response;
                }

                if (!req.ok) {
                    // Handle specific HTTP status codes
                    let errorMessage = "Failed to fetch meetings";

                    if (req.status === 401) {
                        errorMessage = "COULD_NOT_VALIDATE_CREDENTIALS";
                    } else if (req.status === 403) {
                        errorMessage = "Access forbidden";
                    } else if (req.status === 404) {
                        errorMessage = "Meetings endpoint not found";
                    } else if (req.status >= 500) {
                        errorMessage = "Server error. Please try again later.";
                    }

                    return {
                        success: false,
                        errors: response.errors || [{ field: "general", error: errorMessage }],
                    } satisfies Meetings.Response;
                }

                // Your backend returns array directly, not wrapped in {data: ...}
                return {
                    success: true,
                    data: response, // response is already the array of meetings
                } satisfies Meetings.Response;
            } catch {
                // Handle network errors (no internet, server down, etc.)
                return {
                    success: false,
                    errors: [{ field: "general", error: "Network error. Please check your connection." }],
                } satisfies Meetings.Response;
            }
        },
        GetMeetingsRequests: async (status: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/requests`, {
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
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/${id}/approve`, {
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
            // Parse participants from JSON string
            const participantsString = formData.get("participants") as string;
            const participantIds = participantsString ? JSON.parse(participantsString) : [];

            // Prepare request in the expected format
            // status is always "new" in backend
            const data = {
                meeting: {
                    title: formData.get("title"),
                    type: formData.get("type"),
                    status: "new",
                    start_time: formData.get("start_time") || new Date().toISOString(),
                    location: formData.get("location")
                },
                participants: participantIds.map((id: string) => ({ user_id: id }))
            };

            // Debug log what we're sending to the API
            console.log('Data being sent to API:', JSON.stringify(data, null, 2));
            console.log('Participant IDs:', participantIds);
            console.log('Form data participants string:', participantsString);

            const req = await fetch(`${host}/api/v1/meeting/create`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            console.log('HTTP Status:', req.status, req.statusText);
            console.log('Response headers:', req.headers);

            const response = await req.json();
            console.log('Raw API response:', response);

            const errorMessages = {
                PARTICIPANTS_UNAVAILABLE: "One or more participants are unavailable at the selected time. Please choose a different time or check participant availability.",
                VALIDATION_TITLE_TOO_SHORT: "Title is too short",
                VALIDATION_TYPE_TOO_SHORT: "Meeting type is too short",
                VALIDATION_TYPE_REQUIRED: "Meeting type is required",
                VALIDATION_STATUS_INVALID: "Status is invalid",
                VALIDATION_LOCATION_TOO_SHORT: "Location is too short",
                VALIDATION_START_TIME_INVALID: "Start time is invalid",
                VALIDATION_MEETING_REQUIRED: "Meeting type is required",
                CANNOT_ADD_YOURSELF: "Cannot add yourself as a participant",
                MUST_ADD_PARTICIPANTS: "Must add at least one participant",
            } as const;

            // THERE MUST NEVER BE FIELD GENERAL

            if (!req.ok) {
                let processedErrors: Meetings.FieldError[] = [];

                if (response.errors && typeof response.errors === 'string') {
                    // Handle single error string format like "PARTICIPANTS_UNAVAILABLE"
                    const friendlyMessage = errorMessages[response.errors as keyof typeof errorMessages] || response.errors;
                    // Map specific error codes to appropriate fields, avoid "general"
                    let field = "participants"; // Default field for most errors
                    if (response.errors.includes("TITLE")) field = "title";
                    else if (response.errors.includes("TYPE")) field = "type";
                    else if (response.errors.includes("LOCATION")) field = "location";
                    else if (response.errors.includes("START_TIME")) field = "start_time";
                    
                    processedErrors = [{ field, error: friendlyMessage }];
                } else if (response.errors && typeof response.errors === 'object') {
                    // Handle object format like {"title": "VALIDATION_TITLE_TOO_SHORT"}
                    processedErrors = Object.entries(response.errors).map(([field, errorCode]) => ({
                        field,
                        error: errorMessages[errorCode as keyof typeof errorMessages] || errorCode
                    }));
                }

                return {
                    success: false,
                    errors: processedErrors,
                } satisfies Meetings.Response;
            }

            if (response.errors?.length) {
                return {
                    success: false,
                    errors: response.errors.map(({ field, error }: Meetings.FieldError) => ({
                        field,
                        error: errorMessages[error as keyof typeof errorMessages] ?? error,
                    })),
                } satisfies Meetings.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Meetings.Response;

        },


        GetMeetingById: async (id: string, token: string): Promise<Meetings.Response> => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/${id}`, {
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
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/${id}/participants`, {
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
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/${id}`, {
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
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/participants`, {
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
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/participants/${id}`, {
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