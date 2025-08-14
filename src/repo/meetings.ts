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

const NewMeetingRepository = (host: string): MeetingRepository => {
    return {
        GetMeetings: async (status: string, token: string): Promise<Meetings.Response> => {
            try {
                const req = await fetch(`${host}/api/v1/meeting/index`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                });

                let response;
                try {
                    response = await req.json();
                } catch (jsonError) {
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
            } catch (networkError) {
                // Handle network errors (no internet, server down, etc.)
                return {
                    success: false,
                    errors: [{ field: "general", error: "Network error. Please check your connection." }],
                } satisfies Meetings.Response;
            }
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
            // Extract data from FormData (React Native specific) for validation
            const formDataParts = (formData as any)._parts;
            let title = '';
            let type = '';
            let location = '';
            
            if (formDataParts) {
                for (const [key, value] of formDataParts) {
                    if (key === 'title') title = value;
                    if (key === 'type') type = value;
                    if (key === 'location') location = value;
                }
            }
            
            // Client-side validation before API call
            const validationErrors = Meetings.validateMeetingForm({ title, type, location });
            if (Meetings.hasValidationErrors(validationErrors)) {
                const fieldErrors: Meetings.FieldError[] = Object.entries(validationErrors)
                    .filter(([_, error]) => error)
                    .map(([field, error]) => ({ field, error: error! }));
                    
                return {
                    success: false,
                    errors: fieldErrors,
                } satisfies Meetings.Response;
            }
            
            // Convert FormData to the expected JSON structure
            const requestData: {
                meeting: Partial<Meetings.MeetingCreateInfo>;
                participants: Meetings.ParticipantCreateInfo[];
            } = {
                meeting: {},
                participants: []
            };

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
                requestData.meeting.status = "new";
            }

            console.log("=== API Request Debug ===");
            console.log("URL:", `${host}/api/v1/meeting/create`);
            console.log("Request data:", JSON.stringify(requestData, null, 2));
            console.log("Headers:", {
                Authorization: `Bearer ${token}`,
                "Accept": "application/json",
                "Content-Type": "application/json",
            });

            const req = await fetch(`${host}/api/v1/meeting/create`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            console.log("=== API Response Debug ===");
            console.log("Status:", req.status);
            console.log("Status Text:", req.statusText);
            console.log("OK:", req.ok);

            let response;
            try {
                response = await req.json();
                console.log("Response:", response);
            } catch (jsonError) {
                console.error("Failed to parse JSON response:", jsonError);
                console.log("Raw response text:", await req.text());
                return {
                    success: false,
                    errors: [{ field: "general", error: "Invalid server response" }],
                } satisfies Meetings.Response;
            }

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