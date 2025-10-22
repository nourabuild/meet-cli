import * as Localization from 'expo-localization';

// -------------------------------
// Localization & Locale Info
// -------------------------------

export type LocaleInfo = {
    localeTag?: string;
    uses24h: boolean;
    timeZone?: string;
};

/**
 * Get the device's primary locale language tag
 */
export const getDeviceLocale = (): string => {
    return Localization.getLocales()[0].languageTag!;
};

/**
 * Get the device's timezone
 */
export const getDeviceTimeZone = (): string => {
    return Localization.getCalendars()[0].timeZone!;
};

/**
 * Check if device uses 24-hour clock
 */
export const uses24HourClock = (): boolean => {
    return Localization.getCalendars()[0].uses24hourClock!;
};

/**
 * Get comprehensive locale information
 */
export const getLocaleInfo = (): LocaleInfo => {
    try {
        const locales = Localization.getLocales?.() ?? [];
        const calendars = Localization.getCalendars?.() ?? [];
        const locale = locales[0];
        const calendar = calendars[0];
        return {
            localeTag: locale?.languageTag,
            uses24h: calendar?.uses24hourClock ?? true,
            timeZone: calendar?.timeZone ?? undefined,
        };
    } catch {
        return {
            uses24h: true,
        };
    }
};

// -------------------------------
// Days of Week Localization
// -------------------------------

export type DayInfo = {
    id: number;
    name: string;
    label: string;
};

const locale = Localization.getLocales()[0]?.languageTag;
const firstWeekday = Localization.getCalendars()[0]?.firstWeekday ?? Localization.Weekday.SUNDAY;

const SUNDAY_ANCHOR = new Date(Date.UTC(2024, 0, 7)); // Known Sunday
const zeroIndexedDayInfo = Array.from({ length: 7 }, (_, zeroIdx) => {
    const referenceDate = new Date(SUNDAY_ANCHOR);
    referenceDate.setUTCDate(SUNDAY_ANCHOR.getUTCDate() + zeroIdx);
    const label = referenceDate.toLocaleDateString(locale ?? undefined, { weekday: 'long' });
    const shortLabel = referenceDate.toLocaleDateString(locale ?? undefined, { weekday: 'short' });
    const name = shortLabel.slice(0, 3).toUpperCase();
    return { label, name };
});

const toZeroIndexed = (weekday: number) => (weekday + 6) % 7;
const firstWeekdayZeroIdx = toZeroIndexed(firstWeekday);

/**
 * Get days of week ordered according to device locale
 */
export const DAYS_OF_WEEK: DayInfo[] = Array.from({ length: 7 }, (_, offset) => {
    const zeroIdx = (firstWeekdayZeroIdx + offset) % 7;
    const { label, name } = zeroIndexedDayInfo[zeroIdx];
    return { id: zeroIdx, name, label };
});

// -------------------------------
// Time Formatting & Validation
// -------------------------------

export const normalizeTimeString = (time: string): string => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time ?? '');
    if (!match) return time;
    const [, hour, minute] = match;
    return `${hour}:${minute}`;
};

export const isHHMM = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const asLocalDate = (date: string, time: string) => new Date(`${date}T${time}:00`);

const pad2 = (value: number) => value.toString().padStart(2, '0');

export const toUtcTimeString = (date: string, localTime: string | null | undefined): string | null => {
    if (!date || !localTime || !isHHMM(localTime)) return null;
    const instance = asLocalDate(date, localTime);
    if (Number.isNaN(instance.getTime())) return null;
    return `${pad2(instance.getUTCHours())}:${pad2(instance.getUTCMinutes())}`;
};

export const toUtcIsoString = (date: string, localTime: string | null | undefined): string | null => {
    if (!date || !localTime || !isHHMM(localTime)) return null;
    const instance = asLocalDate(date, localTime);
    return Number.isNaN(instance.getTime()) ? null : instance.toISOString();
};

export const fromUtcTimeToLocal = (date: string, utcTime: string | null | undefined): string | null => {
    if (!utcTime) return null;

    const candidate = utcTime.includes('T')
        ? new Date(utcTime)
        : (date && isHHMM(utcTime)) ? new Date(`${date}T${utcTime}:00Z`) : null;

    if (!candidate || Number.isNaN(candidate.getTime())) {
        return normalizeTimeString(utcTime);
    }

    return `${pad2(candidate.getHours())}:${pad2(candidate.getMinutes())}`;
};

// -------------------------------
// Date Formatting
// -------------------------------

const exceptionFormatterCache = new Map<string, Intl.DateTimeFormat | null>();

const getExceptionFormatter = (localeTag: string | undefined): Intl.DateTimeFormat | null => {
    const cacheKey = localeTag ?? Localization.getLocales()[0].languageTag;
    if (exceptionFormatterCache.has(cacheKey)) {
        return exceptionFormatterCache.get(cacheKey) ?? null;
    }

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };
    try {
        const formatter = new Intl.DateTimeFormat(cacheKey, options);
        exceptionFormatterCache.set(cacheKey, formatter);
        return formatter;
    } catch {
        exceptionFormatterCache.set(cacheKey, null);
        return null;
    }
};

export const formatExceptionDateForLocale = (localeTag: string | undefined, isoDate: string | null | undefined): string => {
    if (!isoDate) return 'Invalid date';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return 'Invalid date';

    const formatter = getExceptionFormatter(localeTag);
    if (formatter) {
        return formatter.format(parsed);
    }

    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const day = parsed.getDate().toString().padStart(2, '0');
    return `${parsed.getFullYear()}-${month}-${day}`;
};

// -------------------------------
// Meeting Date/Time Formatting
// -------------------------------

/**
 * Parse datetime string with timezone awareness
 * If the date string doesn't have timezone info, treat it as UTC then convert to local
 */
const parseDateTimeString = (datetime: string): Date => {
    const hasTimezoneInfo = datetime.includes('Z') ||
                           datetime.includes('+') ||
                           datetime.match(/.*T.*-\d{2}:\d{2}/);

    const date = hasTimezoneInfo
        ? new Date(datetime)  // Has timezone info, parse as-is
        : new Date(datetime + 'Z');  // No timezone info, treat as UTC then convert to local

    return date;
};

/**
 * Format meeting time (short format: "Oct 22 at 12:00PM")
 */
export const formatMeetingTime = (datetime: string): string => {
    const date = parseDateTimeString(datetime);

    if (Number.isNaN(date.getTime())) {
        return 'TBD';
    }

    const locale = getDeviceLocale();
    return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Format meeting date (full format: "Wednesday, October 22, 2025 at 7:00PM")
 */
export const formatMeetingDate = (datetime: string): string => {
    const date = parseDateTimeString(datetime);

    if (Number.isNaN(date.getTime())) {
        return 'Invalid date';
    }

    const locale = getDeviceLocale();
    return date.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};