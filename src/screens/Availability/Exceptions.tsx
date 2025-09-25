import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { CalendarRepo } from '@/repo';
import { Calendars } from '@/repo/calendars';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import { convertUtcToLocalHHMM, formatPartialTime } from './utils';

type ExceptionState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'success'; data: Calendars.Exceptions[] }
    | { status: 'editing' };

type ExceptionAction =
    | { type: 'SET_EXCEPTIONS'; payload: Calendars.Exceptions[] }
    | { type: 'ADD_EXCEPTION'; payload: Calendars.Exceptions }
    | { type: 'UPDATE_EXCEPTION'; payload: Calendars.Exceptions }
    | { type: 'REMOVE_EXCEPTION'; payload: number | string };

const exceptionReducer = (
    state: Calendars.Exceptions[],
    action: ExceptionAction,
): Calendars.Exceptions[] => {
    switch (action.type) {
        case 'SET_EXCEPTIONS':
            return action.payload;
        case 'ADD_EXCEPTION':
            return [...state, action.payload];
        case 'UPDATE_EXCEPTION':
            return state.map(exception => (exception.id === action.payload.id ? action.payload : exception));
        case 'REMOVE_EXCEPTION':
            if (typeof action.payload === 'string') {
                return state.filter(exception => exception.id !== action.payload);
            }
            return state.filter((_, index) => index !== action.payload);
        default:
            return state;
    }
};

const Exceptions = () => {
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const backgroundColor = useThemeColor({}, 'background');

    const [exceptions, dispatchExceptions] = useReducer(exceptionReducer, []);
    const [exceptionState, setExceptionState] = useReducer(
        (_: ExceptionState, newState: ExceptionState) => newState,
        { status: 'idle' } as ExceptionState,
    );
    const exceptionsBeforeEdit = useRef<Calendars.Exceptions[] | null>(null);

    const [exceptionDate, setExceptionDate] = useState('');
    const [exceptionStart, setExceptionStart] = useState('');
    const [exceptionEnd, setExceptionEnd] = useState('');
    const [exceptionIsAvailable, setExceptionIsAvailable] = useState(false);
    const [exceptionIsFullDay, setExceptionIsFullDay] = useState(false);

    const [groupedAvailability, setGroupedAvailability] = useState<Record<number, Calendars.TimeInterval[]>>(() => {
        const byDay: Record<number, Calendars.TimeInterval[]> = {};
        for (let d = 0; d <= 6; d += 1) byDay[d] = [];
        return byDay;
    });

    const localeInfo = useMemo(() => {
        const locale = Localization.getLocales()[0];
        const calendar = Localization.getCalendars()[0];
        return {
            localeTag: locale?.languageTag,
            uses24h: calendar?.uses24hourClock ?? true,
        };
    }, []);

    const formatDisplayInterval = useMemo(() => {
        if (!localeInfo.uses24h) {
            const to12h = (t: string) => {
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return t;
                let [h, m] = t.split(':').map(Number);
                const suffix = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${h}:${m.toString().padStart(2, '0')} ${suffix}`;
            };
            return (start: string, end: string) => `${to12h(start)} - ${to12h(end)}`;
        }
        return (start: string, end: string) => `${start} - ${end}`;
    }, [localeInfo.uses24h]);

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
        } catch (error) {
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

    const fetchWeeklyAvailability = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                return;
            }

            const response = await CalendarRepo.GetUserWeeklyAvailability(token);
            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || 'Failed to fetch availability');
            }

            let availabilityData: Calendars.Availability[] = [];
            if (response.data && Array.isArray(response.data)) {
                availabilityData = response.data as Calendars.Availability[];
            } else if (response.data && typeof response.data === 'object') {
                const dataObj = response.data as { entries?: Calendars.Availability[] };
                if (Array.isArray(dataObj.entries)) {
                    availabilityData = dataObj.entries;
                }
            }

            const localizedAvailability = availabilityData.map(item => ({
                ...item,
                start_time: typeof item.start_time === 'string' ? convertUtcToLocalHHMM(item.start_time) : item.start_time,
                end_time: typeof item.end_time === 'string' ? convertUtcToLocalHHMM(item.end_time) : item.end_time,
            }));

            const byDay: Record<number, Calendars.TimeInterval[]> = {};
            for (let d = 0; d <= 6; d += 1) byDay[d] = [];
            localizedAvailability.forEach(item => {
                if (item.start_time && item.end_time) {
                    byDay[item.day_of_week].push({ start_time: item.start_time, end_time: item.end_time });
                }
            });

            setGroupedAvailability(byDay);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Failed to refresh availability for exceptions:', message);
        }
    }, []);

    const fetchExceptions = useCallback(async () => {
        setExceptionState({ status: 'loading' });
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setExceptionState({ status: 'error', error: 'No authentication token found' });
                return;
            }

            const response = await CalendarRepo.GetUserExceptionDates(token);
            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || 'Failed to fetch exception dates');
            }

            let exceptionData: Calendars.Exceptions[] = [];
            if (response.data && Array.isArray(response.data)) {
                exceptionData = response.data as Calendars.Exceptions[];
            } else if (response.data && typeof response.data === 'object') {
                const dataObj = response.data as { exceptions?: Calendars.Exceptions[] };
                if (Array.isArray(dataObj.exceptions)) {
                    exceptionData = dataObj.exceptions;
                }
            }

            const localizedExceptions = exceptionData.map(exception => ({
                ...exception,
                start_time: typeof exception.start_time === 'string' ? convertUtcToLocalHHMM(exception.start_time) : exception.start_time,
                end_time: typeof exception.end_time === 'string' ? convertUtcToLocalHHMM(exception.end_time) : exception.end_time,
            }));

            dispatchExceptions({ type: 'SET_EXCEPTIONS', payload: localizedExceptions });
            setExceptionState({ status: 'success', data: localizedExceptions });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            setExceptionState({ status: 'error', error: message });
        }
    }, []);

    useEffect(() => {
        fetchExceptions();
        fetchWeeklyAvailability();
    }, [fetchExceptions, fetchWeeklyAvailability]);

    const addException = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

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
                throw new Error(response.errors?.[0]?.error || 'Failed to add exception date');
            }

            setExceptionDate('');
            setExceptionStart('');
            setExceptionEnd('');
            setExceptionIsAvailable(false);
            setExceptionIsFullDay(false);

            fetchExceptions();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error adding exception date:', message);
        }
    }, [exceptionDate, exceptionStart, exceptionEnd, exceptionIsAvailable, exceptionIsFullDay, fetchExceptions]);

    const deleteException = useCallback(
        async (exception: Calendars.Exceptions, index: number) => {
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
                const message = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error('Error deleting exception date:', message);
                throw error;
            }
        },
        [],
    );

    const persistExceptionsDiff = useCallback(
        async (original: Calendars.Exceptions[], current: Calendars.Exceptions[]) => {
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

                const toAdd: Calendars.Exceptions[] = [];
                for (const [date, e] of currMap.entries()) {
                    if (!origMap.has(date)) toAdd.push(e);
                }

                const toRemove: Calendars.Exceptions[] = [];
                for (const [date, originalException] of origMap.entries()) {
                    if (!currMap.has(date)) toRemove.push(originalException);
                }

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
                    if (Number.isNaN(d.getTime())) continue;
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
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error('Error saving exceptions:', message);
            }
        },
        [groupedAvailability],
    );

    const confirmDeleteException = (exception: Calendars.Exceptions, index: number) => {
        Alert.alert(
            'Remove exception?',
            'This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteException(exception, index);
                        } catch (error) {
                            const message = error instanceof Error ? error.message : 'Unknown error occurred';
                            Alert.alert('Failed to remove exception', message);
                        }
                    },
                },
            ],
        );
    };

    return (
        <View style={[styles.section, { backgroundColor }]}>        
            <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Exception Dates</Text>
                <TouchableOpacity
                    onPress={async () => {
                        if (exceptionState.status === 'editing') {
                            await persistExceptionsDiff(exceptionsBeforeEdit.current ?? [], exceptions);
                            await fetchExceptions();
                            exceptionsBeforeEdit.current = null;
                        } else {
                            exceptionsBeforeEdit.current = [...exceptions];
                            setExceptionState({ status: 'editing' });
                        }
                    }}
                >
                    <Text style={styles.editLink}>{exceptionState.status === 'editing' ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>
            <Text style={{ color: textColor }}>
                {exceptionState.status === 'loading' && 'Loading exceptions...'}
                {exceptionState.status === 'error' && `Error: ${exceptionState.error}`}
                {(exceptionState.status === 'success' || exceptionState.status === 'editing') &&
                    exceptions.length === 0 &&
                    'No exception dates set'}
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
                            onChangeText={v => setExceptionStart(formatPartialTime(v))}
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
                            onChangeText={v => setExceptionEnd(formatPartialTime(v))}
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
                <TouchableOpacity onPress={addException} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Add Exception</Text>
                </TouchableOpacity>
            </View>
            {(exceptionState.status === 'success' || exceptionState.status === 'editing') &&
                exceptions.map((exception, index) => (
                    <View key={index} style={[styles.itemCard, { backgroundColor: cardColor }]}>
                        <Text style={[styles.exceptionDate, { color: textColor }]}>
                            {formatExceptionDate(exception.date)}
                        </Text>
                        <Text style={[styles.exceptionTime, { color: textColor }]}>
                            {exception.start_time && exception.end_time
                                ? formatDisplayInterval(exception.start_time, exception.end_time)
                                : 'All day'}
                        </Text>
                        <Text
                            style={[styles.exceptionStatus, {
                                color: exception.is_available ? '#10B981' : '#EF4444',
                            }]}
                        >
                            {exception.is_available ? 'Available' : 'Unavailable'}
                        </Text>
                        {exceptionState.status === 'editing' && (
                            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                <TouchableOpacity
                                    onPress={() => confirmDeleteException(exception, index)}
                                    style={styles.removeButton}
                                >
                                    <Text style={styles.removeButtonText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        paddingBottom: 40,
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
    editLink: {
        fontSize: 16,
        fontWeight: '600',
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
        marginBottom: 10,
        fontSize: 16,
        color: '#111827',
    },
    intervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    timeInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        fontSize: 16,
        color: '#111827',
        width: 90,
        textAlign: 'center',
    },
    timeSeparator: {
        marginHorizontal: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    toggleButton: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        paddingVertical: 10,
        marginRight: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    toggleButtonText: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 15,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    exceptionDate: {
        fontSize: 16,
        fontWeight: '600',
    },
    exceptionTime: {
        fontSize: 14,
        marginTop: 4,
    },
    exceptionStatus: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '600',
    },
    removeButton: {
        backgroundColor: '#F87171',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    removeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default Exceptions;
