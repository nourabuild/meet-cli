
import React, { useState, useEffect, useReducer, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Feather, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { UserRepo } from '@/repo';
import * as SecureStore from 'expo-secure-store';
import { NouraTimePicker } from '@/lib/components';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';

interface TimeInterval {
    start_time: string;
    end_time: string;
}

interface WeeklySchedule {
    day_of_week: number;
    intervals: TimeInterval[];
}

interface ExceptionDate {
    exception_date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
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

// -------------------------------
// State Management
// -------------------------------

type AvailabilityState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success" };

const initialWeeklySchedule: WeeklySchedule[] = [];

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

// -------------------------------------------------



export default function AvailabilityScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    // State management using reducers (same pattern as login/register)
    const [weeklySchedule, dispatchWeeklySchedule] = useReducer(weeklyScheduleReducer, initialWeeklySchedule);
    const [availabilityState, setAvailabilityState] = useReducer(
        (_state: AvailabilityState, newState: AvailabilityState) => newState,
        { status: "idle" }
    );
    const [exceptions, setExceptions] = useState<ExceptionDate[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
    const [selectedDateTime, setSelectedDateTime] = useState(new Date());
    const [editingException, setEditingException] = useState<number | null>(null);
    const [exceptionIsAvailable, setExceptionIsAvailable] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEditingExceptions, setIsEditingExceptions] = useState(false);
    const [currentStep, setCurrentStep] = useState<'date' | 'type' | 'time' | null>(null);
    const [tempException, setTempException] = useState<Partial<ExceptionDate>>({});
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Prevent double-invocation of effects in React 18 StrictMode (dev)
    const didLoadRef = useRef(false);

    // Helper: Dedupe exception dates by composite key
    const dedupeExceptions = (items: ExceptionDate[]) => {
        const map = new Map<string, ExceptionDate>();
        for (const e of items) {
            const key = `${e.exception_date}|${e.start_time}|${e.end_time}|${e.is_available ? 1 : 0}`;
            // Use the first occurrence; change to overwrite if server returns updates
            if (!map.has(key)) map.set(key, e);
        }
        return Array.from(map.values());
    };

    useEffect(() => {
        if (didLoadRef.current) return; // guard against StrictMode double-mount
        didLoadRef.current = true;
        const loadAvailability = async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) return;

                const result = await UserRepo.GetUserWeeklyAvailability(token);
                console.log('API Result:', result);

                if (result.success && Array.isArray(result.data)) {
                    console.log('Loaded data:', result.data);
                    // Group the API response by day_of_week
                    const scheduleMap = new Map();

                    result.data.forEach((timeSlot: any) => {
                        const dayId = timeSlot.day_of_week;
                        if (!scheduleMap.has(dayId)) {
                            scheduleMap.set(dayId, {
                                day_of_week: dayId,
                                intervals: []
                            });
                        }
                        scheduleMap.get(dayId).intervals.push({
                            start_time: timeSlot.start_time,
                            end_time: timeSlot.end_time
                        });
                    });

                    // Fill in all days, using existing data or empty intervals
                    const loadedSchedule = DAYS_OF_WEEK.map(day =>
                        scheduleMap.get(day.id) || {
                            day_of_week: day.id,
                            intervals: []
                        }
                    );

                    dispatchWeeklySchedule({ type: 'SET_SCHEDULE', payload: loadedSchedule });
                } else {
                    // Fallback to empty schedule (no default Mon-Fri hours)
                    const emptySchedule = DAYS_OF_WEEK.map(day => ({
                        day_of_week: day.id,
                        intervals: []
                    }));
                    dispatchWeeklySchedule({ type: 'SET_SCHEDULE', payload: emptySchedule });
                }

                // Load exception dates
                const getExceptionsResponse = await UserRepo.GetUserExceptionDates(token);
                if (getExceptionsResponse.success && Array.isArray(getExceptionsResponse.data)) {
                    setExceptions(dedupeExceptions(getExceptionsResponse.data));
                } else {
                    console.log('No exception dates found or failed to load');
                    setExceptions([]);
                }
            } catch (error) {
                console.error('Failed to load availability:', error);
                // Fallback to empty schedule on error
                const emptySchedule = DAYS_OF_WEEK.map(day => ({
                    day_of_week: day.id,
                    intervals: []
                }));
                dispatchWeeklySchedule({ type: 'SET_SCHEDULE', payload: emptySchedule });
            } finally {
                setIsInitialLoading(false);
            }
        };

        loadAvailability();
    }, []);

    const saveAvailability = async () => {
        setAvailabilityState({ status: "loading" });

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "Authentication token not found");
                setAvailabilityState({ status: "error", error: "Authentication token not found" });
                return;
            }

            // First, delete all existing availability entries to prevent duplicates
            console.log('=== DELETING EXISTING AVAILABILITY ===');
            const existingResult = await UserRepo.GetUserWeeklyAvailability(token);
            if (existingResult.success && Array.isArray(existingResult.data)) {
                for (const existingEntry of existingResult.data) {
                    const deleteResult = await UserRepo.DeleteUserWeeklyAvailabilityById(existingEntry.id, token);
                    if (!deleteResult.success) {
                        console.error(`Failed to delete availability entry ${existingEntry.id}:`, deleteResult.errors);
                        throw new Error(`Failed to delete existing availability entry`);
                    }
                    console.log(`✅ Successfully deleted availability entry ${existingEntry.id}`);
                }
            }
            console.log('✅ Successfully cleared all existing availability');

            const daysWithAvailability = weeklySchedule.filter(day => day.intervals.length > 0);

            console.log('=== SAVING NEW AVAILABILITY ===');
            console.log('Days with availability:', daysWithAvailability.map(d => ({
                day: DAYS_OF_WEEK.find(day => day.id === d.day_of_week)?.name,
                intervals: d.intervals
            })));

            for (const daySchedule of daysWithAvailability) {
                const dayName = DAYS_OF_WEEK.find(d => d.id === daySchedule.day_of_week)?.name || 'Unknown';
                console.log(`Saving ${dayName} (day ${daySchedule.day_of_week}) with intervals:`, daySchedule.intervals);

                const result = await UserRepo.AddUserWeeklyAvailability(
                    daySchedule.day_of_week,
                    daySchedule.intervals,
                    token
                );

                if (!result.success) {
                    console.error(`Failed to save availability for ${dayName}:`, result.errors);
                    throw new Error(`Failed to save availability for ${dayName}`);
                } else {
                    console.log(`✅ Successfully saved ${dayName}`);
                }
            }

            // Dedupe exceptions before saving to avoid creating duplicates on server
            const uniqueExceptions = dedupeExceptions(exceptions);
            for (const exception of uniqueExceptions) {
                const formData = new FormData();
                formData.append('exception_date', exception.exception_date);
                formData.append('start_time', exception.start_time);
                formData.append('end_time', exception.end_time);
                formData.append('is_available', exception.is_available.toString());

                const result = await UserRepo.AddUserExceptionDate(formData, token);
                if (!result.success) {
                    throw new Error(`Failed to save exception date ${exception.exception_date}`);
                }
            }

            Alert.alert("Success", "Availability saved successfully");
            setHasChanges(false);
            setAvailabilityState({ status: "success" });

        } catch (error) {
            console.error("Save availability error:", error);
            Alert.alert("Error", "Failed to save availability. Please try again.");
            setAvailabilityState({
                status: "error",
                error: error instanceof Error ? error.message : "Failed to save availability"
            });
        }
    };

    const toggleDayAvailability = (dayId: number) => {
        dispatchWeeklySchedule({ type: 'TOGGLE_DAY', payload: dayId });
        setHasChanges(true);
    };

    const addTimeInterval = (dayId: number) => {
        dispatchWeeklySchedule({ type: 'ADD_INTERVAL', payload: dayId });
        setHasChanges(true);
    };

    const removeTimeInterval = (dayId: number, intervalIndex: number) => {
        dispatchWeeklySchedule({
            type: 'REMOVE_INTERVAL',
            payload: { dayId, intervalIndex }
        });
        setHasChanges(true);
    };

    const updateTimeInterval = (dayId: number, intervalIndex: number, field: 'start_time' | 'end_time', value: string) => {
        dispatchWeeklySchedule({
            type: 'UPDATE_INTERVAL',
            payload: { dayId, intervalIndex, field, value }
        });
        setHasChanges(true);
    };

    const getDaySchedule = (dayId: number) => {
        return weeklySchedule.find(day => day.day_of_week === dayId) || { day_of_week: dayId, intervals: [] };
    };

    const handleTimePickerChange = (_event: any, selectedDate?: Date) => {
        if (selectedDate) {
            setSelectedDateTime(selectedDate);
        }
    };

    const handleTimePickerConfirm = () => {
        if (currentStep === 'date') {
            handleDateConfirm();
        } else if (currentStep === 'time') {
            handleTimeConfirmForException();
        } else {
            // Legacy flow for old exception management
            const formattedDate = selectedDateTime.toISOString().split('T')[0];

            const formattedStartTime = exceptionIsAvailable
                ? selectedDateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                : "00:00";

            const endTime = new Date(selectedDateTime);
            if (exceptionIsAvailable) {
                endTime.setHours(endTime.getHours() + 1);
            }
            const formattedEndTime = exceptionIsAvailable
                ? endTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                : "00:00";

            if (editingException !== null) {
                setExceptions(prev => dedupeExceptions(prev.map((exception, index) =>
                    index === editingException
                        ? {
                            ...exception,
                            exception_date: formattedDate,
                            start_time: formattedStartTime,
                            end_time: formattedEndTime,
                            is_available: exceptionIsAvailable
                        }
                        : exception
                )));
            } else {
                const newException: ExceptionDate = {
                    exception_date: formattedDate,
                    start_time: formattedStartTime,
                    end_time: formattedEndTime,
                    is_available: exceptionIsAvailable
                };
                setExceptions(prev => dedupeExceptions([...prev, newException]));
            }

            setIsTimePickerVisible(false);
            setEditingException(null);
            setExceptionIsAvailable(true);
            setHasChanges(true);
        }
    };

    const handleTimePickerCancel = () => {
        resetExceptionForm();
    };


    const removeExceptionDate = (index: number) => {
        setExceptions(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    // Exception flow functions
    const startAddNewException = () => {
        setEditingException(null);
        setTempException({});
        setSelectedDateTime(new Date());
        setCurrentStep('date');
        setIsTimePickerVisible(true);
    };

    const startEditException = (index: number) => {
        const exception = exceptions[index];
        setEditingException(index);
        setTempException(exception);
        const exceptionDateTime = new Date(exception.exception_date + 'T' + exception.start_time);
        setSelectedDateTime(exceptionDateTime);
        setExceptionIsAvailable(exception.is_available);
        setCurrentStep('date');
        setIsTimePickerVisible(true);
    };

    const handleDateConfirm = () => {
        const formattedDate = selectedDateTime.toISOString().split('T')[0];

        // Create a temporary exception entry to show in the list
        const tempExceptionEntry: ExceptionDate = {
            exception_date: formattedDate,
            start_time: "00:00",
            end_time: "00:00",
            is_available: true
        };

        if (editingException !== null) {
            // Editing existing exception
            setTempException(prev => ({ ...prev, exception_date: formattedDate }));
        } else {
            // Adding new exception - add it to the list temporarily
            setExceptions(prev => [...prev, tempExceptionEntry]);
            setEditingException(exceptions.length); // Set to the new index
            setTempException(tempExceptionEntry);
        }

        setCurrentStep('type');
        setIsTimePickerVisible(false);
    };

    const handleAvailabilityTypeSelect = (isAvailable: boolean) => {
        setExceptionIsAvailable(isAvailable);

        if (isAvailable) {
            setCurrentStep('time');
            setIsTimePickerVisible(true);
        } else {
            // For unavailable, set default times and save
            const finalException: ExceptionDate = {
                exception_date: tempException.exception_date || '',
                is_available: false,
                start_time: "00:00",
                end_time: "00:00"
            };

            // Update the exception in the list directly
            if (editingException !== null) {
                setExceptions(prev => prev.map((item, index) =>
                    index === editingException ? finalException : item
                ));
            }

            // Clear the editing state without calling resetExceptionForm
            setCurrentStep(null);
            setEditingException(null);
            setTempException({});
            setExceptionIsAvailable(true);
            setHasChanges(true);
        }
    };

    const handleTimeConfirmForException = () => {
        const formattedStartTime = selectedDateTime.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });

        const endTime = new Date(selectedDateTime);
        endTime.setHours(endTime.getHours() + 1);
        const formattedEndTime = endTime.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });

        const finalException: ExceptionDate = {
            exception_date: tempException.exception_date || '',
            is_available: true,
            start_time: formattedStartTime,
            end_time: formattedEndTime
        };

        // Update the exception in the list directly
        if (editingException !== null) {
            setExceptions(prev => prev.map((item, index) =>
                index === editingException ? finalException : item
            ));
        }

        // Clear the editing state
        setCurrentStep(null);
        setEditingException(null);
        setTempException({});
        setExceptionIsAvailable(true);
        setIsTimePickerVisible(false);
        setHasChanges(true);
    };

    const saveExceptionToList = (exception: ExceptionDate) => {
        if (editingException !== null) {
            setExceptions(prev => dedupeExceptions(prev.map((item, index) =>
                index === editingException ? exception : item
            )));
        } else {
            setExceptions(prev => dedupeExceptions([...prev, exception]));
        }

        resetExceptionForm();
        setHasChanges(true);
    };

    const resetExceptionForm = () => {
        // If we were adding a new exception and it's incomplete, remove it
        if (editingException !== null && currentStep === 'type') {
            const isNewException = editingException === exceptions.length - 1;
            const tempException = exceptions[editingException];

            // Check if it's a temporary exception (has default times and wasn't saved)
            if (isNewException && tempException.start_time === "00:00" && tempException.end_time === "00:00") {
                setExceptions(prev => prev.slice(0, -1)); // Remove the last (temporary) exception
            }
        }

        setCurrentStep(null);
        setEditingException(null);
        setTempException({});
        setExceptionIsAvailable(true);
        setIsTimePickerVisible(false);
    };

    const saveExceptions = async () => {
        setAvailabilityState({ status: "loading" });

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "Authentication token not found");
                setAvailabilityState({ status: "error", error: "Authentication token not found" });
                return;
            }

            // Dedupe exceptions before saving to avoid creating duplicates on server
            const uniqueExceptions = dedupeExceptions(exceptions);
            for (const exception of uniqueExceptions) {
                const formData = new FormData();
                formData.append('exception_date', exception.exception_date);
                formData.append('start_time', exception.start_time);
                formData.append('end_time', exception.end_time);
                formData.append('is_available', exception.is_available.toString());

                const result = await UserRepo.AddUserExceptionDate(formData, token);
                if (!result.success) {
                    throw new Error(`Failed to save exception date ${exception.exception_date}`);
                }
            }

            Alert.alert("Success", "Exception dates saved successfully");
            setHasChanges(false);
            setIsEditingExceptions(false);
            setAvailabilityState({ status: "success" });

        } catch (error) {
            console.error("Save exceptions error:", error);
            Alert.alert("Error", "Failed to save exception dates. Please try again.");
            setAvailabilityState({
                status: "error",
                error: error instanceof Error ? error.message : "Failed to save exception dates"
            });
        }
    };

    const renderTimeInput = (value: string, onChangeText: (text: string) => void, placeholder: string) => (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            maxLength={5}
            style={[styles.timeInput, { backgroundColor: cardColor, color: textColor }]}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: isEditMode ? 80 : 'auto' }}>
                        {isEditMode && (
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
                        )}
                        <Text style={[styles.dayName, { color: textColor }]}>
                            {day.name}
                        </Text>
                    </View>

                    <View style={[styles.timeContainer, { alignItems: isEditMode ? 'center' : 'flex-end' }]}>
                        {isAvailable && daySchedule.intervals.length > 0 && (
                            <>
                                {isEditMode ? (
                                    <View style={styles.timeInputContainer}>
                                        {renderTimeInput(
                                            daySchedule.intervals[0].start_time,
                                            (value) => updateTimeInterval(day.id, 0, 'start_time', value),
                                            "9:00am"
                                        )}
                                        <Text style={[styles.timeSeparator, { color: textColor }]}>-</Text>
                                        {renderTimeInput(
                                            daySchedule.intervals[0].end_time,
                                            (value) => updateTimeInterval(day.id, 0, 'end_time', value),
                                            "5:00pm"
                                        )}
                                    </View>
                                ) : (
                                    <Text style={[styles.timeText, { color: textColor }]}>
                                        {daySchedule.intervals[0].start_time} - {daySchedule.intervals[0].end_time}
                                    </Text>
                                )}
                            </>
                        )}

                        {!isAvailable && (
                            <Text style={[styles.unavailableText, { color: textColor }]}>Unavailable</Text>
                        )}
                    </View>

                    {isAvailable && isEditMode && (
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
                        <View style={{ width: isEditMode ? 80 : 'auto' }} />

                        <View style={[styles.timeContainer, { alignItems: isEditMode ? 'center' : 'flex-end' }]}>
                            {isEditMode ? (
                                <View style={styles.timeInputContainer}>
                                    {renderTimeInput(
                                        interval.start_time,
                                        (value) => updateTimeInterval(day.id, index + 1, 'start_time', value),
                                        "9:00am"
                                    )}
                                    <Text style={styles.timeSeparator}>-</Text>
                                    {renderTimeInput(
                                        interval.end_time,
                                        (value) => updateTimeInterval(day.id, index + 1, 'end_time', value),
                                        "5:00pm"
                                    )}
                                </View>
                            ) : (
                                <Text style={[styles.timeText, { color: textColor }]}>
                                    {interval.start_time} - {interval.end_time}
                                </Text>
                            )}
                        </View>

                        {isEditMode && (
                            <TouchableOpacity
                                onPress={() => removeTimeInterval(day.id, index + 1)}
                                style={styles.addButton}
                            >
                                <Feather name="x" size={14} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={[styles.header, { backgroundColor: backgroundColor, borderBottomColor: useThemeColor({}, 'border') }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    accessibilityHint="Returns to the previous screen"
                >
                    <Feather name="arrow-left" size={20} color={textColor} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Availability</Text>
                <View style={styles.headerRight}>
                    {isEditMode ? (
                        <TouchableOpacity
                            onPress={() => setIsEditMode(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing"
                            accessibilityHint="Discards changes and exits edit mode"
                        >
                            <Text style={[styles.cancelButtonText, { color: '#EF4444' }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    ) : isEditingExceptions ? (
                        <TouchableOpacity
                            onPress={() => setIsEditingExceptions(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing exceptions"
                            accessibilityHint="Exits exception editing mode"
                        >
                            <Text style={[styles.cancelButtonText, { color: '#EF4444' }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {isInitialLoading ? (
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 60
                    }}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={{
                            marginTop: 16,
                            fontSize: 16,
                            color: textColor,
                            fontWeight: '500'
                        }}>
                            Loading availability...
                        </Text>
                    </View>
                ) : (
                    <View>
                        <View style={[styles.sectionHeader, { backgroundColor: cardColor }]}>
                            <View style={styles.sectionHeaderLeft}>
                                <MaterialIcons name="event-available" size={20} color="#3B82F6" />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Weekly hours</Text>
                            </View>
                            {isEditMode ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        saveAvailability();
                                        setIsEditMode(false);
                                    }}
                                    disabled={availabilityState.status === 'loading'}
                                    style={[availabilityState.status === 'loading' && { opacity: 0.7 }]}
                                    accessibilityRole="button"
                                    accessibilityLabel={availabilityState.status === 'loading' ? 'Saving availability' : 'Save availability'}
                                    accessibilityHint="Saves your availability changes"
                                    accessibilityState={{ disabled: availabilityState.status === 'loading' }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {availabilityState.status === 'loading' && (
                                            <ActivityIndicator size="small" color="#000000" />
                                        )}
                                        <Text style={[styles.saveButtonText, { color: textColor }]}>
                                            {availabilityState.status === 'loading' ? 'Saving...' : 'Save'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => setIsEditMode(true)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Edit availability"
                                    accessibilityHint="Allows you to modify your availability schedule"
                                >
                                    <Text style={[styles.editAvailabilityButtonText, { color: '#3B82F6' }]}>
                                        Edit
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[{ backgroundColor: cardColor }]}>
                            {DAYS_OF_WEEK.map(renderDayRow)}
                        </View>

                        <View style={[styles.section, { backgroundColor: cardColor }]}>
                            <View style={[styles.sectionHeader, { backgroundColor: cardColor }]}>
                                <View style={styles.sectionHeaderLeft}>
                                    <AntDesign name="exception1" size={20} color="#3B82F6" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Exception dates</Text>
                                </View>
                                {isEditingExceptions ? (
                                    <TouchableOpacity
                                        style={styles.addNewButton}
                                        onPress={startAddNewException}
                                        accessibilityRole="button"
                                        accessibilityLabel="Add new exception date"
                                        accessibilityHint="Adds a new exception to your availability schedule"
                                    >
                                        <Text style={[styles.addNewText, { color: '#3B82F6' }]}>Add New</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setIsEditingExceptions(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Edit exception dates"
                                        accessibilityHint="Allows you to modify your exception dates"
                                    >
                                        <Text style={[styles.editAvailabilityButtonText, { color: '#3B82F6' }]}>
                                            Edit
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={[styles.sectionDescription, { color: textColor }]}>
                                Specify any exceptions to your regular weekly availability, such as different available hours on specific dates or periods of unavailability due to vacations, sick days, or other commitments
                            </Text>


                            {exceptions.length === 0 && !isEditingExceptions ? (
                                <View style={styles.emptyState}>
                                    <AntDesign name="calendar" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
                                    <Text style={[styles.emptyStateTitle, { color: textColor }]}>No exception dates</Text>
                                    <Text style={[styles.emptyStateDescription, { color: '#9CA3AF' }]}>
                                        Tap Edit to add specific dates when your availability differs from your regular schedule
                                    </Text>
                                </View>
                            ) : (
                                exceptions.map((exception, index) => {
                                    const exceptionDate = new Date(exception.exception_date);
                                    const formattedDate = exceptionDate.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    });

                                    return (
                                        <View key={index} style={[styles.exceptionCard, { backgroundColor: cardColor }]}>
                                            <View style={styles.exceptionCardContent}>
                                                <Text style={[styles.exceptionDate, { color: textColor }]}>{formattedDate}</Text>

                                                {currentStep === 'type' && editingException === index ? (
                                                    <View style={styles.typeSelectionContainer}>
                                                        <Text style={[styles.typeSelectionLabel, { color: textColor }]}>Select availability:</Text>
                                                        <View style={styles.typeSelectionButtons}>
                                                            <TouchableOpacity
                                                                style={[styles.typeButton, styles.unavailableButton]}
                                                                onPress={() => handleAvailabilityTypeSelect(false)}
                                                            >
                                                                <Feather name="x-circle" size={16} color="#EF4444" />
                                                                <Text style={[styles.typeButtonText, { color: '#EF4444' }]}>Unavailable</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={[styles.typeButton, styles.availableButton]}
                                                                onPress={() => handleAvailabilityTypeSelect(true)}
                                                            >
                                                                <Feather name="check-circle" size={16} color="#10B981" />
                                                                <Text style={[styles.typeButtonText, { color: '#10B981' }]}>Available</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <>
                                                        {exception.is_available && (
                                                            <Text style={[styles.exceptionTime, { color: textColor }]}>
                                                                {exception.start_time} - {exception.end_time}
                                                            </Text>
                                                        )}

                                                        <View style={[
                                                            styles.statusBadge,
                                                            { backgroundColor: exception.is_available ? '#D1FAE5' : '#FEE2E2', marginTop: 8 }
                                                        ]}>
                                                            <View style={[
                                                                styles.statusDot,
                                                                { backgroundColor: exception.is_available ? '#10B981' : '#EF4444' }
                                                            ]} />
                                                            <Text style={[
                                                                styles.statusText,
                                                                { color: exception.is_available ? '#065F46' : '#991B1B' }
                                                            ]}>
                                                                {exception.is_available ? 'Available' : 'Unavailable'}
                                                            </Text>
                                                        </View>
                                                    </>
                                                )}

                                                {!exception.is_available && exception.exception_date === "2024-12-25" && (
                                                    <Text style={styles.exceptionLabel}>Christmas Day</Text>
                                                )}
                                            </View>

                                            {isEditingExceptions && (
                                                <View style={styles.exceptionActions}>
                                                    <TouchableOpacity
                                                        onPress={() => startEditException(index)}
                                                        style={[styles.actionButton, styles.editButton]}
                                                        accessibilityLabel={`Edit exception for ${formattedDate}`}
                                                    >
                                                        <Feather name="edit-2" size={16} color="#3B82F6" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            Alert.alert(
                                                                "Delete Exception",
                                                                `Remove exception for ${formattedDate}?`,
                                                                [
                                                                    { text: "Cancel", style: "cancel" },
                                                                    {
                                                                        text: "Delete",
                                                                        style: "destructive",
                                                                        onPress: () => removeExceptionDate(index)
                                                                    }
                                                                ]
                                                            );
                                                        }}
                                                        style={[styles.actionButton, styles.deleteButton]}
                                                        accessibilityLabel={`Delete exception for ${formattedDate}`}
                                                    >
                                                        <Feather name="trash-2" size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}

                            {isEditingExceptions && (
                                <View style={[styles.exceptionSaveContainer, { marginBottom: 32 }]}>
                                    <TouchableOpacity
                                        onPress={saveExceptions}
                                        disabled={availabilityState.status === 'loading'}
                                        style={[styles.exceptionSaveButton,
                                        availabilityState.status === 'loading' && { opacity: 0.7 }]}
                                        accessibilityRole="button"
                                        accessibilityLabel={availabilityState.status === 'loading' ? 'Saving exception dates' : 'Save exception dates'}
                                        accessibilityHint="Saves your exception date changes"
                                        accessibilityState={{ disabled: availabilityState.status === 'loading' }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {availabilityState.status === 'loading' && (
                                                <ActivityIndicator size="small" color="#000000" />
                                            )}
                                            <Text style={styles.saveButtonText}>
                                                {availabilityState.status === 'loading' ? 'Saving...' : 'Save'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                )}





            </ScrollView>


            <NouraTimePicker
                visible={isTimePickerVisible}
                value={selectedDateTime}
                onChange={handleTimePickerChange}
                onConfirm={handleTimePickerConfirm}
                onCancel={handleTimePickerCancel}
                title={
                    currentStep === 'date'
                        ? (editingException !== null ? "Edit Exception Date" : "Select Exception Date")
                        : currentStep === 'time'
                            ? (editingException !== null ? "Edit Available Time" : "Set Available Time")
                            : exceptionIsAvailable
                                ? (editingException !== null ? "Edit Available Hours" : "Set Available Hours")
                                : (editingException !== null ? "Edit Unavailable Date" : "Mark Date as Unavailable")
                }
            />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
    },
    headerRight: {
        width: 64,
        alignItems: 'flex-end',
    },
    scrollView: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addNewText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },

    dayRow: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    dayName: {
        fontSize: 16,
        fontWeight: '500',
    },
    timeText: {
        fontSize: 16,
        fontWeight: '400',
    },
    unavailableText: {
        fontSize: 16,
        fontStyle: 'italic',
        fontWeight: '400',
    },
    timeInput: {
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
        textAlign: 'center',
        fontWeight: '500',
    },

    timeSeparator: {
        fontSize: 16,
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
        minHeight: 38,
        justifyContent: 'center',
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    section: {
        marginTop: 8,
    },
    sectionDescription: {
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    exceptionCard: {
        marginHorizontal: 20,
        marginVertical: 6,
        marginBottom: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    exceptionCardContent: {
        padding: 16,
    },
    exceptionDate: {
        fontSize: 16,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    exceptionTime: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    exceptionLabel: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
        fontStyle: 'italic',
    },
    exceptionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 12,
        right: 12,
        gap: 8,
    },
    typeSelectionContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    typeSelectionLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    typeSelectionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    typeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        gap: 6,
        flex: 1,
        justifyContent: 'center',
    },
    unavailableButton: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
    },
    availableButton: {
        borderColor: '#D1FAE5',
        backgroundColor: '#F0FDF4',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptyStateDescription: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    editButton: {
        backgroundColor: '#EFF6FF',
    },
    deleteButton: {
        backgroundColor: '#FEF2F2',
    },
    editAvailabilityButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    exceptionSaveContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    exceptionSaveButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
    },
});