import { fetch } from "expo/fetch";
import { CalendarRepository } from "./repository";


export namespace Calendars {

    export type TimeInterval = {
        start_time: string;
        end_time: string;
    };

    type Entries = { entries: Availability };

    export type Availability = {
        id?: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        created_at?: string;
        updated_at?: string;
        entries?: Entries[];
    }

    type ExceptionEntries = { entries: Exceptions };

    export type Exceptions = {
        id?: string;
        date: string;
        start_time: string | null;
        end_time: string | null;
        is_available: boolean;
        exceptions?: ExceptionEntries[];
    }


    export type CalendarEntry = {
        id: string;
        calendar_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_available: boolean;
    }



    export type OnboardingStatus = {
        completed: boolean;
    };


    type OnboardingSuccessResponse = {
        success: true;
        data: OnboardingStatus;
    };

    export type OnboardingResponse = OnboardingSuccessResponse | FailureResponse;

    type FieldError = {
        field: string;
        error: string;
    };

    type SuccessResponse = {
        success: true;
        data: Availability | Exceptions;
    };

    type FailureResponse = {
        success: false;
        errors: FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;
}

const API_ROUTE_DOMAIN = "api/v1/calendar";

const NewCalendarRepository = (host: string): CalendarRepository => {
    return {
        GetUserWeeklyAvailability: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/availability`, {
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
                } satisfies Calendars.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.Response;
        },
        GetUserExceptionDates: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/exceptions`, {
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
                } satisfies Calendars.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.Response;
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
                    } satisfies Calendars.OnboardingResponse;
                }

                return {
                    success: false,
                    errors: [{ field: "onboarding", error: "Invalid response from server." }],
                } satisfies Calendars.OnboardingResponse;
            }

            if (!req.ok) {
                if (req.status >= 500) {
                    return {
                        success: false,
                        errors: [{ field: "onboarding", error: "Server error. Please try again later." }],
                    } satisfies Calendars.OnboardingResponse;
                }

                const errorMessage = typeof response?.errors === "object"
                    ? Object.values(response.errors).join(", ")
                    : response?.detail ?? "Failed to fetch user";

                return {
                    success: false,
                    errors: [{ field: "onboarding", error: errorMessage }],
                } satisfies Calendars.OnboardingResponse;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.OnboardingResponse;
        },
        AddUserWeeklyAvailability: async (dayOfWeek: number, intervals: Calendars.TimeInterval[], token: string) => {
            const data = {
                day_of_week: dayOfWeek,
                intervals: intervals
            };

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/intervals`, {
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
                } satisfies Calendars.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.Response;
        },

        AddUserExceptionDate: async (formData: FormData, token: string) => {

            const errors: { field: string; error: string; }[] = [];
            const data: Record<string, any> = {};

            const exceptionDateValue = formData.get("exception_date") as string;
            const startTimeValue = formData.get("start_time") as string;
            const endTimeValue = formData.get("end_time") as string;
            const isAvailableValue = formData.get("is_available") as string;
            const isFullDayValue = formData.get("is_full_day") as string;

            if (!exceptionDateValue) {
                errors.push({ field: "exception_date", error: "Exception date is required" });
            } else {
                data.exception_date = exceptionDateValue;
            }

            const isFullDay = isFullDayValue === 'true';
            data.is_full_day = isFullDay;

            if (!isFullDay) {
                // Only validate start/end times for non-full-day exceptions
                if (!startTimeValue || !endTimeValue) {
                    errors.push({ field: "availability", error: "Start and end times are required for non-full-day exceptions" });
                } else {
                    data.start_time = startTimeValue;
                    data.end_time = endTimeValue;
                }
            }

            data.is_available = isAvailableValue === 'true';

            if (errors.length > 0) {
                return {
                    success: false,
                    errors: errors,
                } satisfies Calendars.Response;
            }
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/exceptions`, {
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
                    errors: [{ field: "exception_date", error: response.message || response.detail || "Failed to save exception date" }],
                } satisfies Calendars.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.Response;
        },
        AddUserAvailability: async (formData: FormData, token: string) => {
            const errors: { field: string; error: string; }[] = [];
            const data: Record<string, any> = {};

            const calendarIdValue = formData.get("calendar_id") as string;
            if (!calendarIdValue || calendarIdValue.trim() === "") {
                errors.push({ field: "calendar_id", error: "Calendar ID is required" });
            } else {
                data.calendar_id = calendarIdValue.trim();
            }

            if (errors.length > 0) {
                return {
                    success: false,
                    errors: errors,
                } satisfies Calendars.Response;
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
                    } satisfies Calendars.Response;
                }
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.Response;
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
                } satisfies Calendars.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.Response;
        },

    };
};

export default NewCalendarRepository;