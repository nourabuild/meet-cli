
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
} from 'react-native';
import { CalendarRepo } from '@/repo';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import { Calendars } from '@/repo/calendars';
import Navbar from '@/lib/utils/navigation-bar';

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

const DAYS_OF_WEEK = [
    { id: 0, name: 'SUN', label: 'Sunday' },
    { id: 1, name: 'MON', label: 'Monday' },
    { id: 2, name: 'TUE', label: 'Tuesday' },
    { id: 3, name: 'WED', label: 'Wednesday' },
    { id: 4, name: 'THU', label: 'Thursday' },
    { id: 5, name: 'FRI', label: 'Friday' },
    { id: 6, name: 'SAT', label: 'Saturday' },
];

const getDayLabel = (dayOfWeek: number): string => {
    return DAYS_OF_WEEK.find(day => day.id === dayOfWeek)?.label!;
};

const convertUtcToLocalHHMM = (time: string): string => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time ?? '');
    if (!match) return time;

    const [, hour, minute] = match;
    const reference = new Date();
    reference.setUTCHours(Number(hour), Number(minute), 0, 0);

    const localHours = reference.getHours().toString().padStart(2, '0');
    const localMinutes = reference.getMinutes().toString().padStart(2, '0');

    return `${localHours}:${localMinutes}`;
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

    // Edit mode toggles now inside reducers

    // Simple local state for adding exception date
    const [exceptionDate, setExceptionDate] = useState('');
    const [exceptionStart, setExceptionStart] = useState('');
    const [exceptionEnd, setExceptionEnd] = useState('');
    const [exceptionIsAvailable, setExceptionIsAvailable] = useState(false);
    const [exceptionIsFullDay, setExceptionIsFullDay] = useState(false);

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

            const localizedAvailability = availabilityData.map(item => ({
                ...item,
                start_time: typeof item.start_time === 'string' ? convertUtcToLocalHHMM(item.start_time) : item.start_time,
                end_time: typeof item.end_time === 'string' ? convertUtcToLocalHHMM(item.end_time) : item.end_time,
            }));

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

            const localizedExceptions = exceptionData.map(exception => ({
                ...exception,
                start_time: typeof exception.start_time === 'string' ? convertUtcToLocalHHMM(exception.start_time) : exception.start_time,
                end_time: typeof exception.end_time === 'string' ? convertUtcToLocalHHMM(exception.end_time) : exception.end_time,
            }));

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

            const interval = { start_time: exceptionStart, end_time: exceptionEnd } as Calendars.TimeInterval;
            const response = await CalendarRepo.AddUserExceptionDate(
                exceptionDate,
                'single',
                interval,
                exceptionIsFullDay,
                exceptionIsAvailable,
                token,
            );

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
        getUserWeeklyAvailability();
        getUserExceptionDates();
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
                    start_time: e.start_time ?? '00:00',
                    end_time: e.end_time ?? '00:00',
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
    const groupedAvailability = useMemo(() => {
        const byDay: Record<number, Calendars.TimeInterval[]> = {};
        for (let d = 0; d <= 6; d++) byDay[d] = [];
        availability.forEach(item => {
            if (item.start_time && item.end_time) {
                byDay[item.day_of_week].push({ start_time: item.start_time, end_time: item.end_time });
            }
        });
        return byDay;
    }, [availability]);

    const handleAddTime = (dayId: number) => {
        // Update local list to show optimistically
        dispatchAvailability({ type: 'ADD_TIME', payload: { dayId } });
        // Persist using API with existing intervals + new default
        const current = groupedAvailability[dayId] ?? [];
        const intervals: Calendars.TimeInterval[] = [...current, { start_time: '09:00', end_time: '17:00' }];
        addUserWeeklyAvailability(dayId, intervals);
    };

    const handleRemoveTime = (dayId: number, index: number) => {
        dispatchAvailability({ type: 'REMOVE_TIME', payload: { dayId, index } });
        // Persist with remaining intervals
        const current = groupedAvailability[dayId] ?? [];
        const intervals: Calendars.TimeInterval[] = current.filter((_, i) => i !== index);
        addUserWeeklyAvailability(dayId, intervals);
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

    const handleAddException = () => {
        addUserExceptionDate();
    };

    // ---------------------------------------------
    // Locale / time formatting helpers (memoized)
    // ---------------------------------------------
    const localeInfo = useMemo(() => {
        const locale = Localization.getLocales()[0];
        const calendar = Localization.getCalendars()[0];
        return {
            localeTag: locale?.languageTag,
            uses24h: calendar?.uses24hourClock ?? true,
            timeZone: calendar?.timeZone
        };
    }, []);

    const formatExceptionDate = useMemo(() => {
        const localeTag = localeInfo.localeTag ?? 'en-US';
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
        };
        let formatter: Intl.DateTimeFormat | null = null;
        try {
            formatter = new Intl.DateTimeFormat(localeTag, options);
        } catch (e) {
            formatter = null;
        }

        return (isoDate: string | null | undefined): string => {
            if (!isoDate) return 'Invalid date';
            const parsed = new Date(isoDate);
            if (Number.isNaN(parsed.getTime())) return 'Invalid date';
            if (formatter) return formatter.format(parsed);
            const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
            const day = parsed.getDate().toString().padStart(2, '0');
            return `${parsed.getFullYear()}-${month}-${day}`;
        };
    }, [localeInfo.localeTag]);

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
            <Navbar backgroundColor={backgroundColor}>
                <View style={styles.navbarContent}>
                    <Text style={[styles.title, { color: textColor }]}>Availability</Text>
                </View>
            </Navbar>
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
                    <Text style={{ color: textColor }}>
                        {availabilityState.status === "loading" && "Loading availability..."}
                        {availabilityState.status === "error" && `Error: ${availabilityState.error}`}
                        {(availabilityState.status === "success" || availabilityState.status === 'editing') && availability.length === 0 && "No availability set"}
                    </Text>

                    {(availabilityState.status === "success" || availabilityState.status === 'editing') && (
                        <View>

                            <View style={[styles.itemCard, { backgroundColor: cardColor, marginBottom: 15 }]}>
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
                            </View>

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

                            {DAYS_OF_WEEK.map(day => {
                                const intervals = groupedAvailability[day.id] || [];
                                const isAvailable = intervals.length > 0;
                                return (
                                    <View key={day.id} style={[styles.itemCard, { backgroundColor: cardColor }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={[styles.dayName, { color: textColor }]}>
                                                {getDayLabel(day.id)}
                                            </Text>
                                            {/* Show + Add only when editing and there are no intervals */}
                                            {(availabilityState.status === 'editing' && !isAvailable) && (
                                                <View style={{ flexDirection: 'row' }}>
                                                    <TouchableOpacity onPress={() => handleAddTime(day.id)} style={styles.smallButton}>
                                                        <Text style={styles.smallButtonText}>+ Add</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                        {availabilityState.status !== 'editing' && !isAvailable && (
                                            <Text style={[styles.timeText, { color: textColor }]}>Unavailable</Text>
                                        )}
                                        {availabilityState.status !== 'editing' && isAvailable && (
                                            <View>
                                                {intervals.map((interval, idx) => (
                                                    <Text key={idx} style={[styles.timeText, { color: textColor }]}>
                                                        {formatDisplayInterval(interval.start_time, interval.end_time)}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                        {availabilityState.status === 'editing' && intervals.map((interval, idx) => (
                                            <View key={idx} style={styles.intervalRow}>
                                                <TextInput
                                                    value={interval.start_time}
                                                    onChangeText={(v) => handleUpdateTime(day.id, idx, 'start_time', v)}
                                                    onEndEditing={() => handleSaveDay(day.id)}
                                                    placeholder="09:00"
                                                    placeholderTextColor="#9CA3AF"
                                                    maxLength={5}
                                                    style={styles.timeInput}
                                                />
                                                <Text style={styles.timeSeparator}>-</Text>
                                                <TextInput
                                                    value={interval.end_time}
                                                    onChangeText={(v) => handleUpdateTime(day.id, idx, 'end_time', v)}
                                                    onEndEditing={() => handleSaveDay(day.id)}
                                                    placeholder="17:00"
                                                    placeholderTextColor="#9CA3AF"
                                                    maxLength={5}
                                                    style={styles.timeInput}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => handleRemoveTime(day.id, idx)}
                                                    style={styles.removeIntervalButton}
                                                >
                                                    <Text style={styles.removeIntervalButtonText}>Remove</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Exceptions Section */}
                <View style={styles.section}>
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
                        <View style={{ flexDirection: 'row', marginTop: 8 }}>
                            <TouchableOpacity onPress={() => setExceptionIsFullDay(v => !v)} style={styles.toggleButton}>
                                <Text style={styles.toggleButtonText}>{exceptionIsFullDay ? 'Full Day: Yes' : 'Full Day: No'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setExceptionIsAvailable(v => !v)} style={styles.toggleButton}>
                                <Text style={styles.toggleButtonText}>{exceptionIsAvailable ? 'Available' : 'Unavailable'}</Text>
                            </TouchableOpacity>
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
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    navbarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 0,
    },
    // titleRow: {
    //     flexDirection: 'row',
    //     paddingHorizontal: 20,
    //     justifyContent: 'space-between',
    //     alignItems: 'center',
    //     paddingVertical: 0,
    // },
    title: {
        fontSize: 28,
        paddingBottom: 10,
        fontWeight: '700',
    },
    editLink: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    sectionTitleInline: {
        marginBottom: 0,
    },
    itemCard: {
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    textInput: {
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        color: '#374151',
        marginBottom: 8,
    },
    dayName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 14,
        color: '#666',
    },
    intervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    timeInput: {
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        textAlign: 'center',
        fontWeight: '500',
        color: '#374151',
        minWidth: 60,
    },
    timeSeparator: {
        fontSize: 16,
        color: '#6B7280',
        marginHorizontal: 8,
        fontWeight: '500',
    },
    smallButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
    },
    smallButtonText: {
        color: '#111827',
        fontWeight: '600',
    },
    removeButton: {
        marginLeft: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#FEE2E2',
        borderRadius: 6,
    },
    removeButtonText: {
        color: '#B91C1C',
        fontWeight: '600',
    },
    saveDayButton: {
        marginTop: 10,
        paddingVertical: 10,
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        alignItems: 'center',
    },
    saveDayButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    toggleButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
        marginRight: 8,
    },
    toggleButtonText: {
        color: '#111827',
        fontWeight: '600',
    },
    exceptionDate: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    exceptionTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    exceptionStatus: {
        fontSize: 14,
        fontWeight: '500',
    },
    removeIntervalButton: {
        marginLeft: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
        alignSelf: 'center',
    },
    removeIntervalButtonText: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 12,
    },
});
