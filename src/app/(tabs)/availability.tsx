
import React, { useEffect, useReducer } from 'react';
import {
    View,
    Text,
    StyleSheet
} from 'react-native';
import { CalendarRepo } from '@/repo';
import * as SecureStore from 'expo-secure-store';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import { Calendars } from '@/repo/calendars';

// -------------------------------
// State Management
// -------------------------------

type AvailabilityState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Calendars.Availability[] };


function availabilityReducer(
    state: Calendars.Availability[],
    action:
        | { type: 'SET_SCHEDULE'; payload: Calendars.Availability[] }
        | { type: 'TOGGLE_DAY'; payload: number }
        | { type: 'UPDATE_TIME'; payload: { dayId: number; field: 'start_time' | 'end_time'; value: string } }
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
                    };
                }
                return availability;
            });
        default:
            return state;
    }
}


type ExceptionState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Calendars.Exceptions[] };


function exceptionReducer(
    state: Calendars.Exceptions[],
    action:
        | { type: 'SET_EXCEPTIONS'; payload: Calendars.Exceptions[] }
        | { type: 'ADD_EXCEPTION'; payload: Calendars.Exceptions }
        | { type: 'REMOVE_EXCEPTION'; payload: number }
) {
    switch (action.type) {
        case 'SET_EXCEPTIONS':
            return action.payload;
        case 'ADD_EXCEPTION':
            return [...state, action.payload];
        case 'REMOVE_EXCEPTION':
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

            dispatchAvailability({ type: 'SET_SCHEDULE', payload: availabilityData });
            setAvailabilityState({ status: "success", data: availabilityData });
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

            dispatchExceptions({ type: 'SET_EXCEPTIONS', payload: exceptionData });
            setExceptionState({ status: "success", data: exceptionData });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setExceptionState({ status: "error", error: errorMessage });
        }
    };



    useEffect(() => {
        getUserWeeklyAvailability();
        getUserExceptionDates();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <Text style={[styles.title, { color: textColor }]}>
                Availability
            </Text>

            {/* Availability Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Weekly Schedule</Text>
                <Text style={{ color: textColor }}>
                    {availabilityState.status === "loading" && "Loading availability..."}
                    {availabilityState.status === "error" && `Error: ${availabilityState.error}`}
                    {availabilityState.status === "success" && availability.length === 0 && "No availability set"}
                    {availabilityState.status === "success" && availability.length > 0 && "Your weekly availability:"}
                </Text>
                {availabilityState.status === "success" && availability.map((item) => (
                    <View key={item.day_of_week} style={[styles.itemCard, { backgroundColor: cardColor }]}>
                        <Text style={[styles.dayName, { color: textColor }]}>
                            {getDayLabel(item.day_of_week)}
                        </Text>
                        <Text style={[styles.timeText, { color: textColor }]}>
                            {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : "Unavailable"}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Exceptions Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Exception Dates</Text>
                <Text style={{ color: textColor }}>
                    {exceptionState.status === "loading" && "Loading exceptions..."}
                    {exceptionState.status === "error" && `Error: ${exceptionState.error}`}
                    {exceptionState.status === "success" && exceptions.length === 0 && "No exception dates set"}
                    {exceptionState.status === "success" && exceptions.length > 0 && "Your exception dates:"}
                </Text>
                {exceptionState.status === "success" && exceptions.map((exception, index) => (
                    <View key={index} style={[styles.itemCard, { backgroundColor: cardColor }]}>
                        <Text style={[styles.exceptionDate, { color: textColor }]}>
                            {exception.date ? new Date(exception.date).toLocaleDateString() : "Invalid date"}
                        </Text>
                        <Text style={[styles.exceptionTime, { color: textColor }]}>
                            {exception.start_time && exception.end_time ? `${exception.start_time} - ${exception.end_time}` : "All day"}
                        </Text>
                        <Text style={[styles.exceptionStatus, {
                            color: exception.is_available ? '#10B981' : '#EF4444'
                        }]}>
                            {exception.is_available ? 'Available' : 'Unavailable'}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
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
    dayName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 14,
        color: '#666',
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
});

