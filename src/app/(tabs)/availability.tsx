
import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    useColorScheme,
    // Switch,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { CalendarRepo } from '@/repo';
import * as SecureStore from 'expo-secure-store';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import { Calendars } from '@/repo/calendars';
import { theme } from '@/styles/theme';
import {
    getLocaleInfo,
    DAYS_OF_WEEK,
    normalizeTimeString,
    toUtcTimeString,
    fromUtcTimeToLocal,
    formatExceptionDateForLocale,
    getDeviceTimeZone,
} from '@/lib/utils/format';

// -------------------------------
// State Management
// -------------------------------

type AvailabilityState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Calendars.Availability[] }
    | { status: "editing" };


function availabilityReducer(
    state: Calendars.Availability[],
    action:
        | { type: 'SET_SCHEDULE'; payload: Calendars.Availability[] }
        | { type: 'TOGGLE_DAY'; payload: number }
        | { type: 'UPDATE_TIME'; payload: { dayId: number; field: 'start_time' | 'end_time'; value: string } }
        | { type: 'ADD_TIME'; payload: { dayId: number; start_time?: string; end_time?: string } }
        | { type: 'REMOVE_TIME'; payload: { dayId: number; index: number } }
        | { type: 'CLEAR_DAY'; payload: number }
        | { type: 'SET_DAY_INTERVALS'; payload: { dayId: number; intervals: Calendars.TimeInterval[] } }
) {
    switch (action.type) {
        case 'SET_SCHEDULE':
            return action.payload;
        case 'TOGGLE_DAY':
            return state.map(availability => {
                if (availability.day_of_week === action.payload) {
                    return availability.start_time && availability.end_time
                        ? { ...availability, start_time: "", end_time: "" }
                        : { ...availability, start_time: "09:00", end_time: "17:00" };
                }
                return availability;
            });
        case 'UPDATE_TIME':
            return state.map(availability => {
                if (availability.day_of_week === action.payload.dayId) {
                    return {
                        ...availability,
                        [action.payload.field]: action.payload.value
                    } as Calendars.Availability;
                }
                return availability;
            });
        case 'ADD_TIME':
            return [
                ...state,
                {
                    day_of_week: action.payload.dayId,
                    start_time: action.payload.start_time ?? '09:00',
                    end_time: action.payload.end_time ?? '17:00',
                },
            ];
        case 'REMOVE_TIME': {
            let occurrence = -1;
            return state.filter(item => {
                if (item.day_of_week !== action.payload.dayId) return true;
                occurrence += 1;
                return occurrence !== action.payload.index;
            });
        }
        case 'CLEAR_DAY':
            return state.filter(item => item.day_of_week !== action.payload);
        case 'SET_DAY_INTERVALS': {
            const withoutDay = state.filter(item => item.day_of_week !== action.payload.dayId);
            const replacements = action.payload.intervals.map(interval => ({
                day_of_week: action.payload.dayId,
                start_time: interval.start_time,
                end_time: interval.end_time,
            })) as Calendars.Availability[];
            return [...withoutDay, ...replacements];
        }
        default:
            return state;
    }
}


type ExceptionState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Calendars.Exceptions[] }
    | { status: "editing" };

function exceptionReducer(
    state: Calendars.Exceptions[],
    action:
        | { type: 'SET_EXCEPTIONS'; payload: Calendars.Exceptions[] }
        | { type: 'ADD_EXCEPTION'; payload: Calendars.Exceptions }
        | { type: 'UPDATE_EXCEPTION'; payload: Calendars.Exceptions }
        | { type: 'REMOVE_EXCEPTION'; payload: number | string }
) {
    switch (action.type) {
        case 'SET_EXCEPTIONS':
            return action.payload;
        case 'ADD_EXCEPTION':
            return [...state, action.payload];
        case 'UPDATE_EXCEPTION':
            return state.map((exception) =>
                exception.id === action.payload.id ? action.payload : exception
            );
        case 'REMOVE_EXCEPTION':
            if (typeof action.payload === 'string') {
                return state.filter(exception => exception.id !== action.payload);
            }
            return state.filter((_, index) => index !== action.payload);
        default:
            return state;
    }
}

// -------------------------------------------------

type SettingsState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Calendars.UserSettings };

type SettingsFormState = {
    maxDaysToBook: string;
    minDaysToBook: string;
    delayBetweenMeetings: string;
    timezone: string;
};

const buildGroupedAvailability = (items: Calendars.Availability[]): Record<number, Calendars.TimeInterval[]> => {
    const grouped: Record<number, Calendars.TimeInterval[]> = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };

    for (const item of items) {
        const { start_time, end_time } = item;
        if (!start_time || !end_time) continue;
        const normalizedDay = ((item.day_of_week % 7) + 7) % 7;
        if (!grouped[normalizedDay]) {
            grouped[normalizedDay] = [];
        }
        grouped[normalizedDay].push({ start_time, end_time });
    }

    return grouped;
};


//   <View style={[styles.itemCard, { backgroundColor: cardColor, marginBottom: 15 }]}>
//                                 <Text style={[styles.dayName, { color: textColor, textAlign: 'center' }]}>
//                                     Device Timezone: {Localization.getCalendars()[0]?.timeZone}
//                                 </Text>
//                                 <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
//                                     Region: {Localization.getLocales()[0]?.regionCode}
//                                 </Text>
//                                 <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
//                                     Language: {Localization.getLocales()[0]?.languageCode}
//                                 </Text>
//                                 <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
//                                     Calendar: {Localization.getCalendars()[0]?.calendar}
//                                 </Text>
//                                 <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
//                                     Uses 24h: {Localization.getCalendars()[0]?.uses24hourClock ? 'Yes' : 'No'}
//                                 </Text>
//                             </View>




export default function AvailabilityScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const scheduleInputBackground = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)';
    const scheduleInputBorder = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(15, 23, 42, 0.12)';
    const unavailableTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';

    const [availability, dispatchAvailability] = useReducer(availabilityReducer, []);
    const [availabilityState, setAvailabilityState] = useReducer(
        (_state: AvailabilityState, newState: AvailabilityState) => newState,
        { status: "idle" }
    );
    const [exceptions, dispatchExceptions] = useReducer(exceptionReducer, []);
    const [exceptionState, setExceptionState] = useReducer(
        (_state: ExceptionState, newState: ExceptionState) => newState,
        { status: "idle" }
    );
    const exceptionsBeforeEdit = useRef<Calendars.Exceptions[] | null>(null);

    const [settingsState, setSettingsState] = useState<SettingsState>({ status: "idle" });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() => {
        const timezone = getDeviceTimeZone() ?? 'UTC';
        return {
            maxDaysToBook: '',
            minDaysToBook: '',
            delayBetweenMeetings: '',
            timezone,
        };
    });

    // Edit mode toggles now inside reducers

    // Simple local state for adding exception date
    const [exceptionDate, setExceptionDate] = useState('');
    const [exceptionStart, setExceptionStart] = useState('');
    const [exceptionEnd, setExceptionEnd] = useState('');
    const [exceptionIsAvailable, setExceptionIsAvailable] = useState(false);
    const [exceptionIsFullDay, setExceptionIsFullDay] = useState(false);

    const localeInfo = getLocaleInfo();
    const isEditing = availabilityState.status === 'editing';
    // Helpers: time formatting and validation
    const formatPartialTime = (input: string): string => {
        const digits = input.replace(/\D/g, '').slice(0, 4);
        if (digits.length === 0) return '';
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    };

    const isValidTime = (t: string): boolean => {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    };

    const loadUserSettings = async () => {
        setSettingsState({ status: "loading" });
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setSettingsState({ status: "error", error: "No authentication token found" });
                return;
            }

            const response = await CalendarRepo.GetUserSettings(token);
            if (!response.success) {
                const message = response.errors?.[0]?.error || "Failed to load scheduling preferences";
                setSettingsState({ status: "error", error: message });
                return;
            }

            const data = response.data;
            const fallbackTimezone =
                localeInfo.timeZone
                ?? getDeviceTimeZone()
                ?? 'UTC';
            setSettingsForm({
                maxDaysToBook: String(data.max_days_to_book ?? 0),
                minDaysToBook: String(data.min_days_to_book ?? 0),
                delayBetweenMeetings: String(data.delay_between_meetings ?? 0),
                timezone: data.timezone ?? fallbackTimezone,
            });
            setSettingsState({ status: "success", data });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load scheduling preferences";
            setSettingsState({ status: "error", error: message });
        }
    };

    const handleSettingsChange = (field: keyof SettingsFormState, value: string) => {
        setSettingsForm((prev) => ({ ...prev, [field]: value }));
        setSettingsState((prev) => (prev.status === "error" ? { status: "idle" } : prev));
    };

    // const handleApplyDeviceTimezone = () => {
    //     const tz =
    //         localeInfo.timeZone
    //         ?? Localization.getCalendars?.()[0]?.timeZone
    //         ?? 'UTC';
    //     setSettingsForm((prev) => ({ ...prev, timezone: tz }));
    //     setSettingsState((prev) => (prev.status === "error" ? { status: "idle" } : prev));
    // };

    const handleSaveSettings = async () => {
        setSettingsState((prev) => (prev.status === "error" ? { status: "idle" } : prev));
        setIsSavingSettings(true);
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const maxDays = Number.parseInt(settingsForm.maxDaysToBook, 10);
            const minDays = Number.parseInt(settingsForm.minDaysToBook, 10);
            const delayMinutes = Number.parseInt(settingsForm.delayBetweenMeetings, 10);

            if (Number.isNaN(maxDays) || maxDays < 0) {
                throw new Error('Availability window must be a non-negative number.');
            }
            if (Number.isNaN(minDays) || minDays < 0) {
                throw new Error('Lead time must be a non-negative number.');
            }
            if (minDays > maxDays) {
                throw new Error('Lead time cannot be greater than availability window.');
            }
            if (Number.isNaN(delayMinutes) || delayMinutes < 0) {
                throw new Error('Buffer time must be a non-negative number.');
            }

            const timezone = settingsForm.timezone.trim() || localeInfo.timeZone || 'UTC';

            const response = await CalendarRepo.UpsertUserSettings(
                {
                    max_days_to_book: maxDays,
                    min_days_to_book: minDays,
                    delay_between_meetings: delayMinutes,
                    timezone,
                },
                token,
            );

            if (!response.success) {
                const message = response.errors?.[0]?.error || 'Failed to save scheduling preferences';
                throw new Error(message);
            }

            const saved = response.data ?? {
                max_days_to_book: maxDays,
                min_days_to_book: minDays,
                delay_between_meetings: delayMinutes,
                timezone,
            };

            setSettingsForm({
                maxDaysToBook: String(saved.max_days_to_book ?? maxDays),
                minDaysToBook: String(saved.min_days_to_book ?? minDays),
                delayBetweenMeetings: String(saved.delay_between_meetings ?? delayMinutes),
                timezone: saved.timezone ?? timezone,
            });

            setSettingsState({ status: "success", data: saved });
            setIsEditingSettings(false);
            Alert.alert('Preferences saved', 'Your scheduling settings have been updated.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save scheduling preferences.';
            setSettingsState({ status: "error", error: message });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const getUserWeeklyAvailability = async () => {
        setAvailabilityState({ status: "loading" });
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setAvailabilityState({ status: "error", error: "No authentication token found" });
                return;
            }

            const response = await CalendarRepo.GetUserWeeklyAvailability(token);

            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || "Failed to fetch availability");
            }

            // Handle different response formats
            let availabilityData: Calendars.Availability[] = [];

            if (response.data && Array.isArray(response.data)) {
                availabilityData = response.data as Calendars.Availability[];
            } else if (response.data && typeof response.data === 'object') {
                const dataObj = response.data as any;
                if (dataObj.entries && Array.isArray(dataObj.entries)) {
                    availabilityData = dataObj.entries as Calendars.Availability[];
                }
            }

            // Backend returns times in local format, just normalize them
            const localizedAvailability = availabilityData.map(item => {
                const start = item.start_time;
                const end = item.end_time;

                return {
                    ...item,
                    start_time: typeof start === 'string' ? normalizeTimeString(start) : start,
                    end_time: typeof end === 'string' ? normalizeTimeString(end) : end,
                };
            });

            dispatchAvailability({ type: 'SET_SCHEDULE', payload: localizedAvailability });
            setAvailabilityState({ status: "success", data: localizedAvailability });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setAvailabilityState({ status: "error", error: errorMessage });
        }
    };


    const getUserExceptionDates = async () => {
        setExceptionState({ status: "loading" });
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setExceptionState({ status: "error", error: "No authentication token found" });
                return;
            }

            const response = await CalendarRepo.GetUserExceptionDates(token);
            console.log('[AvailabilityScreen] getUserExceptionDates response', response);

            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || "Failed to fetch exception dates");
            }

            // Handle different response formats
            let exceptionData: Calendars.Exceptions[] = [];

            if (response.data && Array.isArray(response.data)) {
                exceptionData = response.data as Calendars.Exceptions[];
            } else if (response.data && typeof response.data === 'object') {
                const dataObj = response.data as any;
                if (dataObj.exceptions && Array.isArray(dataObj.exceptions)) {
                    exceptionData = dataObj.exceptions as Calendars.Exceptions[];
                }
            }

            // Backend returns UTC; convert to local for display
            const localizedExceptions = exceptionData.map((exception) => {
                const normalizedStart =
                    typeof exception.start_time === 'string'
                        ? normalizeTimeString(exception.start_time)
                        : exception.start_time;
                const normalizedEnd =
                    typeof exception.end_time === 'string'
                        ? normalizeTimeString(exception.end_time)
                        : exception.end_time;

                const localStart =
                    typeof normalizedStart === 'string'
                        ? fromUtcTimeToLocal(exception.date, normalizedStart)
                        : normalizedStart;
                const localEnd =
                    typeof normalizedEnd === 'string'
                        ? fromUtcTimeToLocal(exception.date, normalizedEnd)
                        : normalizedEnd;

                return {
                    ...exception,
                    start_time: localStart,
                    end_time: localEnd,
                } as Calendars.Exceptions;
            });

            dispatchExceptions({ type: 'SET_EXCEPTIONS', payload: localizedExceptions });
            setExceptionState({ status: "success", data: localizedExceptions });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setExceptionState({ status: "error", error: errorMessage });
        }
    };

    const addUserWeeklyAvailability = async (
        dayOfWeek: number,
        intervals: Calendars.TimeInterval[]
    ) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error("No authentication token found");
                return;
            }

            const response = await CalendarRepo.AddUserWeeklyAvailability(dayOfWeek, intervals, token);

            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || "Failed to add availability");
            }

            // Refresh availability after adding
            getUserWeeklyAvailability();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            console.error("Error adding availability:", errorMessage);
        }
    }


    const addUserExceptionDate = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error("No authentication token found");
                return;
            }

            // Basic validation
            if (!exceptionDate) {
                console.error('Error adding exception date:', 'Exception date is required');
                return;
            }
            if (!exceptionIsFullDay && (!exceptionStart || !exceptionEnd)) {
                console.error('Error adding exception date:', 'Start and end times are required for non-full-day exceptions');
                return;
            }

            const startUtc = toUtcTimeString(exceptionDate, exceptionStart);
            const endUtc = toUtcTimeString(exceptionDate, exceptionEnd);
            const interval = {
                start_time: startUtc ?? exceptionStart,
                end_time: endUtc ?? exceptionEnd,
            } as Calendars.TimeInterval;
            // console.log('[AvailabilityScreen] addUserExceptionDate payload', {
            //     exceptionDate,
            //     recurrence_type: 'single',
            //     interval,
            //     exceptionIsFullDay,
            //     exceptionIsAvailable,
            //     utcStartIso: toUtcIsoString(exceptionDate, exceptionStart),
            //     utcEndIso: toUtcIsoString(exceptionDate, exceptionEnd),
            // });
            const response = await CalendarRepo.AddUserExceptionDate(
                exceptionDate,
                'single',
                interval,
                exceptionIsFullDay,
                exceptionIsAvailable,
                token,
            );

            console.log('[AvailabilityScreen] addUserExceptionDate response', response);
            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || "Failed to add exception date");
            }

            // Refresh exceptions after adding
            getUserExceptionDates();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            console.error("Error adding exception date:", errorMessage);
        }
    }




    useEffect(() => {
        void loadUserSettings();
        void getUserWeeklyAvailability();
        void getUserExceptionDates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const deleteUserExceptionDate = async (exception: Calendars.Exceptions, index: number) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            if (exception.id) {
                const resp = await CalendarRepo.DeleteUserExceptionDate(exception.id, token);
                if (!resp.success) {
                    throw new Error(resp.errors?.[0]?.error || 'Failed to delete exception');
                }
                dispatchExceptions({ type: 'REMOVE_EXCEPTION', payload: exception.id });
                if (exceptionsBeforeEdit.current) {
                    exceptionsBeforeEdit.current = exceptionsBeforeEdit.current.filter(e => e.id !== exception.id);
                }
            } else {
                dispatchExceptions({ type: 'REMOVE_EXCEPTION', payload: index });
                if (exceptionsBeforeEdit.current) {
                    exceptionsBeforeEdit.current = exceptionsBeforeEdit.current.filter((_, idx) => idx !== index);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error deleting exception date:', errorMessage);
            Alert.alert('Failed to remove exception', errorMessage);
        }
    };

    const confirmDeleteException = (exception: Calendars.Exceptions, index: number) => {
        Alert.alert(
            'Remove exception?',
            'This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => deleteUserExceptionDate(exception, index) }
            ]
        );
    };

    const persistExceptionsDiff = async (
        original: Calendars.Exceptions[],
        current: Calendars.Exceptions[],
    ) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            const mapByDate = (list: Calendars.Exceptions[]) => {
                const m = new Map<string, Calendars.Exceptions>();
                for (const e of list) {
                    if (e?.date) m.set(e.date, e);
                }
                return m;
            };

            const origMap = mapByDate(original);
            const currMap = mapByDate(current);

            // Determine adds (dates present now but not before)
            const toAdd: Calendars.Exceptions[] = [];
            for (const [date, e] of currMap.entries()) {
                if (!origMap.has(date)) toAdd.push(e);
            }

            // Determine removals (dates removed locally)
            const toRemove: Calendars.Exceptions[] = [];
            for (const [date, originalException] of origMap.entries()) {
                if (!currMap.has(date)) toRemove.push(originalException);
            }

            // Persist adds
            for (const e of toAdd) {
                const is_full_day = !(e.start_time && e.end_time);
                const interval = {
                    start_time: !is_full_day ? (toUtcTimeString(e.date, e.start_time ?? '') ?? e.start_time ?? '00:00') : '00:00',
                    end_time: !is_full_day ? (toUtcTimeString(e.date, e.end_time ?? '') ?? e.end_time ?? '00:00') : '00:00',
                } as Calendars.TimeInterval;
                await CalendarRepo.AddUserExceptionDate(
                    e.date,
                    'single',
                    interval,
                    is_full_day,
                    Boolean(e.is_available),
                    token,
                );
            }

            // Persist removals using delete endpoint when available, fallback to neutralizing entry otherwise
            for (const exception of toRemove) {
                let removedThroughApi = false;
                if (exception.id) {
                    const resp = await CalendarRepo.DeleteUserExceptionDate(exception.id, token);
                    if (!resp.success) {
                        console.error('Failed to delete exception date:', resp.errors?.[0]?.error || 'Unknown error occurred');
                    } else {
                        removedThroughApi = true;
                    }
                }

                if (removedThroughApi) continue;

                const date = exception.date;
                const d = new Date(date);
                if (isNaN(d.getTime())) continue;
                const dayId = d.getDay();
                const baseAvailable = (groupedAvailability[dayId]?.length ?? 0) > 0;
                await CalendarRepo.AddUserExceptionDate(
                    date,
                    'single',
                    { start_time: '00:00', end_time: '00:00' },
                    true,
                    baseAvailable,
                    token,
                );
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error occurred';
            console.error('Error saving exceptions:', msg);
        }
    };

    // Build view model: group entries by day for rendering/editing intervals
    const groupedAvailability = buildGroupedAvailability(availability);

    const handleAddTime = (dayId: number) => {
        // Update local list to show optimistically
        dispatchAvailability({ type: 'ADD_TIME', payload: { dayId } });

        // Persist using API with existing intervals + new default
        const current = groupedAvailability[dayId] ?? [];
        const intervals: Calendars.TimeInterval[] = [...current, { start_time: '09:00', end_time: '17:00' }];
        addUserWeeklyAvailability(dayId, intervals);
    };

    const handleRemoveLastInterval = (dayId: number) => {
        const intervals = groupedAvailability[dayId] ?? [];
        if (intervals.length === 0) {
            return;
        }

        if (intervals.length === 1) {
            dispatchAvailability({ type: 'CLEAR_DAY', payload: dayId });
            addUserWeeklyAvailability(dayId, []);
            return;
        }

        const updated = intervals.slice(0, -1);
        dispatchAvailability({ type: 'SET_DAY_INTERVALS', payload: { dayId, intervals: updated } });
        addUserWeeklyAvailability(dayId, updated);
    };

    const handleUpdateTime = (dayId: number, index: number, field: 'start_time' | 'end_time', value: string) => {
        const formatted = formatPartialTime(value);

        // Since backend handles UTC conversion, just use the local time directly
        // Update local view model by mapping availability entries
        // Find the actual nth entry for that day and update via UPDATE_TIME
        // First, find nth index in availability state
        let occurrence = -1;
        const target = availability.findIndex(item => {
            if (item.day_of_week !== dayId) return false;
            occurrence += 1;
            return occurrence === index;
        });

        if (target >= 0) {
            dispatchAvailability({ type: 'UPDATE_TIME', payload: { dayId, field, value: formatted } });
        }
    };

    const handleSaveDay = (dayId: number) => {
        const intervals = groupedAvailability[dayId] ?? [];
        if (intervals.length === 0) {
            // Persist clearing by sending empty intervals
            addUserWeeklyAvailability(dayId, []);
            return;
        }
        // Require valid HH:MM before saving
        const allValid = intervals.every(iv => isValidTime(iv.start_time) && isValidTime(iv.end_time));
        if (!allValid) {
            console.error('Please enter times as HH:MM');
            return;
        }

        addUserWeeklyAvailability(dayId, intervals);
    };

    const getCopySourceForDay = (dayId: number) => {
        const current = groupedAvailability[dayId] ?? [];
        if (current.length > 0) {
            return { kind: 'current' as const, intervals: current };
        }
        for (let offset = 1; offset < 7; offset += 1) {
            const candidateId = (dayId + 7 - offset) % 7;
            const candidate = groupedAvailability[candidateId] ?? [];
            if (candidate.length > 0) {
                return { kind: 'previous' as const, intervals: candidate };
            }
        }
        return null;
    };

    const handleCopyFromPreviousDay = (dayId: number) => {
        const sourceInfo = getCopySourceForDay(dayId);
        if (!sourceInfo) {
            return;
        }

        if (sourceInfo.kind === 'current') {
            const lastInterval = sourceInfo.intervals[sourceInfo.intervals.length - 1];
            const clonedInterval = { ...lastInterval };
            const updatedIntervals = [...sourceInfo.intervals, clonedInterval];
            dispatchAvailability({ type: 'SET_DAY_INTERVALS', payload: { dayId, intervals: updatedIntervals } });
            addUserWeeklyAvailability(dayId, updatedIntervals);
            return;
        }

        const clonedSet = sourceInfo.intervals.map(interval => ({ ...interval }));
        dispatchAvailability({ type: 'SET_DAY_INTERVALS', payload: { dayId, intervals: clonedSet } });
        addUserWeeklyAvailability(dayId, clonedSet);
    };

    const handleAddException = () => {
        addUserExceptionDate();
    };

    // ---------------------------------------------
    // Locale / time formatting helpers
    // ---------------------------------------------
    const formatExceptionDate = (isoDate: string | null | undefined): string => {
        return formatExceptionDateForLocale(localeInfo.localeTag, isoDate);
    };

    const formatDisplayInterval = (start: string, end: string): string => {
        // We now store local HH:MM directly; optionally adapt to 12h if device not 24h
        if (!localeInfo.uses24h) {
            const to12h = (t: string) => {
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return t;
                let [h, m] = t.split(':').map(Number);
                const suffix = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${h}:${m.toString().padStart(2, '0')} ${suffix}`;
            };
            return `${to12h(start)} - ${to12h(end)}`;
        }
        return `${start} - ${end}`;
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
            >

                {/* Availability Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, styles.sectionTitleInline, { color: textColor }]}>Weekly Schedule</Text>
                        <TouchableOpacity
                            onPress={() => setAvailabilityState(
                                availabilityState.status === 'editing'
                                    ? { status: 'success', data: availability }
                                    : { status: 'editing' }
                            )}
                        >
                            <Text style={styles.editLink}>{availabilityState.status === 'editing' ? 'Done' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>

                    {availabilityState.status === "loading" && (
                        <Text style={{ color: textColor }}>Loading availability...</Text>
                    )}
                    {availabilityState.status === "error" && (
                        <Text style={{ color: textColor }}>Error: {availabilityState.error}</Text>
                    )}

                    {(availabilityState.status === "success" || availabilityState.status === 'editing') && (
                        <View>

                            {/* <View style={[styles.itemCard, { backgroundColor: cardColor, marginBottom: 15 }]}>
                                <Text style={[styles.dayName, { color: textColor, textAlign: 'center' }]}>
                                    Device Timezone: {Localization.getCalendars()[0]?.timeZone}
                                </Text>
                                <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
                                    Region: {Localization.getLocales()[0]?.regionCode}
                                </Text>
                                <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
                                    Language: {Localization.getLocales()[0]?.languageCode}
                                </Text>
                                <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
                                    Calendar: {Localization.getCalendars()[0]?.calendar}
                                </Text>
                                <Text style={[styles.dayName, { color: textColor, textAlign: 'center', fontSize: 12 }]}>
                                    Uses 24h: {Localization.getCalendars()[0]?.uses24hourClock ? 'Yes' : 'No'}
                                </Text>
                            </View> */}

                            {/* <View style={{ marginBottom: 15 }}>
                                {DAYS_OF_WEEK.map(day => {
                                    const intervals = groupedAvailability[day.id] || [];
                                    if (intervals.length === 0) {
                                        return (
                                            <Text key={day.id} style={{ color: textColor }}>
                                                {day.label}: Unavailable
                                            </Text>
                                        );
                                    }

                                    return intervals.map((interval, idx) => {

                                        const [startHour, startMin] = interval.start_time.split(':').map(Number);
                                        const [endHour, endMin] = interval.end_time.split(':').map(Number);

                                        const deviceLocale = Localization.getLocales()[0];
                                        const deviceCalendar = Localization.getCalendars()[0];
                                        const deviceTimeZone = deviceCalendar?.timeZone || 'UTC';
                                        const localeTag = deviceLocale?.languageTag || 'en-US';
                                        const use24Hour = deviceCalendar?.uses24hourClock ?? true;

                                        const today = new Date();
                                        const startTimeUTC = new Date(today);
                                        const endTimeUTC = new Date(today);
                                        startTimeUTC.setUTCHours(startHour, startMin, 0, 0);
                                        endTimeUTC.setUTCHours(endHour, endMin, 0, 0);

                                        const timeFormatOptions: Intl.DateTimeFormatOptions = {
                                            hour12: !use24Hour,
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: deviceTimeZone
                                        };

                                        const localStartTime = startTimeUTC.toLocaleTimeString(localeTag, timeFormatOptions);
                                        const localEndTime = endTimeUTC.toLocaleTimeString(localeTag, timeFormatOptions);

                                        return (
                                            <View key={`${day.id}-${idx}`}>
                                                <Text style={{ color: textColor }}>
                                                    {day.label}:
                                                </Text>
                                                <Text style={{ color: textColor, fontSize: 11, marginLeft: 10 }}>
                                                    Local: {localStartTime} - {localEndTime}
                                                </Text>
                                                <Text style={{ color: textColor, fontSize: 11, marginLeft: 10 }}>
                                                    UTC: {startTimeUTC.toISOString().substr(11, 5)} - {endTimeUTC.toISOString().substr(11, 5)}
                                                </Text>
                                                <Text style={{ color: textColor, fontSize: 11, marginLeft: 10 }}>
                                                    EU (CET): {startTimeUTC.toLocaleTimeString(localeTag, { timeZone: 'Europe/Berlin', hour12: false, hour: '2-digit', minute: '2-digit' })} - {endTimeUTC.toLocaleTimeString(localeTag, { timeZone: 'Europe/Berlin', hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        );
                                    });
                                })}
                            </View> */}

                            <View style={styles.scheduleTable}>
                                {DAYS_OF_WEEK.map((day) => {
                                    const intervals = groupedAvailability[day.id] || [];
                                    const isAvailable = intervals.length > 0;
                                    const copySource = getCopySourceForDay(day.id);
                                    const canCopy = Boolean(copySource);
                                    return (
                                        <View
                                            key={day.id}
                                            style={styles.scheduleRow}
                                        >
                                            <Text style={[styles.scheduleDayLabel, { color: textColor }]}>
                                                {day.name}
                                            </Text>
                                            <View style={styles.scheduleIntervals}>
                                                {(() => {
                                                    // If unavailable, show plain text instead of input fields
                                                    if (!isAvailable) {
                                                        return (
                                                            <View style={[styles.scheduleIntervalRow, { gap: 6 }]}>
                                                                <Text style={[styles.scheduleUnavailableText, { color: unavailableTextColor }]}>
                                                                    Unavailable
                                                                </Text>
                                                            </View>
                                                        );
                                                    }

                                                    // Available: show input fields
                                                    return intervals.map((interval, idx) => {
                                                        const editable = isEditing;
                                                        const startDisplay = interval.start_time;
                                                        const endDisplay = interval.end_time;
                                                        const inputBaseStyle = [
                                                            styles.scheduleTimeInput,
                                                            !editable && styles.scheduleTimeInputReadOnly,
                                                            {
                                                                borderColor: scheduleInputBorder,
                                                                backgroundColor: scheduleInputBackground,
                                                                color: textColor,
                                                            },
                                                        ];
                                                        return (
                                                            <View
                                                                key={idx}
                                                                style={[
                                                                    styles.scheduleIntervalRow,
                                                                    idx === intervals.length - 1 && styles.scheduleIntervalRowLast,
                                                                ]}
                                                            >
                                                                <TextInput
                                                                    value={startDisplay}
                                                                    editable={editable}
                                                                    selectTextOnFocus={editable}
                                                                    onChangeText={editable ? (v) => handleUpdateTime(day.id, idx, 'start_time', v) : undefined}
                                                                    onEndEditing={editable ? () => handleSaveDay(day.id) : undefined}
                                                                    maxLength={editable ? 5 : 10}
                                                                    keyboardType={editable ? 'numbers-and-punctuation' : 'default'}
                                                                    autoCapitalize="none"
                                                                    autoCorrect={false}
                                                                    style={inputBaseStyle}
                                                                />
                                                                <Text style={[styles.scheduleTimeSeparator, { color: textColor }]}>-</Text>
                                                                <TextInput
                                                                    value={endDisplay}
                                                                    editable={editable}
                                                                    selectTextOnFocus={editable}
                                                                    onChangeText={editable ? (v) => handleUpdateTime(day.id, idx, 'end_time', v) : undefined}
                                                                    onEndEditing={editable ? () => handleSaveDay(day.id) : undefined}
                                                                    maxLength={editable ? 5 : 10}
                                                                    keyboardType={editable ? 'numbers-and-punctuation' : 'default'}
                                                                    autoCapitalize="none"
                                                                    autoCorrect={false}
                                                                    style={inputBaseStyle}
                                                                />
                                                            </View>
                                                        );
                                                    });
                                                })()}
                                            </View>
                                            {isEditing ? (
                                                <View style={styles.scheduleActions}>
                                                    <TouchableOpacity
                                                        accessibilityLabel="Remove time interval"
                                                        onPress={() => handleRemoveLastInterval(day.id)}
                                                        style={[
                                                            styles.scheduleActionButton,
                                                            !isAvailable && styles.scheduleActionButtonDisabled,
                                                        ]}
                                                        disabled={!isAvailable}
                                                    >
                                                        <Feather
                                                            name="x-circle"
                                                            size={18}
                                                            color={isAvailable ? textColor : unavailableTextColor}
                                                        />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        accessibilityLabel="Add time interval"
                                                        onPress={() => handleAddTime(day.id)}
                                                        style={styles.scheduleActionButton}
                                                    >
                                                        <Feather name="plus-circle" size={18} color={textColor} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        accessibilityLabel="Copy previous availability"
                                                        onPress={() => handleCopyFromPreviousDay(day.id)}
                                                        style={[
                                                            styles.scheduleActionButton,
                                                            !canCopy && styles.scheduleActionButtonDisabled,
                                                        ]}
                                                        disabled={!canCopy}
                                                    >
                                                        <Feather name="copy" size={18} color={textColor} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.scheduleActionsPlaceholder} />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>

                {/* Exceptions Section */}
                {/* <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Exception Dates</Text>
                        <TouchableOpacity
                            onPress={async () => {
                                if (exceptionState.status === 'editing') {
                                    // Persist differences using add endpoint semantics
                                    await persistExceptionsDiff(exceptionsBeforeEdit.current ?? [], exceptions);
                                    // Refresh from server and exit edit mode
                                    await getUserExceptionDates();
                                    setExceptionState({ status: 'success', data: exceptions });
                                    exceptionsBeforeEdit.current = null;
                                } else {
                                    // Entering edit mode: snapshot current list
                                    exceptionsBeforeEdit.current = [...exceptions];
                                    setExceptionState({ status: 'editing' });
                                }
                            }}
                        >
                            <Text style={styles.editLink}>{exceptionState.status === 'editing' ? 'Done' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: textColor }}>
                        {exceptionState.status === "loading" && "Loading exceptions..."}
                        {exceptionState.status === "error" && `Error: ${exceptionState.error}`}
                        {(exceptionState.status === "success" || exceptionState.status === 'editing') && exceptions.length === 0 && "No exception dates set"}
                    </Text>
                    <View style={[styles.itemCard, { backgroundColor: cardColor }]}>
                        <TextInput
                            value={exceptionDate}
                            onChangeText={setExceptionDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#9CA3AF"
                            style={styles.textInput}
                        />
                        {!exceptionIsFullDay && (
                            <View style={styles.intervalRow}>
                                <TextInput
                                    value={exceptionStart}
                                    onChangeText={(v) => setExceptionStart(formatPartialTime(v))}
                                    placeholder="09:00"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.timeInput}
                                    keyboardType="numbers-and-punctuation"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    maxLength={5}
                                />
                                <Text style={styles.timeSeparator}>-</Text>
                                <TextInput
                                    value={exceptionEnd}
                                    onChangeText={(v) => setExceptionEnd(formatPartialTime(v))}
                                    placeholder="17:00"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.timeInput}
                                    keyboardType="numbers-and-punctuation"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    maxLength={5}
                                />
                            </View>
                        )}
                        <View style={{ marginTop: 12, gap: 12 }}>
                            <View style={styles.switchRow}>
                                <Text style={[styles.switchLabel, { color: textColor }]}>All day</Text>
                                <Switch
                                    value={exceptionIsFullDay}
                                    onValueChange={setExceptionIsFullDay}
                                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <Text style={[styles.switchLabel, { color: textColor }]}>Free/busy</Text>
                                <Switch
                                    value={!exceptionIsAvailable}
                                    onValueChange={(value) => setExceptionIsAvailable(!value)}
                                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleAddException} style={styles.saveDayButton}>
                            <Text style={styles.saveDayButtonText}>Add Exception</Text>
                        </TouchableOpacity>
                    </View>
                    {(exceptionState.status === "success" || exceptionState.status === 'editing') && exceptions.map((exception, index) => (
                        <View key={index} style={[styles.itemCard, { backgroundColor: cardColor }]}>
                            <Text style={[styles.exceptionDate, { color: textColor }]}>
                                {formatExceptionDate(exception.date)}
                            </Text>
                            <Text style={[styles.exceptionTime, { color: textColor }]}>
                                {exception.start_time && exception.end_time
                                    ? formatDisplayInterval(exception.start_time, exception.end_time)
                                    : "All day"}
                            </Text>
                            <Text style={[styles.exceptionStatus, {
                                color: exception.is_available ? '#10B981' : '#EF4444'
                            }]}>
                                {exception.is_available ? 'Available' : 'Unavailable'}
                            </Text>
                            {exceptionState.status === 'editing' && (
                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => confirmDeleteException(exception, index)}
                                        style={[styles.removeButton, { alignSelf: 'flex-start' }]}
                                    >
                                        <Text style={styles.removeButtonText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </View> */}

                {/* Booking Preferences */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, styles.sectionTitleInline, { color: textColor }]}>Booking Preferences</Text>
                        <TouchableOpacity
                            onPress={() => setIsEditingSettings(!isEditingSettings)}
                        >
                            <Text style={styles.editLink}>{isEditingSettings ? 'Done' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.settingsList}>
                        <View style={styles.settingsRow}>
                            <Text style={[styles.settingsLabel, { color: textColor }]}>Lead time (days) / min</Text>
                            <TextInput
                                style={[styles.settingsInput, { color: textColor, borderColor }]}
                                keyboardType="number-pad"
                                value={settingsForm.minDaysToBook}
                                onChangeText={(value) => handleSettingsChange('minDaysToBook', value)}
                                placeholder="0"
                                placeholderTextColor={theme.colorGrey}
                                editable={isEditingSettings}
                            />
                        </View>
                        <View style={styles.settingsRow}>
                            <Text style={[styles.settingsLabel, { color: textColor }]}>Availability window (days) / max</Text>
                            <TextInput
                                style={[styles.settingsInput, { color: textColor, borderColor }]}
                                keyboardType="number-pad"
                                value={settingsForm.maxDaysToBook}
                                onChangeText={(value) => handleSettingsChange('maxDaysToBook', value)}
                                placeholder="0"
                                placeholderTextColor={theme.colorGrey}
                                editable={isEditingSettings}
                            />
                        </View>
                        <View style={styles.settingsRow}>
                            <Text style={[styles.settingsLabel, { color: textColor }]}>Buffer time (minutes) / delay</Text>
                            <TextInput
                                style={[styles.settingsInput, { color: textColor, borderColor }]}
                                keyboardType="number-pad"
                                value={settingsForm.delayBetweenMeetings}
                                onChangeText={(value) => handleSettingsChange('delayBetweenMeetings', value)}
                                placeholder="0"
                                placeholderTextColor={theme.colorGrey}
                                editable={isEditingSettings}
                            />
                        </View>
                        <View style={styles.settingsRow}>
                            <Text style={[styles.settingsLabel, { color: textColor }]}>Timezone (IANA)</Text>
                            <TextInput
                                style={[styles.settingsInput, { color: textColor, borderColor }]}
                                value={settingsForm.timezone}
                                onChangeText={(value) => handleSettingsChange('timezone', value)}
                                placeholder="Timezone"
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholderTextColor={theme.colorGrey}
                                editable={isEditingSettings}
                            />
                        </View>
                        {/* <TouchableOpacity
                            onPress={handleApplyDeviceTimezone}
                            style={[styles.settingsTimezoneButton, { borderColor }]}
                        >
                            <Text style={[styles.settingsTimezoneButtonText, { color: textColor }]}>
                                Use device timezone ({localeInfo.timeZone ?? 'device default'})
                            </Text>
                        </TouchableOpacity> */}
                        {settingsState.status === "error" && (
                            <Text style={styles.settingsErrorText}>{settingsState.error}</Text>
                        )}
                        {settingsState.status === "loading" && !isSavingSettings && (
                            <Text style={styles.settingsHelperText}>Loading preferences…</Text>
                        )}
                        {isEditingSettings && (
                            <TouchableOpacity
                                style={[
                                    styles.settingsSaveButton,
                                    { backgroundColor: theme.colorNouraBlue },
                                    isSavingSettings && styles.settingsSaveButtonDisabled,
                                ]}
                                onPress={handleSaveSettings}
                                disabled={isSavingSettings}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.settingsSaveButtonText}>
                                    {isSavingSettings ? 'Saving…' : 'Save Preferences'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // navbarContent: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     alignItems: 'center',
    //     paddingVertical: 0,
    // },
    // titleRow: {
    //     flexDirection: 'row',
    //     paddingHorizontal: 20,
    //     justifyContent: 'space-between',
    //     alignItems: 'center',
    //     paddingVertical: 0,
    // },
    // title: {
    //     fontSize: 28,
    //     paddingBottom: 10,
    //     fontWeight: '700',
    // },
    editLink: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        marginBottom: 0,
        paddingHorizontal: 20,
    },
    scheduleTable: {
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 12,
    },
    scheduleDayLabel: {
        width: 44,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'left',
    },
    scheduleIntervals: {
        flex: 1,
    },
    scheduleIntervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scheduleIntervalRowLast: {
        marginBottom: 0,
    },
    scheduleTimeInput: {
        width: 70,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    scheduleTimeInputReadOnly: {
        opacity: 0.85,
    },
    scheduleTimeSeparator: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 20,
    },
    scheduleUnavailableText: {
        fontSize: 14,
        fontWeight: '600',
        height: 36,
        lineHeight: 36,
    },
    scheduleActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    scheduleActionButton: {
        padding: 6,
        borderRadius: 18,
    },
    scheduleActionButtonDisabled: {
        opacity: 0.35,
    },
    scheduleActionsPlaceholder: {
        width: 124,
    },
    settingsList: {
        marginTop: 12,
    },
    settingsRow: {
        marginBottom: 12,
    },
    settingsLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    settingsInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
    },
    // settingsTimezoneButton: {
    //     borderWidth: 1,
    //     borderRadius: 8,
    //     paddingVertical: 10,
    //     paddingHorizontal: 12,
    //     marginBottom: 12,
    // },
    // settingsTimezoneButtonText: {
    //     fontSize: 14,
    //     fontWeight: '500',
    // },
    settingsErrorText: {
        color: '#B91C1C',
        marginBottom: 8,
        fontWeight: '500',
    },
    settingsHelperText: {
        marginTop: 8,
        fontSize: 13,
        color: '#6B7280',
    },
    settingsSaveButton: {
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsSaveButtonDisabled: {
        opacity: 0.6,
    },
    settingsSaveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    sectionTitleInline: {
    },
    // itemCard: {
    //     padding: 15,
    //     borderRadius: 8,
    //     marginBottom: 10,
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 1 },
    //     shadowOpacity: 0.1,
    //     shadowRadius: 2,
    //     elevation: 2,
    // },
    // textInput: {
    //     borderWidth: 1.5,
    //     borderColor: '#D1D5DB',
    //     backgroundColor: '#FFFFFF',
    //     paddingHorizontal: 12,
    //     paddingVertical: 8,
    //     borderRadius: 8,
    //     color: '#374151',
    //     marginBottom: 8,
    // },
    // dayName: {
    //     fontSize: 16,
    //     fontWeight: '600',
    //     marginBottom: 4,
    // },
    // intervalRow: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginTop: 8,
    // },
    // timeInput: {
    //     fontSize: 16,
    //     borderWidth: 1.5,
    //     borderColor: '#D1D5DB',
    //     backgroundColor: '#FFFFFF',
    //     paddingHorizontal: 12,
    //     paddingVertical: 8,
    //     borderRadius: 8,
    //     textAlign: 'center',
    //     fontWeight: '500',
    //     color: '#374151',
    //     minWidth: 60,
    // },
    // timeSeparator: {
    //     fontSize: 16,
    //     color: '#6B7280',
    //     marginHorizontal: 8,
    //     fontWeight: '500',
    // },
    // removeButton: {
    //     marginLeft: 8,
    //     paddingHorizontal: 10,
    //     paddingVertical: 6,
    //     backgroundColor: '#FEE2E2',
    //     borderRadius: 6,
    // },
    // removeButtonText: {
    //     color: '#B91C1C',
    //     fontWeight: '600',
    // },
    // saveDayButton: {
    //     marginTop: 10,
    //     paddingVertical: 10,
    //     backgroundColor: '#3B82F6',
    //     borderRadius: 8,
    //     alignItems: 'center',
    // },
    // saveDayButtonText: {
    //     color: '#FFFFFF',
    //     fontWeight: '600',
    // },
    // switchRow: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     justifyContent: 'space-between',
    // },
    // switchLabel: {
    //     fontSize: 16,
    //     fontWeight: '500',
    // },
    // exceptionDate: {
    //     fontSize: 16,
    //     fontWeight: '600',
    //     marginBottom: 4,
    // },
    // exceptionTime: {
    //     fontSize: 14,
    //     color: '#666',
    //     marginBottom: 4,
    // },
    // exceptionStatus: {
    //     fontSize: 14,
    //     fontWeight: '500',
    // },
});
