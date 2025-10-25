import React, { useReducer } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface TimeInterval {
    start_time: string;
    end_time: string;
}

export interface WeeklySchedule {
    day_of_week: number;
    intervals: TimeInterval[];
}

const DAYS_OF_WEEK = [
    { id: 0, name: 'SUN', label: 'Sunday' },
    { id: 1, name: 'MON', label: 'Monday' },
    { id: 2, name: 'TUE', label: 'Tuesday' },
    { id: 3, name: 'WED', label: 'Wednesday' },
    { id: 4, name: 'THU', label: 'Thursday' },
    { id: 5, name: 'FRI', label: 'Friday' },
    { id: 6, name: 'SAT', label: 'Saturday' },
];

export const createEmptyWeeklySchedule = (): WeeklySchedule[] =>
    DAYS_OF_WEEK.map(day => ({
        day_of_week: day.id,
        intervals: [],
    }));

export const cloneWeeklySchedule = (schedule: WeeklySchedule[]): WeeklySchedule[] =>
    schedule.map(day => ({
        ...day,
        intervals: day.intervals.map(interval => ({ ...interval })),
    }));

type CalendarStepOnboardingProps = {
    initialSchedule?: WeeklySchedule[];
    onContinue?: (schedule: WeeklySchedule[]) => Promise<void> | void;
};

function weeklyScheduleReducer(state: WeeklySchedule[], action: { type: string; payload?: any }) {
    switch (action.type) {
        case 'SET_SCHEDULE':
            return action.payload;
        case 'TOGGLE_DAY':
            return state.map(day => {
                if (day.day_of_week === action.payload) {
                    return {
                        ...day,
                        intervals: day.intervals.length > 0 ? [] : [{ start_time: "09:00", end_time: "17:00" }]
                    };
                }
                return day;
            });
        case 'ADD_INTERVAL':
            return state.map(day => {
                if (day.day_of_week === action.payload) {
                    return {
                        ...day,
                        intervals: [...day.intervals, { start_time: "09:00", end_time: "17:00" }]
                    };
                }
                return day;
            });
        case 'REMOVE_INTERVAL':
            return state.map(day => {
                if (day.day_of_week === action.payload.dayId) {
                    return {
                        ...day,
                        intervals: day.intervals.filter((_, index) => index !== action.payload.intervalIndex)
                    };
                }
                return day;
            });
        case 'UPDATE_INTERVAL':
            return state.map(day => {
                if (day.day_of_week === action.payload.dayId) {
                    return {
                        ...day,
                        intervals: day.intervals.map((interval, index) =>
                            index === action.payload.intervalIndex
                                ? { ...interval, [action.payload.field]: action.payload.value }
                                : interval
                        )
                    };
                }
                return day;
            });
        default:
            return state;
    }
}

function CalendarStepOnboarding({ initialSchedule, onContinue }: CalendarStepOnboardingProps) {
    const [weeklySchedule, dispatchWeeklySchedule] = useReducer(
        weeklyScheduleReducer,
        initialSchedule ?? createEmptyWeeklySchedule(),
        cloneWeeklySchedule
    );

    const toggleDayAvailability = (dayId: number) => {
        dispatchWeeklySchedule({ type: 'TOGGLE_DAY', payload: dayId });
    };

    const addTimeInterval = (dayId: number) => {
        dispatchWeeklySchedule({ type: 'ADD_INTERVAL', payload: dayId });
    };

    const removeTimeInterval = (dayId: number, intervalIndex: number) => {
        dispatchWeeklySchedule({
            type: 'REMOVE_INTERVAL',
            payload: { dayId, intervalIndex }
        });
    };

    const updateTimeInterval = (dayId: number, intervalIndex: number, field: 'start_time' | 'end_time', value: string) => {
        dispatchWeeklySchedule({
            type: 'UPDATE_INTERVAL',
            payload: { dayId, intervalIndex, field, value }
        });
    };

    const getDaySchedule = (dayId: number) => {
        return weeklySchedule.find(day => day.day_of_week === dayId) || { day_of_week: dayId, intervals: [] };
    };

    const renderTimeInput = (value: string, onChangeText: (text: string) => void, placeholder: string) => (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            maxLength={5}
            style={styles.timeInput}
            selectionColor="#3B82F6"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numeric"
            accessibilityLabel={`${placeholder} time input`}
            accessibilityHint="Enter time in HH:MM format"
            accessibilityRole="none"
        />
    );

    const renderDayRow = (day: typeof DAYS_OF_WEEK[0]) => {
        const daySchedule = getDaySchedule(day.id);
        const isAvailable = daySchedule.intervals.length > 0;

        return (
            <View key={day.id}>
                <View style={[styles.dayRow, {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: 80 }}>
                        <TouchableOpacity
                            onPress={() => toggleDayAvailability(day.id)}
                            style={styles.checkbox}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isAvailable }}
                            accessibilityLabel={`${isAvailable ? 'Disable' : 'Enable'} availability for ${day.label}`}
                        >
                            <Feather
                                name={isAvailable ? "check-square" : "square"}
                                size={20}
                                color={isAvailable ? "#10B981" : "#9CA3AF"}
                            />
                        </TouchableOpacity>
                        <Text style={styles.dayName}>
                            {day.name}
                        </Text>
                    </View>

                    <View style={[styles.timeContainer, { alignItems: 'center' }]}>
                        {isAvailable && daySchedule.intervals.length > 0 && (
                            <View style={styles.timeInputContainer}>
                                {renderTimeInput(
                                    daySchedule.intervals[0].start_time,
                                    (value) => updateTimeInterval(day.id, 0, 'start_time', value),
                                    "9:00"
                                )}
                                <Text style={styles.timeSeparator}>-</Text>
                                {renderTimeInput(
                                    daySchedule.intervals[0].end_time,
                                    (value) => updateTimeInterval(day.id, 0, 'end_time', value),
                                    "17:00"
                                )}
                            </View>
                        )}

                        {!isAvailable && (
                            <View style={styles.timePlaceholder}>
                                <Text style={styles.unavailableText}>Unavailable</Text>
                            </View>
                        )}
                    </View>

                    {isAvailable && (
                        <TouchableOpacity
                            onPress={() => addTimeInterval(day.id)}
                            style={styles.addButton}
                            accessibilityRole="button"
                            accessibilityLabel={`Add time interval for ${day.label}`}
                            accessibilityHint="Adds another time range for this day"
                        >
                            <Feather name="plus" size={20} />
                        </TouchableOpacity>
                    )}
                </View>

                {isAvailable && daySchedule.intervals.slice(1).map((interval, index) => (
                    <View key={index + 1} style={[styles.dayRow, {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }]}>
                        <View style={{ width: 80 }} />

                        <View style={[styles.timeContainer, { alignItems: 'center' }]}>
                            <View style={styles.timeInputContainer}>
                                {renderTimeInput(
                                    interval.start_time,
                                    (value) => updateTimeInterval(day.id, index + 1, 'start_time', value),
                                    "9:00"
                                )}
                                <Text style={styles.timeSeparator}>-</Text>
                                {renderTimeInput(
                                    interval.end_time,
                                    (value) => updateTimeInterval(day.id, index + 1, 'end_time', value),
                                    "17:00"
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => removeTimeInterval(day.id, index + 1)}
                            style={styles.addButton}
                        >
                            <Feather name="x" size={14} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    const handleContinue = () => {
        onContinue?.(cloneWeeklySchedule(weeklySchedule));
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <Text style={styles.title}>Set Your Schedule</Text>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Text style={styles.subtitle}>
                        Set your weekly availability to let others know when you are free to meet
                    </Text>

                    <View style={styles.availabilityContent}>
                        {DAYS_OF_WEEK.map(renderDayRow)}
                    </View>

                    <TouchableOpacity
                        onPress={handleContinue}
                        style={styles.continueButton}
                        accessibilityRole="button"
                        accessibilityLabel="Continue to next step"
                        accessibilityHint="Saves your schedule choices and continues onboarding"
                    >
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

export default CalendarStepOnboarding;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 12,
        paddingTop: 12,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'left',
    },
    headerSafeArea: {
        backgroundColor: '#FAFAFA',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'left',
        marginBottom: 24,
        lineHeight: 24,
    },
    availabilityContent: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 16,
    },
    dayRow: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    dayName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    unavailableText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontStyle: 'italic',
        fontWeight: '400',
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
    checkbox: {
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        marginLeft: 8,
    },
    timeContainer: {
        flex: 1,
        minHeight: 44,
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    timePlaceholder: {
        minHeight: 44,
        justifyContent: 'center',
    },
    continueButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 32,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
