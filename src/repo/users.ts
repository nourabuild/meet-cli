import { fetch } from "expo/fetch";
import { UserRepository } from "./repository";

export namespace Users {
    export type User = {
        id: string;
        name: string;
        email: string;
        account: string;
        roles: string;
        is_active: boolean;
        is_verified: boolean;
        is_superuser: boolean;
        bio: string | null;
        dob: string | null;
        phone: string | null;
        avatar_photo_id: string | null;
        deleted_at: string | null;
        created_at: string;
        updated_at: string;
    };

    export type OnboardingStatus = {
        completed: boolean;
    };

    type FieldError = {
        field: string;
        error: string;
    };

    type SuccessResponse = {
        success: true;
        data: User;
    };

    type FailureResponse = {
        success: false;
        errors: FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;

    type OnboardingSuccessResponse = {
        success: true;
        data: OnboardingStatus;
    };

    export type OnboardingResponse = OnboardingSuccessResponse | FailureResponse;

    // Separate type for search results that includes count and data array
    export type SearchResponse = {
        success: true;
        data: {
            count: number;
            data: User[];
        };
    } | {
        success: false;
        errors: FieldError[];
    };
}

const API_ROUTE_DOMAIN = "api/v1/user";

const NewUserRepository = (host: string): UserRepository => {
    return {
        GetByAccount: async (account: string, token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/${account}/lookup`, {
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
                console.error("GetByAccount: Failed to parse JSON response:", jsonError);

                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "account", error: "Server error. Please try again later." }],
                    } satisfies Users.Response;
                }

                return {
                    success: false,
                    errors: [{ field: "account", error: "Invalid response from server." }],
                } satisfies Users.Response;
            }

            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "account", error: "Server error. Please try again later." }],
                    } satisfies Users.Response;
                }

                const errorMessage = typeof response?.errors === "object"
                    ? Object.values(response.errors).join(", ")
                    : response?.detail ?? "Failed to fetch user";

                return {
                    success: false,
                    errors: [{ field: "account", error: errorMessage }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
        GetOnboardingStatus: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/onboarding/check`, {
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
                console.error("GetOnboardingStatus: Failed to parse JSON response:", jsonError);

                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "onboarding", error: "Server error. Please try again later." }],
                    } satisfies Users.OnboardingResponse;
                }

                return {
                    success: false,
                    errors: [{ field: "onboarding", error: "Invalid response from server." }],
                } satisfies Users.OnboardingResponse;
            }

            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "onboarding", error: "Server error. Please try again later." }],
                    } satisfies Users.OnboardingResponse;
                }

                const errorMessage = typeof response?.errors === "object"
                    ? Object.values(response.errors).join(", ")
                    : response?.detail ?? "Failed to fetch user";

                return {
                    success: false,
                    errors: [{ field: "onboarding", error: errorMessage }],
                } satisfies Users.OnboardingResponse;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.OnboardingResponse;
        },

        WhoAmI: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/me/verify`, {
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
                console.error("WhoAmI: Failed to parse JSON response:", jsonError);

                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "whoami", error: "Server error. Please try again later." }],
                    } satisfies Users.Response;
                }

                return {
                    success: false,
                    errors: [{ field: "whoami", error: "Invalid response from server." }],
                } satisfies Users.Response;
            }

            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "whoami", error: "Server error. Please try again later." }],
                    } satisfies Users.Response;
                }

                const errorMessage = typeof response?.errors === "object"
                    ? Object.values(response.errors).join(", ")
                    : response?.detail ?? "Failed to fetch user";

                return {
                    success: false,
                    errors: [{ field: "whoami", error: errorMessage }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
        SearchUsers: async (query: string, token: string, signal: AbortSignal) => {
            const searchUrl = `${host}/${API_ROUTE_DOMAIN}/find?q=${encodeURIComponent(query)}`;

            const req = await fetch(searchUrl, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
                signal,
            });

            let response;
            try {
                response = await req.json();
            } catch (jsonError) {
                console.error("SearchUsers: Failed to parse JSON response:", jsonError);

                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "searchusers", error: "Server error. Please try again later." }],
                    } satisfies Users.SearchResponse;
                }

                return {
                    success: false,
                    errors: [{ field: "searchusers", error: "Invalid response from server." }],
                } satisfies Users.SearchResponse;
            }

            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "searchusers", error: "Server error. Please try again later." }],
                    } satisfies Users.SearchResponse;
                }

                const errorMessage = typeof response?.errors === "object"
                    ? Object.values(response.errors).join(", ")
                    : response?.detail ?? "Failed to search users";

                return {
                    success: false,
                    errors: [{ field: "searchusers", error: errorMessage }],
                } satisfies Users.SearchResponse;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.SearchResponse;
        },
        UpdateUser: async (formData: FormData, token: string) => {
            const errors: { field: string; error: string; }[] = [];
            const data: Record<string, any> = {};

            // Name validation
            const nameValue = formData.get("name") as string;
            if (nameValue !== null) {
                if (!nameValue || nameValue.trim() === "") {
                    errors.push({ field: "name", error: "Name is required" });
                } else if (nameValue.length < 2) {
                    errors.push({ field: "name", error: "Name must be at least 2 characters long" });
                } else if (nameValue.length > 100) {
                    errors.push({ field: "name", error: "Name must be less than 100 characters" });
                } else {
                    data.name = nameValue.trim();
                }
            }

            // Email validation
            const emailValue = formData.get("email") as string;
            if (emailValue !== null) {
                if (!emailValue) {
                    errors.push({ field: "email", error: "Email is required" });
                } else {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(emailValue)) {
                        errors.push({ field: "email", error: "Invalid email format" });
                    } else {
                        data.email = emailValue.trim();
                    }
                }
            }

            // Account validation
            const accountValue = formData.get("account") as string;
            if (accountValue !== null) {
                if (!accountValue || accountValue.trim() === "") {
                    errors.push({ field: "account", error: "Account username is required" });
                } else {
                    const accountRegex = /^[a-zA-Z0-9_-]+$/;
                    if (!accountRegex.test(accountValue)) {
                        errors.push({ field: "account", error: "Account username can only contain letters, numbers, underscores, and hyphens" });
                    } else if (accountValue.length < 3) {
                        errors.push({ field: "account", error: "Account username must be at least 3 characters long" });
                    } else if (accountValue.length > 30) {
                        errors.push({ field: "account", error: "Account username must be less than 30 characters" });
                    } else {
                        data.account = accountValue.trim();
                    }
                }
            }

            // Bio validation (optional)
            const bioValue = formData.get("bio") as string | null;
            if (bioValue !== null) {
                if (bioValue && bioValue.length > 500) {
                    errors.push({ field: "bio", error: "Bio must be less than 500 characters" });
                } else {
                    data.bio = bioValue ? bioValue.trim() : null;
                }
            }

            // Date of birth validation (optional)
            const dobValue = formData.get("dob") as string | null;
            if (dobValue !== null && dobValue.trim() !== "") {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dobValue)) {
                    errors.push({ field: "dob", error: "Date must be in YYYY-MM-DD format" });
                } else {
                    const parsedDate = new Date(dobValue);
                    const today = new Date();

                    if (isNaN(parsedDate.getTime())) {
                        errors.push({ field: "dob", error: "Invalid date" });
                    } else if (parsedDate >= today) {
                        errors.push({ field: "dob", error: "Date of birth must be in the past" });
                    } else {
                        const minDate = new Date();
                        minDate.setFullYear(today.getFullYear() - 150);
                        if (parsedDate < minDate) {
                            errors.push({ field: "dob", error: "Invalid birth date" });
                        } else {
                            data.dob = dobValue;
                        }
                    }
                }
            } else if (dobValue !== null) {
                data.dob = null;
            }

            // Phone validation (optional)
            const phoneValue = formData.get("phone") as string | null;
            if (phoneValue !== null && phoneValue.trim() !== "") {
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                const cleanPhone = phoneValue.replace(/[\s\-\(\)]/g, "");

                if (!phoneRegex.test(cleanPhone)) {
                    errors.push({ field: "phone", error: "Invalid phone number format" });
                } else {
                    data.phone = phoneValue.trim();
                }
            } else if (phoneValue !== null) {
                data.phone = null;
            }

            // Avatar photo ID (optional, no validation needed)
            const avatarValue = formData.get("avatar_photo_id") as string | null;
            if (avatarValue !== null) {
                data.avatar_photo_id = avatarValue || null;
            }

            // Return validation errors if any
            if (errors.length > 0) {
                return {
                    success: false,
                    errors: errors,
                } satisfies Users.Response;
            }

            // Only proceed if we have data to update
            if (Object.keys(data).length === 0) {
                return {
                    success: false,
                    errors: [{ field: "updateuser", error: "No fields to update" }],
                } satisfies Users.Response;
            }

            const req = await fetch(`${host}/api/v1/user/update`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const response = await req.json();

            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "updateuser", error: "Server error. Please try again later." }],
                    } satisfies Users.Response;
                }

                const errorMessage = typeof response?.errors === "object"
                    ? Object.values(response.errors).join(", ")
                    : response?.detail ?? "Failed to update user";

                return {
                    success: false,
                    errors: [{ field: "updateuser", error: errorMessage }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
        GetUserWeeklyAvailability: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/calendar/entries/list`, {
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
                    errors: [{ field: "availability", error: response.message || "Failed to load availability" }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
        GetUserExceptionDates: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/calendar/exceptions`, {
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
                    errors: [{ field: "availability", error: response.message || "Failed to load exception dates" }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },

        AddUserWeeklyAvailability: async (dayOfWeek: number, intervals: any[], token: string) => {
            const data = {
                day_of_week: dayOfWeek,
                intervals: intervals
            };

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/calendar/intervals`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            const response = await req.json();
            if (!req.ok) {
                return {
                    success: false,
                    errors: [{ field: "availability", error: response.message || "Failed to save availability" }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },

        AddUserExceptionDate: async (formData: FormData, token: string) => {

            const errors: { field: string; error: string; }[] = [];
            const data: Record<string, any> = {};

            const exceptionDateValue = formData.get("exception_date") as string;
            const startTimeValue = formData.get("start_time") as string;
            const endTimeValue = formData.get("end_time") as string;
            const isAvailableValue = formData.get("is_available") as string;

            if (!exceptionDateValue) {
                errors.push({ field: "exception_date", error: "Exception date is required" });
            } else {
                data.exception_date = exceptionDateValue;
            }

            if (!startTimeValue || !endTimeValue) {
                errors.push({ field: "availability", error: "Start and end times are required" });
            } else {
                data.start_time = startTimeValue;
                data.end_time = endTimeValue;
            }

            data.is_available = isAvailableValue === 'true';

            if (errors.length > 0) {
                return {
                    success: false,
                    errors: errors,
                } satisfies Users.Response;
            }

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/exception/date`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            const response = await req.json();
            if (!req.ok) {
                return {
                    success: false,
                    errors: [{ field: "exception_date", error: response.message || "Failed to save exception date" }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
        AddUserAvailability: async (formData: FormData, token: string) => {
            // Extract data from FormData with validation
            const errors: { field: string; error: string; }[] = [];
            const data: Record<string, any> = {};

            // Calendar ID validation
            const calendarIdValue = formData.get("calendar_id") as string;
            if (!calendarIdValue || calendarIdValue.trim() === "") {
                errors.push({ field: "calendar_id", error: "Calendar ID is required" });
            } else {
                data.calendar_id = calendarIdValue.trim();
            }

            // Return validation errors if any
            if (errors.length > 0) {
                return {
                    success: false,
                    errors: errors,
                } satisfies Users.Response;
            }

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/calendar/intervals`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            const response = await req.json();
            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "addusercalendar", error: "Server error. Please try again later." }],
                    } satisfies Users.Response;
                }
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
        DeleteUserWeeklyAvailabilityById: async (calendarId: string, token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/calendar/${calendarId}/delete`, {
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
                    errors: [{ field: "availability", error: response.message || "Failed to delete availability" }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },

    };
};


export default NewUserRepository;
