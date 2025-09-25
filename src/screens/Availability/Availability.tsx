import React, { useEffect, useMemo, useReducer } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { CalendarRepo } from '@/repo';
import { Calendars } from '@/repo/calendars';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import Navbar from '@/lib/utils/navigation-bar';
import { convertUtcToLocalHHMM, formatPartialTime, isValidTime } from './utils';

type AvailabilityState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'success'; data: Calendars.Availability[] }
    | { status: 'editing' };

type AvailabilityAction =
    | { type: 'SET_SCHEDULE'; payload: Calendars.Availability[] }
    | { type: 'TOGGLE_DAY'; payload: number }
    | { type: 'UPDATE_TIME'; payload: { dayId: number; field: 'start_time' | 'end_time'; value: string } }
    | { type: 'ADD_TIME'; payload: { dayId: number; start_time?: string; end_time?: string } }
    | { type: 'REMOVE_TIME'; payload: { dayId: number; index: number } };

const availabilityReducer = (
    state: Calendars.Availability[],
    action: AvailabilityAction,
): Calendars.Availability[] => {
    switch (action.type) {
        case 'SET_SCHEDULE':
            return action.payload;
        case 'TOGGLE_DAY':
            return state.map(availability => {
                if (availability.day_of_week === action.payload) {
                    return availability.start_time && availability.end_time
                        ? { ...availability, start_time: '', end_time: '' }
                        : { ...availability, start_time: '09:00', end_time: '17:00' };
                }
                return availability;
            });
        case 'UPDATE_TIME':
            return state.map(availability => {
                if (availability.day_of_week === action.payload.dayId) {
                    return {
                        ...availability,
                        [action.payload.field]: action.payload.value,
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
};

const DAYS_OF_WEEK = [
    { id: 0, label: 'Sunday' },
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
    { id: 6, label: 'Saturday' },
] as const;

const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.id === dayOfWeek)?.label ?? '';
};

const Availability = () => {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    const [availability, dispatchAvailability] = useReducer(availabilityReducer, []);
    const [availabilityState, setAvailabilityState] = useReducer(
        (_: AvailabilityState, newState: AvailabilityState) => newState,
        { status: 'idle' } as AvailabilityState,
    );

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

    useEffect(() => {
        const fetchAvailability = async () => {
            setAvailabilityState({ status: 'loading' });
            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) {
                    setAvailabilityState({ status: 'error', error: 'No authentication token found' });
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

                dispatchAvailability({ type: 'SET_SCHEDULE', payload: localizedAvailability });
                setAvailabilityState({ status: 'success', data: localizedAvailability });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error occurred';
                setAvailabilityState({ status: 'error', error: message });
            }
        };

        fetchAvailability();
    }, []);

    const groupedAvailability = useMemo(() => {
        const byDay: Record<number, Calendars.TimeInterval[]> = {};
        for (let d = 0; d <= 6; d += 1) byDay[d] = [];
        availability.forEach(item => {
            if (item.start_time && item.end_time) {
                byDay[item.day_of_week].push({ start_time: item.start_time, end_time: item.end_time });
            }
        });
        return byDay;
    }, [availability]);

    const addUserWeeklyAvailability = async (dayOfWeek: number, intervals: Calendars.TimeInterval[]) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            const response = await CalendarRepo.AddUserWeeklyAvailability(dayOfWeek, intervals, token);
            if (!response.success) {
                throw new Error(response.errors?.[0]?.error || 'Failed to add availability');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error adding availability:', message);
        }
    };

    const handleAddTime = (dayId: number) => {
        dispatchAvailability({ type: 'ADD_TIME', payload: { dayId } });
        const current = groupedAvailability[dayId] ?? [];
        const intervals: Calendars.TimeInterval[] = [...current, { start_time: '09:00', end_time: '17:00' }];
        addUserWeeklyAvailability(dayId, intervals);
    };

    const handleRemoveTime = (dayId: number, index: number) => {
        dispatchAvailability({ type: 'REMOVE_TIME', payload: { dayId, index } });
        const current = groupedAvailability[dayId] ?? [];
        const intervals: Calendars.TimeInterval[] = current.filter((_, i) => i !== index);
        addUserWeeklyAvailability(dayId, intervals);
    };

    const handleUpdateTime = (dayId: number, index: number, field: 'start_time' | 'end_time', value: string) => {
        const formatted = formatPartialTime(value);
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
            addUserWeeklyAvailability(dayId, []);
            return;
        }

        const allValid = intervals.every(iv => isValidTime(iv.start_time) && isValidTime(iv.end_time));
        if (!allValid) {
            console.error('Please enter times as HH:MM');
            return;
        }
        addUserWeeklyAvailability(dayId, intervals);
    };

    return (
        <View style={[styles.container, { backgroundColor }]}> 
            <Navbar backgroundColor={backgroundColor}>
                <View style={styles.navbarContent}>
                    <Text style={[styles.title, { color: textColor }]}>Availability</Text>
                </View>
            </Navbar>
            <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, styles.sectionTitleInline, { color: textColor }]}>Weekly Schedule</Text>
                        <TouchableOpacity
                            onPress={() =>
                                setAvailabilityState(
                                    availabilityState.status === 'editing'
                                        ? { status: 'success', data: availability }
                                        : { status: 'editing' },
                                )
                            }
                        >
                            <Text style={styles.editLink}>{availabilityState.status === 'editing' ? 'Done' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: textColor }}>
                        {availabilityState.status === 'loading' && 'Loading availability...'}
                        {availabilityState.status === 'error' && `Error: ${availabilityState.error}`}
                        {(availabilityState.status === 'success' || availabilityState.status === 'editing') &&
                            availability.length === 0 &&
                            'No availability set'}
                    </Text>

                    {(availabilityState.status === 'success' || availabilityState.status === 'editing') && (
                        <View>
                            <View style={[styles.itemCard, { backgroundColor: cardColor, marginBottom: 15 }]}>
                                <Text style={[styles.dayName, { color: textColor, textAlign: 'center' }]}>Device Timezone: {Localization.getCalendars()[0]?.timeZone}</Text>
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

                            {DAYS_OF_WEEK.map(day => {
                                const intervals = groupedAvailability[day.id] || [];
                                const isAvailable = intervals.length > 0;
                                return (
                                    <View key={day.id} style={[styles.itemCard, { backgroundColor: cardColor }]}>
                                        <View style={styles.dayHeaderRow}>
                                            <Text style={[styles.dayName, { color: textColor }]}>{getDayLabel(day.id)}</Text>
                                            {availabilityState.status === 'editing' && !isAvailable && (
                                                <TouchableOpacity onPress={() => handleAddTime(day.id)} style={styles.smallButton}>
                                                    <Text style={styles.smallButtonText}>+ Add</Text>
                                                </TouchableOpacity>
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
                                        {availabilityState.status === 'editing' &&
                                            intervals.map((interval, idx) => (
                                                <View key={idx} style={styles.intervalRow}>
                                                    <TextInput
                                                        value={interval.start_time}
                                                        onChangeText={v => handleUpdateTime(day.id, idx, 'start_time', v)}
                                                        onEndEditing={() => handleSaveDay(day.id)}
                                                        placeholder="09:00"
                                                        placeholderTextColor="#9CA3AF"
                                                        maxLength={5}
                                                        style={styles.timeInput}
                                                    />
                                                    <Text style={styles.timeSeparator}>-</Text>
                                                    <TextInput
                                                        value={interval.end_time}
                                                        onChangeText={v => handleUpdateTime(day.id, idx, 'end_time', v)}
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
        </View>
    );
};

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
    title: {
        fontSize: 28,
        paddingBottom: 10,
        fontWeight: '700',
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
    dayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayName: {
        fontSize: 16,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 16,
        marginTop: 5,
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
    smallButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    smallButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
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

export default Availability;
