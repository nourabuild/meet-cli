import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';

import { theme } from '@/styles/theme';
import { NouraButton, NouraTimePicker } from '@/lib/components';
import { Users } from '@/repo/users';
import { UserRepo, MeetingRepo, CalendarRepo } from '@/repo';
import { useReduxSelector } from '@/lib/hooks';
import SafeAreaContainer from '@/lib/utils/safe-area-container';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';

// -------------------------------
// Form + State Management
// -------------------------------

type CreateMeetingState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: any };

type FormFields = {
    title: string;
    appointed_at: string;
    participants: Users.User[];
};

type SearchState =
    | { status: "idle"; query: string }
    | { status: "loading"; query: string }
    | { status: "error"; error: string; query: string }
    | { status: "success"; data: Users.User[]; query: string };

const initialFormState: FormFields = {
    title: "",
    appointed_at: "",
    participants: [],
};

const initialSearchState: SearchState = { status: "idle", query: "" };

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatDayLabel = (dayOfWeek: number): string => {
    if (!Number.isFinite(dayOfWeek)) {
        return `Day ${dayOfWeek}`;
    }
    const normalized = ((Math.trunc(dayOfWeek) % 7) + 7) % 7;
    return DAY_NAMES[normalized] ?? `Day ${dayOfWeek}`;
};

const formatTimeDisplay = (value: string): string => {
    if (!value) {
        return "";
    }

    if (value.includes('T')) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
    }

    const parts = value.split(':');
    if (parts.length >= 2) {
        const hour = Number.parseInt(parts[0], 10);
        const minute = Number.parseInt(parts[1], 10);

        if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
            const date = new Date();
            date.setHours(hour, minute, 0, 0);
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
    }

    return value;
};

const formatAvailabilityWindow = (start: string | null, end: string | null): string => {
    if (start && end) {
        return `${formatTimeDisplay(start)} - ${formatTimeDisplay(end)}`;
    }
    if (start) {
        return `${formatTimeDisplay(start)} onward`;
    }
    if (end) {
        return `Until ${formatTimeDisplay(end)}`;
    }
    return "All day";
};

type ParticipantAvailabilityEntry = {
    dayOfWeek: number;
    startTime: string | null;
    endTime: string | null;
    isAvailable: boolean;
    source: 'weekly' | 'exception';
};

type ParticipantAvailabilityState =
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: ParticipantAvailabilityEntry[] };

function formReducer(state: FormFields, action: { name: keyof FormFields; value: string } | { type: 'SET_PARTICIPANTS'; participants: Users.User[] } | { type: 'ADD_PARTICIPANT'; participant: Users.User } | { type: 'REMOVE_PARTICIPANT'; participantId: string; currentUserId?: string }) {
    if ('type' in action) {
        switch (action.type) {
            case 'SET_PARTICIPANTS':
                return { ...state, participants: action.participants };
            case 'ADD_PARTICIPANT':
                const existingParticipant = state.participants.find(p => p.id === action.participant.id);
                if (!existingParticipant) {
                    return { ...state, participants: [...state.participants, action.participant] };
                }
                return state;
            case 'REMOVE_PARTICIPANT':
                // Prevent removing the current user (meeting owner)
                if (action.currentUserId && action.participantId === action.currentUserId) {
                    return state;
                }
                return { ...state, participants: state.participants.filter(p => p.id !== action.participantId) };
            default:
                return state;
        }
    }

    return {
        ...state,
        [action.name]: action.value,
    };
}

function searchReducer(state: SearchState, action: { type: 'SET_QUERY'; query: string } | { type: 'START_SEARCH' } | { type: 'SEARCH_SUCCESS'; data: Users.User[] } | { type: 'SEARCH_ERROR'; error: string } | { type: 'RESET_SEARCH' }): SearchState {
    switch (action.type) {
        case 'SET_QUERY':
            return { ...state, query: action.query };
        case 'START_SEARCH':
            return { status: "loading", query: state.query };
        case 'SEARCH_SUCCESS':
            return { status: "success", data: action.data, query: state.query };
        case 'SEARCH_ERROR':
            return { status: "error", error: action.error, query: state.query };
        case 'RESET_SEARCH':
            return { status: "idle", query: "" };
        default:
            return state;
    }
}

// -------------------------------
// Component
// -------------------------------

export default function NewMeeting() {
    const currentUser = useReduxSelector((state) => state.user?.user);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const MEETING_TIME_INTERVAL = 15;

    const clampToMeetingInterval = useCallback((date: Date): Date => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return date;
        }
        const clamped = new Date(date);
        const minutes = clamped.getMinutes();
        const remainder = minutes % MEETING_TIME_INTERVAL;
        if (remainder !== 0) {
            const half = MEETING_TIME_INTERVAL / 2;
            const adjust = remainder >= half ? MEETING_TIME_INTERVAL - remainder : -remainder;
            clamped.setMinutes(minutes + adjust);
        }
        clamped.setSeconds(0, 0);
        return clamped;
    }, [MEETING_TIME_INTERVAL]);

    const [formState, dispatch] = useReducer(formReducer, {
        ...initialFormState,
        participants: currentUser ? [currentUser] : []
    });
    const [searchState, searchDispatch] = useReducer(searchReducer, initialSearchState);
    const [createMeetingState, setCreateMeetingState] = useState<CreateMeetingState>({ status: "idle" });

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDateTime, setTempDateTime] = useState<Date | null>(null);
    const [participantAvailability, setParticipantAvailability] = useState<Record<string, ParticipantAvailabilityState>>({});

    const invitedParticipants = useMemo(
        () => formState.participants.filter((participant) => !currentUser || participant.id !== currentUser.id),
        [formState.participants, currentUser]
    );
    const hasAdditionalParticipants = invitedParticipants.length > 0;
    const participantIds = useMemo<Set<string>>(
        () => new Set(formState.participants.map((participant) => participant.id)),
        [formState.participants]
    );
    const filteredSearchResults = useMemo(() => {
        if (searchState.status !== "success") {
            return [];
        }
        return searchState.data
            .filter(user => !currentUser || user.id !== currentUser.id)
            .filter(user => !participantIds.has(user.id));
    }, [searchState, currentUser, participantIds]);

    const fetchParticipantAvailability = useCallback(async (userId: string) => {
        if (!userId) {
            return;
        }

        setParticipantAvailability((prev) => ({
            ...prev,
            [userId]: { status: "loading" },
        }));

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setParticipantAvailability((prev) => ({
                    ...prev,
                    [userId]: { status: "error", error: "User not authenticated. Please log in again." },
                }));
                return;
            }

            const response = await CalendarRepo.GetUserCalendarEntries(userId, token);

            if (!response.success) {
                const errorMessage = response.errors && response.errors.length > 0
                    ? response.errors[0].error
                    : "Failed to load availability.";
                setParticipantAvailability((prev) => ({
                    ...prev,
                    [userId]: { status: "error", error: errorMessage },
                }));
                return;
            }

            const rawEntries = Array.isArray(response.data.entries) ? response.data.entries : [];
            const rawExceptions = Array.isArray(response.data.exceptions) ? response.data.exceptions : [];

            const normalizedEntries = rawEntries.reduce<ParticipantAvailabilityEntry[]>((acc, entry) => {
                if (typeof entry?.start_time !== 'string' || typeof entry?.end_time !== 'string') {
                    // Allow entries without explicit times only if they represent all-day availability
                    const hasAllDayFlag = entry?.start_time == null && entry?.end_time == null;
                    if (!hasAllDayFlag) {
                        return acc;
                    }
                }

                let dayOfWeek: number | undefined = entry.day_of_week;
                if (typeof dayOfWeek === 'string') {
                    const parsed = Number.parseInt(dayOfWeek, 10);
                    dayOfWeek = Number.isNaN(parsed) ? undefined : parsed;
                }

                if (typeof dayOfWeek !== 'number' || Number.isNaN(dayOfWeek)) {
                    if (entry.start_time.includes('T')) {
                        const parsedDate = new Date(entry.start_time);
                        if (!Number.isNaN(parsedDate.getTime())) {
                            dayOfWeek = parsedDate.getDay();
                        }
                    }
                }

                if (typeof dayOfWeek !== 'number' || Number.isNaN(dayOfWeek)) {
                    return acc;
                }

                acc.push({
                    dayOfWeek,
                    startTime: typeof entry.start_time === 'string' ? entry.start_time : null,
                    endTime: typeof entry.end_time === 'string' ? entry.end_time : null,
                    isAvailable: entry.is_available === false ? false : true,
                    source: 'weekly',
                });

                return acc;
            }, []);

            const normalizedExceptions = rawExceptions.reduce<ParticipantAvailabilityEntry[]>((acc, exception) => {
                if (!exception) {
                    return acc;
                }

                const dateValue = typeof exception.date === 'string'
                    ? exception.date
                    : (typeof (exception as any).exception_date === 'string' ? (exception as any).exception_date : null);
                if (!dateValue) {
                    return acc;
                }

                const parsedDate = new Date(dateValue);
                if (Number.isNaN(parsedDate.getTime())) {
                    return acc;
                }

                const start = (typeof exception.start_time === 'string' && exception.start_time.length > 0)
                    ? exception.start_time
                    : (('start' in exception) && typeof (exception as any).start === 'string' && (exception as any).start.length > 0)
                        ? (exception as any).start
                        : null;

                const end = (typeof exception.end_time === 'string' && exception.end_time.length > 0)
                    ? exception.end_time
                    : (('end' in exception) && typeof (exception as any).end === 'string' && (exception as any).end.length > 0)
                        ? (exception as any).end
                        : null;

                acc.push({
                    dayOfWeek: parsedDate.getDay(),
                    startTime: start,
                    endTime: end,
                    isAvailable: exception.is_available === true,
                    source: 'exception',
                });

                return acc;
            }, []);

            const combined = [...normalizedEntries, ...normalizedExceptions];

            combined.sort((a, b) => {
                if (a.dayOfWeek === b.dayOfWeek) {
                    if (a.startTime && b.startTime) {
                        return a.startTime.localeCompare(b.startTime);
                    }
                    if (a.startTime) return -1;
                    if (b.startTime) return 1;
                    return 0;
                }
                return a.dayOfWeek - b.dayOfWeek;
            });

            setParticipantAvailability((prev) => ({
                ...prev,
                [userId]: { status: "success", data: combined },
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load availability.";
            setParticipantAvailability((prev) => ({
                ...prev,
                [userId]: { status: "error", error: message },
            }));
        }
    }, []);

    useEffect(() => {
        if (!hasAdditionalParticipants) {
            setParticipantAvailability((prev) => (Object.keys(prev).length === 0 ? prev : {}));
            return;
        }

        const participantIds = new Set(invitedParticipants.map((participant) => participant.id));

        setParticipantAvailability((prev) => {
            let hasRemoval = false;
            for (const id of Object.keys(prev)) {
                if (!participantIds.has(id)) {
                    hasRemoval = true;
                    break;
                }
            }

            if (!hasRemoval) {
                return prev;
            }

            const next: Record<string, ParticipantAvailabilityState> = {};
            participantIds.forEach((id) => {
                if (prev[id]) {
                    next[id] = prev[id];
                }
            });

            return next;
        });
    }, [hasAdditionalParticipants, invitedParticipants]);

    useEffect(() => {
        invitedParticipants.forEach((participant) => {
            const state = participantAvailability[participant.id];
            if (!state) {
                fetchParticipantAvailability(participant.id);
            }
        });
    }, [invitedParticipants, participantAvailability, fetchParticipantAvailability]);

    const handleSearchUsers = async (query: string) => {
        searchDispatch({ type: 'SET_QUERY', query });

        if (query.trim().length === 0) {
            searchDispatch({ type: 'RESET_SEARCH' });
            return;
        }

        searchDispatch({ type: 'START_SEARCH' });

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error('No auth token available');
                searchDispatch({ type: 'SEARCH_ERROR', error: 'No authentication token available' });
                return;
            }

            const controller = new AbortController();
            const response = await UserRepo.SearchUsers(query, token, controller.signal);

            if (response.success) {
                searchDispatch({ type: 'SEARCH_SUCCESS', data: response.users });
            } else {
                searchDispatch({ type: 'SEARCH_ERROR', error: response.errors ? 'Search failed' : 'Search failed' });
            }
        } catch (error) {
            searchDispatch({ type: 'SEARCH_ERROR', error: error instanceof Error ? error.message : 'Search failed' });
        }
    };


    const handleCreateMeeting = async () => {
        setCreateMeetingState({ status: "loading" });

        try {
            if (!formState.appointed_at) {
                setCreateMeetingState({ status: "error", error: "Please select a meeting time before creating the meeting." });
                return;
            }
            // Debug log the form state
            console.log('Form state before submission:', formState);
            console.log('Selected meeting time:', formState.appointed_at);
            console.log('Meeting time as Date:', formState.appointed_at ? new Date(formState.appointed_at) : null);
            console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
            if (formState.appointed_at) {
                const appointedDate = new Date(formState.appointed_at);
                console.log('Local time string:', appointedDate.toLocaleString());
                console.log('UTC time string:', appointedDate.toISOString());
                console.log('Day of week:', appointedDate.getDay()); // 0=Sunday, 1=Monday, etc.
                console.log('Local hour:', appointedDate.getHours());
                console.log('UTC hour:', appointedDate.getUTCHours());
            }
            console.log('Current participants:', formState.participants.map(p => ({ id: p.id, name: p.name, email: p.email })));

            const formData = new FormData();
            formData.append('title', formState.title);
            const appointedAt = formState.appointed_at;
            formData.append('appointed_at', appointedAt);
            // Filter out current user from participants - they are automatically the meeting owner
            const otherParticipants = formState.participants.filter(p => currentUser && p.id !== currentUser.id);
            formData.append('participants', JSON.stringify(otherParticipants.map(p => p.id)));

            // Debug log what we're sending
            console.log('FormData contents:');
            console.log('title:', formData.get('title'));
            console.log('appointed_at:', formData.get('appointed_at'));
            console.log('participants:', formData.get('participants'));

            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setCreateMeetingState({ status: "error", error: "User not authenticated. Please log in again." });
                return;
            }

            const response = await MeetingRepo.CreateMeetingWithParticipants(formData, token);

            // Debug log the API response
            console.log('API Response:', response);

            if (!response.success) {
                if (response.errors && Array.isArray(response.errors)) {
                    // Handle array of field errors from repository
                    const errorMessages = response.errors
                        .map((errorObj) => errorObj.error)
                        .join('\n');
                    setCreateMeetingState({ status: "error", error: errorMessages });
                } else if (typeof response.errors === 'string') {
                    setCreateMeetingState({ status: "error", error: response.errors });
                } else {
                    setCreateMeetingState({ status: "error", error: "Failed to create meeting. Please check your input and try again." });
                }
                return;
            }

            setCreateMeetingState({ status: "success", data: response.data });
        } catch (error) {
            console.error('Error creating meeting:', error);
            setCreateMeetingState({
                status: "error",
                error: error instanceof Error ? error.message : "Network error. Please check your connection and try again."
            });
        }
    }

    return (
        <SafeAreaContainer edges={['bottom']} style={styles.container}>

            {/* Form */}

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>
                    {/* Error Display */}
                    {createMeetingState.status === "error" && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{createMeetingState.error}</Text>
                            {createMeetingState.error.includes("unavailable") && (
                                <View style={styles.suggestionContainer}>
                                    <Text style={styles.suggestionText}>💡 Try selecting a different time, or ensure participant availability settings are configured correctly.</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Success Display */}
                    {createMeetingState.status === "success" && (
                        <View style={styles.successContainer}>
                            <Text style={styles.successText}>Meeting created successfully!</Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Title</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, backgroundColor: cardColor }, !formState.title && createMeetingState.status === "error" && styles.inputError]}
                            placeholder="Enter meeting title"
                            placeholderTextColor={theme.colorGrey}
                            value={formState.title}
                            onChangeText={(text) => dispatch({ name: 'title', value: text })}
                        />
                    </View>

                    {/* Participants Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Participants</Text>

                        <Text style={styles.sectionDescription}>
                            Add participants using the search below, e.g. by name, email or account.
                        </Text>

                        {/* Selected Participants */}
                        <View style={styles.selectedParticipantsSection}>
                            <View style={styles.participantList}>
                                {invitedParticipants.map((participant, index) => {
                                    const isLastItem = index === invitedParticipants.length - 1;
                                    return (
                                        <View
                                            key={participant.id}
                                            style={[
                                                styles.participantRow,
                                                !isLastItem && styles.participantRowDivider,
                                                !isLastItem && { borderBottomColor: borderColor }
                                            ]}
                                        >
                                            <View style={styles.participantRowContent}>
                                                <Text style={[
                                                    styles.participantName,
                                                    { color: textColor }
                                                ]}>
                                                    {participant.name}
                                                </Text>
                                                {participant.email && (
                                                    <Text style={styles.participantEmail}>
                                                        {participant.email}
                                                    </Text>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                style={styles.participantRemoveButton}
                                                onPress={() => dispatch({
                                                    type: 'REMOVE_PARTICIPANT',
                                                    participantId: participant.id,
                                                    currentUserId: currentUser?.id
                                                })}
                                            >
                                                <Feather name="x" size={18} color={theme.colorGrey} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                                {invitedParticipants.length === 0 && (
                                    <View style={styles.participantEmptyState}>
                                        <Text style={styles.participantEmptyText}>
                                            No participants added yet.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Search Users */}
                        <View style={styles.searchSection}>
                            <View style={[styles.searchContainer, { backgroundColor: cardColor }]}>
                                <Feather name="search" size={20} color={theme.colorGrey} style={styles.searchIcon} />

                                <TextInput
                                    style={[styles.searchInput, { color: textColor }]}
                                    value={searchState.query}
                                    onChangeText={(text) => {
                                        handleSearchUsers(text);
                                    }}
                                />
                                {searchState.query.length > 0 && searchState.status !== "loading" && (
                                    <TouchableOpacity
                                        style={styles.clearButton}
                                        onPress={() => {
                                            searchDispatch({ type: 'RESET_SEARCH' });
                                        }}
                                    >
                                        <Feather name="x" size={18} color={theme.colorGrey} />
                                    </TouchableOpacity>
                                )}
                                {searchState.status === "loading" && (
                                    <Feather name="loader" size={20} color={theme.colorNouraBlue} style={styles.loadingIcon} />
                                )}
                            </View>

                            {filteredSearchResults.length > 0 && (
                                <ScrollView style={[styles.searchResults, { backgroundColor: cardColor }]} nestedScrollEnabled={true}>
                                    {filteredSearchResults.map((user, index, filteredArray) => {
                                        const isLastItem = index === filteredArray.length - 1;
                                        const isSingleItem = filteredArray.length === 1;
                                        return (
                                            <TouchableOpacity
                                                key={user.id}
                                                style={[
                                                    styles.searchResultItem,
                                                    !isLastItem && !isSingleItem && styles.searchResultItemWithBorder
                                                ]}
                                                onPress={() => {
                                                    dispatch({ type: 'ADD_PARTICIPANT', participant: user });
                                                    searchDispatch({ type: 'RESET_SEARCH' });
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.profileCircle}>
                                                    <Text style={styles.profileInitials}>
                                                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                                                    </Text>
                                                </View>

                                                <View style={styles.userInfo}>
                                                    <Text style={[
                                                        styles.userName,
                                                        { color: textColor }
                                                    ]}>
                                                        {user.name}
                                                    </Text>
                                                    <Text style={styles.userEmail}>
                                                        {user.email}
                                                    </Text>
                                                </View>
                                                <Feather name="plus" size={20} color={theme.colorNouraBlue} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            {currentUser && (
                                <View style={styles.currentUserChipContainer}>
                                    <View style={styles.currentUserChip}>
                                        <Text style={styles.currentUserChipText}>
                                            {currentUser.name} (You)
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Participant Availability hidden by request.
                        {hasAdditionalParticipants && (
                            <View style={styles.availabilitySection}>
                                <Text style={[styles.availabilitySectionTitle, { color: textColor }]}>
                                    Participant Availability
                                </Text>
                                {invitedParticipants.map((participant) => {
                                    const availabilityState = participantAvailability[participant.id];
                                    return (
                                        <View
                                            key={`availability-${participant.id}`}
                                            style={[styles.availabilityCard, { backgroundColor: cardColor, borderColor }]}
                                        >
                                            <View style={styles.availabilityHeader}>
                                                <View style={styles.availabilityHeaderLeft}>
                                                    <Feather name="clock" size={16} color={theme.colorNouraBlue} />
                                                    <Text style={[styles.availabilityName, { color: textColor }]}>
                                                        {participant.name}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => fetchParticipantAvailability(participant.id)}
                                                    style={styles.availabilityRefreshButton}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Refresh availability for ${participant.name}`}
                                                >
                                                    <Feather name="refresh-cw" size={16} color={theme.colorGrey} />
                                                </TouchableOpacity>
                                            </View>
                                            {(() => {
                                                if (!availabilityState || availabilityState.status === "loading") {
                                                    return (
                                                        <View style={styles.availabilityStatusRow}>
                                                            <Feather name="loader" size={16} color={theme.colorNouraBlue} />
                                                            <Text style={styles.availabilityStatusText}>Loading availability...</Text>
                                                        </View>
                                                    );
                                                }

                                                if (availabilityState.status === "error") {
                                                    return (
                                                        <View style={styles.availabilityErrorContainer}>
                                                            <Text style={styles.availabilityErrorText}>{availabilityState.error}</Text>
                                                            <TouchableOpacity
                                                                style={styles.availabilityRetryButton}
                                                                onPress={() => fetchParticipantAvailability(participant.id)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Text style={styles.availabilityRetryButtonText}>Retry</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                }

                                                if (availabilityState.status === "success") {
                                                    if (availabilityState.data.length === 0) {
                                                        return (
                                                            <Text style={styles.availabilityEmptyText}>
                                                                No availability shared.
                                                            </Text>
                                                        );
                                                    }

                                                    const grouped = availabilityState.data.reduce<Record<number, ParticipantAvailabilityEntry[]>>((acc, entry) => {
                                                        if (!acc[entry.dayOfWeek]) {
                                                            acc[entry.dayOfWeek] = [];
                                                        }
                                                        acc[entry.dayOfWeek].push(entry);
                                                        return acc;
                                                    }, {});

                                                    const sortedDays = Object.keys(grouped)
                                                        .map(Number)
                                                        .sort((a, b) => a - b);

                                                    return (
                                                        <View style={styles.availabilityDaysContainer}>
                                                            {sortedDays.map((day) => {
                                                                const slots = grouped[day].slice().sort((a, b) => {
                                                                    if (a.startTime && b.startTime) {
                                                                        return a.startTime.localeCompare(b.startTime);
                                                                    }
                                                                    if (a.startTime) return -1;
                                                                    if (b.startTime) return 1;
                                                                    return 0;
                                                                });
                                                                return (
                                                                    <View key={`${participant.id}-${day}`} style={styles.availabilityDayRow}>
                                                                        <Text style={[styles.availabilityDayLabel, { color: textColor }]}>
                                                                            {formatDayLabel(day)}
                                                                        </Text>
                                                                        <View style={styles.availabilitySlots}>
                                                                            {slots.map((slot, index) => (
                                                                                <Text
                                                                                    key={`${participant.id}-${day}-${index}`}
                                                                                    style={[
                                                                                        styles.availabilitySlot,
                                                                                        slot.isAvailable ? styles.availabilitySlotAvailable : styles.availabilitySlotUnavailable
                                                                                    ]}
                                                                                >
                                                                                    {formatAvailabilityWindow(slot.startTime, slot.endTime)}
                                                                                </Text>
                                                                            ))}
                                                                        </View>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    );
                                                }

                                                return null;
                                            })()}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        */}
                    </View>

                    {/* Meeting Time Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Meeting Time</Text>
                        <Text style={styles.sectionDescription}>
                            Select when the meeting should start.
                        </Text>
                        <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: cardColor }]}
                            onPress={() => {
                                const currentDate = formState.appointed_at ? new Date(formState.appointed_at) : new Date();
                                setTempDateTime(clampToMeetingInterval(currentDate));
                                setShowTimePicker(true);
                            }}
                        >
                            <Text style={[styles.dateButtonText, { color: formState.appointed_at ? textColor : theme.colorGrey }]}>
                                {formState.appointed_at ? new Date(formState.appointed_at).toLocaleString([], {
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : "Select meeting time"}
                            </Text>
                            <TouchableOpacity style={styles.calendarButton}>
                                <Feather name="calendar" size={20} color={theme.colorGrey} />
                            </TouchableOpacity>
                        </TouchableOpacity>

                        <NouraTimePicker
                            value={tempDateTime || (formState.appointed_at ? new Date(formState.appointed_at) : new Date())}
                            visible={showTimePicker}
                            minuteInterval={15}
                            onChange={(event, selectedDate) => {
                                if (selectedDate) {
                                    setTempDateTime(clampToMeetingInterval(selectedDate));
                                }
                            }}
                            onConfirm={() => {
                                if (tempDateTime) {
                                    const rounded = clampToMeetingInterval(tempDateTime);
                                    // Remove milliseconds from ISO string to match Postman format
                                    const isoString = rounded.toISOString().replace(/\.\d{3}Z$/, 'Z');
                                    dispatch({ name: 'appointed_at', value: isoString });
                                    setTempDateTime(rounded);
                                }
                                setShowTimePicker(false);
                            }}
                            onCancel={() => {
                                setTempDateTime(null);
                                setShowTimePicker(false);
                            }}
                            minimumDate={new Date()}
                            title="Select Meeting Time"
                        />
                    </View>





                </View>
            </ScrollView>

            {/* Fixed Create Button */}
            <View style={styles.footerContainer}>
                <NouraButton
                    title={createMeetingState.status === "loading" ? "Creating..." : "Create Meeting"}
                    onPress={handleCreateMeeting}
                    disabled={
                        createMeetingState.status === "loading" ||
                        !formState.title ||
                        !formState.appointed_at ||
                        formState.participants.length === 0
                    }
                    style={styles.createButton}
                />
            </View>
        </SafeAreaContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // header: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     alignItems: 'center',
    //     paddingHorizontal: 20,
    //     paddingBottom: 10,
    //     borderBottomWidth: 1,
    //     borderBottomColor: theme.colorLightGrey,
    // },
    // placeholder: {
    //     width: 32, // Same width as close button for centering
    // },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    formContainer: {
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: theme.colorGrey,
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 48,
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
    },
    calendarButton: {
        padding: 4, // Add some padding for better touch target
        borderRadius: 4,
        marginLeft: 8, // Add some spacing from the text
    },
    dateButtonText: {
        fontSize: 16,
        lineHeight: 20,
        flex: 1,
    },
    selectedParticipantsSection: {
        marginBottom: 16,
    },
    searchSection: {
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        minHeight: 48,
    },
    searchIcon: {
        marginLeft: 16,
    },
    loadingIcon: {
        marginRight: 16,
    },
    clearButton: {
        padding: 8,
        marginRight: 8,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
    },
    searchResults: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        maxHeight: 200,
    },
    searchResultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 60,
    },
    searchResultItemWithBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    userInfo: {
        flex: 1,
        marginLeft: 0, // Remove any extra margin since profile circle handles spacing
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    profileCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colorNouraBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    profileInitials: {
        color: theme.colorWhite,
        fontSize: 14,
        fontWeight: '600',
    },
    participantList: {
        marginTop: 12,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        minHeight: 48,
    },
    participantRowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    participantRowContent: {
        flex: 1,
        marginRight: 12,
    },
    participantName: {
        fontSize: 16,
        fontWeight: '500',
    },
    participantEmail: {
        fontSize: 13,
        color: theme.colorGrey,
        marginTop: 2,
    },
    participantRemoveButton: {
        padding: 8,
    },
    participantEmptyState: {
        paddingVertical: 8,
    },
    participantEmptyText: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    currentUserChipContainer: {
        marginTop: 12,
        alignItems: 'flex-start',
    },
    currentUserChip: {
        backgroundColor: theme.colorLightGrey,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    currentUserChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colorGrey,
    },
    availabilitySection: {
        marginTop: 24,
        gap: 12,
    },
    availabilitySectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    availabilityCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    availabilityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    availabilityHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    availabilityName: {
        fontSize: 15,
        fontWeight: '600',
    },
    availabilityRefreshButton: {
        padding: 6,
        borderRadius: 6,
    },
    availabilityStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    availabilityStatusText: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    availabilityErrorContainer: {
        gap: 8,
    },
    availabilityErrorText: {
        fontSize: 14,
        color: theme.colorRed,
    },
    availabilityRetryButton: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colorNouraBlue,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    availabilityRetryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colorWhite,
    },
    availabilityEmptyText: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    availabilityDaysContainer: {
        gap: 12,
    },
    availabilityDayRow: {
        paddingVertical: 4,
    },
    availabilityDayLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    availabilitySlots: {
        gap: 4,
    },
    availabilitySlot: {
        fontSize: 14,
    },
    availabilitySlotAvailable: {
        color: '#16a34a',
    },
    availabilitySlotUnavailable: {
        color: theme.colorRed,
    },
    footerContainer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colorLightGrey,
    },
    createButton: {
        backgroundColor: theme.colorNouraBlue,
    },
    errorContainer: {
        marginVertical: 16,
        backgroundColor: '#ffebee',
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '500',
    },
    suggestionContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#fff3cd',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#ffc107',
    },
    suggestionText: {
        color: '#856404',
        fontSize: 13,
        fontStyle: 'italic',
    },
    successContainer: {
        marginVertical: 16,
        backgroundColor: '#e8f5e8',
        borderLeftWidth: 4,
        borderLeftColor: '#4caf50',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    successText: {
        color: '#2e7d32',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    inputError: {
        borderColor: '#f44336',
        borderWidth: 2,
    },
});
