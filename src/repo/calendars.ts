import { fetch } from "expo/fetch";
import { CalendarRepository } from "./repository";


export namespace Calendars {

    export type TimeInterval = {
        start_time: string;
        end_time: string;
    };

    export type Availability = {
        id?: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        created_at?: string;
        updated_at?: string;
        // Some backends return grouped days with intervals; we normalize to flat intervals
        intervals?: TimeInterval[];
    }

    export type Exceptions = {
        id?: string;
        date: string; // normalized (may come as exception_date from backend)
        start_time: string | null;
        end_time: string | null;
        is_available: boolean;
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
        data: Availability | Availability[] | Exceptions | Exceptions[];
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

            let response: any;
            try {
                response = await req.json();
            } catch (e) {
                return {
                    success: false,
                    errors: [{ field: "availability", error: "Invalid server response" }],
                } satisfies Calendars.Response;
            }
            if (!req.ok) {
                return {
                    success: false,
                    errors: [{ field: "availability", error: response?.message || response?.detail || "Failed to load availability" }],
                } satisfies Calendars.Response;
            }

            // Normalize various backend shapes into flat intervals
            const normalize = (raw: any): Calendars.Availability[] => {
                const out: Calendars.Availability[] = [];
                const tryAdd = (day_of_week: any, start: any, end: any) => {
                    if (typeof day_of_week === 'number' && typeof start === 'string' && typeof end === 'string') {
                        out.push({ day_of_week, start_time: start, end_time: end });
                    }
                };

                const arr = Array.isArray(raw) ? raw
                    : Array.isArray(raw?.data) ? raw.data
                        : Array.isArray(raw?.entries) ? raw.entries
                            : undefined;

                if (Array.isArray(arr)) {
                    for (const item of arr) {
                        if (Array.isArray(item?.intervals)) {
                            for (const it of item.intervals) {
                                tryAdd(item.day_of_week ?? it.day_of_week, it.start_time, it.end_time);
                            }
                        } else if (typeof item?.start_time === 'string' && typeof item?.end_time === 'string') {
                            tryAdd(item.day_of_week, item.start_time, item.end_time);
                        }
                    }
                }
                return out;
            };

            const data = normalize(response);
            return {
                success: true,
                data,
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
            let response: any;
            try {
                response = await req.json();
            } catch (e) {
                return {
                    success: false,
                    errors: [{ field: "exceptions", error: "Invalid server response" }],
                } satisfies Calendars.Response;
            }
            if (!req.ok) {
                return {
                    success: false,
                    errors: [{ field: "exceptions", error: response?.message || response?.detail || "Failed to load exception dates" }],
                } satisfies Calendars.Response;
            }

            const normalize = (raw: any): Calendars.Exceptions[] => {
                const out: Calendars.Exceptions[] = [];
                const arr = Array.isArray(raw) ? raw
                    : Array.isArray(raw?.data) ? raw.data
                        : Array.isArray(raw?.exceptions) ? raw.exceptions
                            : undefined;
                if (Array.isArray(arr)) {
                    for (const item of arr) {
                        const id = (item.id ?? item.exception_id ?? undefined) as string | undefined;
                        const date = (item.exception_date || item.date) as string;
                        const start = (item.start_time ?? null) as string | null;
                        const end = (item.end_time ?? null) as string | null;
                        const isAvailable = Boolean(item.is_available);
                        if (typeof date === 'string') {
                            out.push({ id, date, start_time: start, end_time: end, is_available: isAvailable });
                        }
                    }
                }
                return out;
            };
            const data = normalize(response);
            return {
                success: true,
                data,
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
                console.log("GetOnboardingStatus: Parsed JSON response:", response);
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

                const errorMessage = response?.errors || response?.detail || "Failed to fetch user";

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

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/availability/add`, {
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

        AddUserExceptionDate: async (
            exception_date: string,
            recurrence_type: string,
            interval: Calendars.TimeInterval,
            is_full_day: boolean,
            is_available: boolean,
            token: string,
        ) => {
            const errors: { field: string; error: string }[] = [];

            const data: Record<string, any> = {};
            if (!exception_date || typeof exception_date !== 'string') {
                errors.push({ field: 'exception_date', error: 'Exception date is required' });
            } else {
                data.exception_date = exception_date;
            }

            data.is_full_day = Boolean(is_full_day);

            if (!data.is_full_day) {
                const start = interval?.start_time;
                const end = interval?.end_time;
                if (!start || !end) {
                    errors.push({ field: 'availability', error: 'Start and end times are required for non-full-day exceptions' });
                } else {
                    data.start_time = start;
                    data.end_time = end;
                }
            }

            data.is_available = Boolean(is_available);
            data.recurrence_type = recurrence_type || 'single';

            // Derive day_of_week from exception_date
            if (exception_date) {
                const d = new Date(exception_date);
                if (!isNaN(d.getTime())) data.day_of_week = d.getDay();
            }

            if (errors.length > 0) {
                return { success: false, errors } satisfies Calendars.Response;
            }

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/exceptions/add`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            let response: any = {};
            try {
                response = await req.json();
            } catch (e) {
                if (!req.ok) {
                    return {
                        success: false,
                        errors: [{ field: 'exception_date', error: 'Failed to save exception date' }],
                    } satisfies Calendars.Response;
                }
            }

            if (!req.ok) {
                return {
                    success: false,
                    errors: [{ field: 'exception_date', error: response.message || response.detail || 'Failed to save exception date' }],
                } satisfies Calendars.Response;
            }

            return { success: true, data: response } satisfies Calendars.Response;
        },
        // DO NOT IMPLEMENT DELETE FUNCTION, API DOES NOT HAVE IT

        // DeleteUserWeeklyAvailabilityById: async (calendarId: string, token: string) => {
        //     const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/calendar/${calendarId}/delete`, {
        //         method: "POST",
        //         headers: {
        //             Authorization: `Bearer ${token}`,
        //             "Accept": "application/json",
        //         },
        //     });
        //     const response = await req.json();
        //     if (!req.ok) {
        //         return {
        //             success: false,
        //             errors: [{ field: "availability", error: response.message || "Failed to delete availability" }],
        //         } satisfies Calendars.Response;
        //     }

        //     return {
        //         success: true,
        //         data: response,
        //     } satisfies Calendars.Response;
        // },
        DeleteUserExceptionDate: async (id: string, token: string) => {
            if (!id) {
                return {
                    success: false,
                    errors: [{ field: 'exceptions', error: 'Exception id is required' }],
                } satisfies Calendars.Response;
            }

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/exceptions/remove/${encodeURIComponent(id)}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            let response: any = null;
            if (req.status !== 204) {
                try {
                    response = await req.json();
                } catch (e) {
                    if (!req.ok) {
                        return {
                            success: false,
                            errors: [{ field: 'exceptions', error: 'Failed to delete exception' }],
                        } satisfies Calendars.Response;
                    }
                }
            }

            if (!req.ok) {
                return {
                    success: false,
                    errors: [{ field: 'exceptions', error: response?.message || response?.detail || 'Failed to delete exception' }],
                } satisfies Calendars.Response;
            }

            return {
                success: true,
                data: response ?? ([] as Calendars.Exceptions[]),
            } satisfies Calendars.Response;
        },

    };
};

export default NewCalendarRepository;
