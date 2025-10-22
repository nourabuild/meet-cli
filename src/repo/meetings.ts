import { fetch } from "expo/fetch";
import { MeetingRepository } from "./repository";
import { Users } from "./users";

export namespace Meetings {
    export type Create = {
        meeting: {
            title: string;
            appointed_at: string;
            status?: string;
        },
        participants: {
            user_id: string;
        }[];
        unverified_participants?: {
            name: string;
            email: string;
        }[];
    }

    export type MeetingCreateInfo = Create['meeting'];
    export type ParticipantCreateInfo = Create['participants'][0];

    export type Meeting = {
        id: string;
        title: string;
        status: string;
        appointed_at: string;
        created_by: string;
        created_at: string;
        updated_at: string;
        participants: Participant[];
        unverified_participants: UnverifiedParticipant[];
        // Legacy fields kept optional for backward compatibility with older API responses
        location?: string | null;
        location_url?: string | null;
        meeting_type?: { title: string };
        start_time?: string;
        owner_id?: string;
        appointed_by?: string | null;
        assigned_to?: string | null;
        type_id?: string;
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

    export type UnverifiedParticipant = {
        id: string;
        meeting_id: string;
        name: string;
        email: string;
        created_at: string;
        updated_at: string;
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
        appointedAt?: Date;
        date?: Date;
        participants?: any[];
        currentUserId?: string;
    }): ValidationErrors => {
        const errors: ValidationErrors = {};

        const titleError = validateTitle(data.title);
        if (titleError) errors.title = titleError;

        if (data.appointedAt) {
            const dateError = validateDate(data.appointedAt);
            if (dateError) errors.date = dateError;
        } else if (data.date) {
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
            const participantsString = formData.get("participants") as string | null;
            let participantIds: string[] = [];
            try {
                participantIds = participantsString ? JSON.parse(participantsString) : [];
            } catch {
                participantIds = [];
            }

            const unverifiedString = formData.get("unverified_participants") as string | null;
            let unverifiedParticipants: { name: string; email: string }[] = [];
            try {
                unverifiedParticipants = unverifiedString ? JSON.parse(unverifiedString) : [];
            } catch {
                unverifiedParticipants = [];
            }

            const title = String(formData.get("title") ?? "").trim();
            const appointedAt = String(formData.get("appointed_at") ?? "") || new Date().toISOString();

            const payload: Meetings.Create = {
                meeting: {
                    title,
                    appointed_at: appointedAt,
                    status: "new",
                },
                participants: participantIds.map((id: string) => ({ user_id: id })),
            };

            if (unverifiedParticipants.length > 0) {
                payload.unverified_participants = unverifiedParticipants;
            }

            console.log("Data being sent to API:", JSON.stringify(payload, null, 2));

            const req = await fetch(`${host}/api/v1/meeting/create`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            let responseBody: any = null;
            try {
                responseBody = await req.json();
            } catch (error) {
                if (!req.ok) {
                    return {
                        success: false,
                        errors: [{ field: "participants", error: "Invalid server response" }],
                    } satisfies Meetings.Response;
                }
            }

            const errorMessages: Record<string, string> = {
                PARTICIPANTS_UNAVAILABLE: "One or more participants are unavailable at the selected time. Please choose a different slot or confirm their availability.",
                MUST_ADD_PARTICIPANT: "At least one participant besides yourself is required.",
                MUST_ADD_PARTICIPANTS: "At least one participant besides yourself is required.",
                CANNOT_ADD_YOURSELF: "You are automatically included as the owner; please remove yourself from the participant list.",
                MUST_BE_IN_FUTURE: "Meeting time must be set in the future.",
            };

            const normalizeFieldErrors = (detail: unknown): Meetings.FieldError[] => {
                if (detail == null) {
                    return [{ field: "participants", error: "Failed to create meeting." }];
                }

                if (typeof detail === "string") {
                    const message = errorMessages[detail] ?? detail;
                    const field = detail.includes("TITLE")
                        ? "title"
                        : detail.includes("TIME")
                            ? "appointed_at"
                            : "participants";
                    return [{ field, error: message }];
                }

                if (Array.isArray(detail)) {
                    return detail.flatMap((entry) => normalizeFieldErrors(entry));
                }

                if (typeof detail === "object") {
                    const record = detail as Record<string, unknown>;

                    if (typeof record.error === "string") {
                        let message = errorMessages[record.error] ?? record.error;
                        if (Array.isArray(record.users) && record.users.length > 0) {
                            const ids = record.users
                                .map((user) => {
                                    if (user && typeof user === "object") {
                                        return (user as Record<string, unknown>).user_id ?? (user as Record<string, unknown>).id;
                                    }
                                    return undefined;
                                })
                                .filter(Boolean)
                                .join(", ");
                            if (ids) {
                                message += ` (affected users: ${ids})`;
                            }
                        }
                        return [{ field: "participants", error: message }];
                    }

                    const entries = Object.entries(record);
                    if (entries.length) {
                        return entries.map(([field, value]) => ({
                            field,
                            error: typeof value === "string" ? (errorMessages[value] ?? value) : JSON.stringify(value),
                        }));
                    }
                }

                return [{ field: "participants", error: "Failed to create meeting." }];
            };

            if (!req.ok) {
                const detail = responseBody?.detail ?? responseBody;
                return {
                    success: false,
                    errors: normalizeFieldErrors(detail),
                } satisfies Meetings.Response;
            }

            const successPayload = responseBody?.data ?? responseBody;
            return {
                success: true,
                data: successPayload,
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
