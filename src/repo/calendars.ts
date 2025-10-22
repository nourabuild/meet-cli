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
        weekday?: number;
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
        weekday?: number;
        start_time: string;
        end_time: string;
        is_available: boolean;
    }

    export type CalendarEntriesData = {
        entries: CalendarEntry[];
        exceptions: Exceptions[];
    };

    export type CalendarEntriesResponse =
        | {
            success: true;
            data: CalendarEntriesData;
        }
        | FailureResponse;

    export type UserSettings = {
        max_days_to_book: number;
        min_days_to_book: number;
        delay_between_meetings: number;
        timezone: string;
    };

    export type UserSettingsResponse =
        | {
            success: true;
            data: UserSettings;
        }
        | FailureResponse;

    export type UserSettingsUpdate = Partial<UserSettings>;

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
        data: Availability | Availability[] | Exceptions | Exceptions[] | CalendarEntry | CalendarEntry[];
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
                const resolveDay = (value: any): number | string | undefined => {
                    if (value == null) return undefined;
                    if (typeof value === "number" || typeof value === "string") return value;
                    if (typeof value === "object") {
                        return value.day_of_week
                            ?? value.weekday
                            ?? value.day
                            ?? value.dayOfWeek
                            ?? value.dayIndex;
                    }
                    return undefined;
                };
                const tryAdd = (rawDay: any, start: any, end: any) => {
                    let weekdayValue: number | undefined;
                    if (typeof rawDay === 'number') {
                        weekdayValue = rawDay;
                    } else if (typeof rawDay === 'string') {
                        const parsed = Number.parseInt(rawDay, 10);
                        if (!Number.isNaN(parsed)) {
                            weekdayValue = parsed;
                        }
                    }

                    if (weekdayValue == null || typeof start !== 'string' || typeof end !== 'string') {
                        return;
                    }

                    const normalizedDay = ((Math.trunc(weekdayValue) % 7) + 6) % 7;
                    out.push({
                        day_of_week: normalizedDay,
                        weekday: Math.trunc(weekdayValue),
                        start_time: start,
                        end_time: end,
                    });
                };

                const arr = Array.isArray(raw) ? raw
                    : Array.isArray(raw?.data) ? raw.data
                        : Array.isArray(raw?.entries) ? raw.entries
                            : undefined;

                if (Array.isArray(arr)) {
                    for (const item of arr) {
                        if (Array.isArray(item?.intervals)) {
                            for (const it of item.intervals) {
                                const intervalDay = resolveDay(it) ?? resolveDay(item);
                                tryAdd(intervalDay, it.start_time, it.end_time);
                            }
                        } else if (typeof item?.start_time === 'string' && typeof item?.end_time === 'string') {
                            tryAdd(resolveDay(item), item.start_time, item.end_time);
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
        GetUserCalendarEntries: async (userId: string, token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/availability/${userId}`, {
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
                } satisfies Calendars.CalendarEntriesResponse;
            }

            if (!req.ok) {
                const errorMessage = response?.detail
                    || response?.message
                    || (typeof response === "string" ? response : undefined)
                    || "Failed to load availability";

                return {
                    success: false,
                    errors: [{ field: "availability", error: errorMessage }],
                } satisfies Calendars.CalendarEntriesResponse;
            }

            const normalizeEntries = (raw: any): Calendars.CalendarEntry[] => {
                const source = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.entries)
                        ? raw.entries
                        : Array.isArray(raw?.data?.entries)
                            ? raw.data.entries
                            : Array.isArray(raw?.data)
                                ? raw.data
                                : Array.isArray(raw?.calendar_entries)
                                    ? raw.calendar_entries
                                    : [];

                const normalized: Calendars.CalendarEntry[] = [];

                for (const item of source) {
                    if (!item) {
                        continue;
                    }

                    const start = typeof item.start_time === "string"
                        ? item.start_time
                        : typeof item.start === "string"
                            ? item.start
                            : typeof item.startTime === "string"
                                ? item.startTime
                                : undefined;

                    const end = typeof item.end_time === "string"
                        ? item.end_time
                        : typeof item.end === "string"
                            ? item.end
                            : typeof item.endTime === "string"
                                ? item.endTime
                                : undefined;

                    if (typeof start !== "string" || typeof end !== "string") {
                        continue;
                    }

                    let dayOfWeek: number | undefined = item.day_of_week ?? item.dayOfWeek ?? item.weekday ?? item.day;
                    if (typeof dayOfWeek === "string") {
                        const parsed = Number.parseInt(dayOfWeek, 10);
                        dayOfWeek = Number.isFinite(parsed) ? parsed : undefined;
                    } else if (typeof dayOfWeek !== "number" || Number.isNaN(dayOfWeek)) {
                        if (start.includes("T")) {
                            const parsedDate = new Date(start);
                            if (!Number.isNaN(parsedDate.getTime())) {
                                dayOfWeek = parsedDate.getDay();
                            }
                        }
                    }

                    const isAvailableValue = item.is_available ?? item.isAvailable ?? item.available ?? (item.status === "available");
                    const calendarId = typeof item.calendar_id === "string"
                        ? item.calendar_id
                        : typeof item.calendarId === "string"
                            ? item.calendarId
                            : "";
                    const backendWeekday =
                        typeof dayOfWeek === "number" && Number.isFinite(dayOfWeek)
                            ? Math.trunc(dayOfWeek)
                            : undefined;
                    const resolvedDay =
                        typeof backendWeekday === "number"
                            ? ((backendWeekday % 7) + 6) % 7
                            : undefined;

                    const entryId = item.id ?? `${start}-${end}-${resolvedDay ?? "na"}`;

                    if (typeof resolvedDay !== "number") {
                        continue;
                    }

                    normalized.push({
                        id: String(entryId),
                        calendar_id: String(calendarId),
                        day_of_week: resolvedDay,
                        weekday: backendWeekday,
                        start_time: start,
                        end_time: end,
                        is_available: Boolean(isAvailableValue ?? true),
                    });
                }

                return normalized;
            };

            const normalizeExceptions = (raw: any): Calendars.Exceptions[] => {
                const source = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.exceptions)
                        ? raw.exceptions
                        : Array.isArray(raw?.data?.exceptions)
                            ? raw.data.exceptions
                            : Array.isArray(raw?.calendar_exceptions)
                                ? raw.calendar_exceptions
                                : [];

                const exceptions: Calendars.Exceptions[] = [];
                for (const item of source) {
                    if (!item) {
                        continue;
                    }

                    const dateValue = (item.exception_date ?? item.date) as string | undefined;
                    if (typeof dateValue !== "string") {
                        continue;
                    }

                    const start = typeof item.start_time === "string"
                        ? item.start_time
                        : typeof item.start === "string"
                            ? item.start
                            : typeof item.startTime === "string"
                                ? item.startTime
                                : null;

                    const end = typeof item.end_time === "string"
                        ? item.end_time
                        : typeof item.end === "string"
                            ? item.end
                            : typeof item.endTime === "string"
                                ? item.endTime
                                : null;

                    const isAvailableValue = item.is_available ?? item.isAvailable ?? item.available ?? false;

                    exceptions.push({
                        id: item.id ? String(item.id) : undefined,
                        date: dateValue,
                        start_time: start,
                        end_time: end,
                        is_available: Boolean(isAvailableValue),
                    });
                }
                return exceptions;
            };

            const exceptions = normalizeExceptions(response);
            const entries = normalizeEntries(response);

            return {
                success: true,
                data: {
                    entries,
                    exceptions,
                },
            } satisfies Calendars.CalendarEntriesResponse;
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

            console.log('[CalendarRepo] GetUserExceptionDates raw response', {
                status: req.status,
                ok: req.ok,
                body: response,
            });

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

        GetUserSettings: async (token: string) => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/settings`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            let response: any;
            try {
                response = await req.json();
            } catch {
                return {
                    success: false,
                    errors: [{ field: "settings", error: "Invalid server response" }],
                } satisfies Calendars.UserSettingsResponse;
            }

            if (!req.ok) {
                const errorMessage =
                    response?.detail ||
                    response?.message ||
                    "Failed to load scheduling preferences";

                return {
                    success: false,
                    errors: [{ field: "settings", error: errorMessage }],
                } satisfies Calendars.UserSettingsResponse;
            }

            return {
                success: true,
                data: response,
            } satisfies Calendars.UserSettingsResponse;
        },

        UpsertUserSettings: async (payload: Calendars.UserSettingsUpdate, token: string) => {
            const normalizedPayload: Record<string, unknown> = {};

            if (payload.max_days_to_book !== undefined) {
                normalizedPayload.max_days_to_book = Number.isFinite(payload.max_days_to_book)
                    ? Math.max(0, Math.trunc(payload.max_days_to_book))
                    : 0;
            }
            if (payload.min_days_to_book !== undefined) {
                normalizedPayload.min_days_to_book = Number.isFinite(payload.min_days_to_book)
                    ? Math.max(0, Math.trunc(payload.min_days_to_book))
                    : 0;
            }
            if (payload.delay_between_meetings !== undefined) {
                normalizedPayload.delay_between_meetings = Number.isFinite(payload.delay_between_meetings)
                    ? Math.max(0, Math.trunc(payload.delay_between_meetings))
                    : 0;
            }
            if (payload.timezone !== undefined) {
                normalizedPayload.timezone = payload.timezone;
            }

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/settings`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(normalizedPayload),
            });

            let response: any;
            try {
                response = await req.json();
            } catch {
                if (!req.ok) {
                    return {
                        success: false,
                        errors: [{ field: "settings", error: "Invalid server response" }],
                    } satisfies Calendars.UserSettingsResponse;
                }
            }

            if (!req.ok) {
                const detail = response?.detail || response?.message || "Failed to save scheduling preferences";
                return {
                    success: false,
                    errors: [{ field: "settings", error: detail }],
                } satisfies Calendars.UserSettingsResponse;
            }

            return {
                success: true,
                data: response ?? normalizedPayload,
            } satisfies Calendars.UserSettingsResponse;
        },

        AddUserWeeklyAvailability: async (dayOfWeek: number, intervals: Calendars.TimeInterval[], token: string) => {
            const weekday = ((Math.trunc(dayOfWeek) % 7) + 1) || 1;
            const data = {
                weekday,
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
            _recurrence_type: string,
            interval: Calendars.TimeInterval,
            is_full_day: boolean,
            is_available: boolean,
            token: string,
        ) => {
            const errors: { field: string; error: string }[] = [];

            const payload: Record<string, any> = {};
            if (!exception_date || typeof exception_date !== 'string') {
                errors.push({ field: 'date', error: 'Exception date is required' });
            } else {
                payload.date = exception_date;
            }

            if (is_full_day) {
                payload.start_time = null;
                payload.end_time = null;
            } else {
                const start = interval?.start_time;
                const end = interval?.end_time;
                if (!start || !end) {
                    errors.push({ field: 'availability', error: 'Start and end times are required when the exception is not full-day' });
                } else {
                    payload.start_time = start;
                    payload.end_time = end;
                }
            }

            payload.is_available = Boolean(is_available);

            if (errors.length > 0) {
                return { success: false, errors } satisfies Calendars.Response;
            }

            console.log('[CalendarRepo] AddUserExceptionDate payload', {
                ...payload,
                tokenPresent: Boolean(token),
            });

            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/exceptions/add`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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

            console.log('[CalendarRepo] AddUserExceptionDate response', {
                status: req.status,
                ok: req.ok,
                body: response,
            });

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
