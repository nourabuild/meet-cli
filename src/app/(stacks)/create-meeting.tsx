import React, { useReducer, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';

import { theme } from '@/styles/theme';
import { NouraButton, NouraTimePicker } from '@/lib/components';
import { Users } from '@/repo/users';
import { UserRepo, MeetingRepo } from '@/repo';
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
    type: string;
    start_time: string;
    location: string;
    participants: Users.User[];
};

type SearchState =
    | { status: "idle"; query: string }
    | { status: "loading"; query: string }
    | { status: "error"; error: string; query: string }
    | { status: "success"; data: Users.User[]; query: string };

const initialFormState: FormFields = {
    title: "",
    type: "",
    start_time: "",
    location: "",
    participants: [],
};

const initialSearchState: SearchState = { status: "idle", query: "" };

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

    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    const [formState, dispatch] = useReducer(formReducer, {
        ...initialFormState,
        participants: currentUser ? [currentUser] : []
    });
    const [searchState, searchDispatch] = useReducer(searchReducer, initialSearchState);
    const [createMeetingState, setCreateMeetingState] = useState<CreateMeetingState>({ status: "idle" });

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDateTime, setTempDateTime] = useState<Date | null>(null);

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
            // Debug log the form state
            console.log('Form state before submission:', formState);
            console.log('Selected start time:', formState.start_time);
            console.log('Start time as Date:', new Date(formState.start_time));
            console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
            console.log('Local time string:', new Date(formState.start_time).toLocaleString());
            console.log('UTC time string:', new Date(formState.start_time).toISOString());
            console.log('Day of week:', new Date(formState.start_time).getDay()); // 0=Sunday, 1=Monday, etc.
            console.log('Local hour:', new Date(formState.start_time).getHours());
            console.log('UTC hour:', new Date(formState.start_time).getUTCHours());
            console.log('Current participants:', formState.participants.map(p => ({ id: p.id, name: p.name, email: p.email })));

            const formData = new FormData();
            formData.append('title', formState.title);
            formData.append('type', formState.type);
            formData.append('start_time', formState.start_time);
            formData.append('location', formState.location);
            formData.append('location_url', ''); // Add empty location_url as fallback
            // Filter out current user from participants - they are automatically the meeting owner
            const otherParticipants = formState.participants.filter(p => currentUser && p.id !== currentUser.id);
            formData.append('participants', JSON.stringify(otherParticipants.map(p => p.id)));

            // Debug log what we're sending
            console.log('FormData contents:');
            console.log('title:', formData.get('title'));
            console.log('type:', formData.get('type'));
            console.log('start_time:', formData.get('start_time'));
            console.log('location:', formData.get('location'));
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="x" size={24} color={textColor} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>New Meeting</Text>
                <View style={styles.placeholder} />
            </View>
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

                    {/* Participants Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionHeader, { color: textColor }]}>Participants</Text>

                        {/* Search Users */}
                        <View style={styles.searchSection}>
                            <Text style={[styles.title, { color: textColor }]}>Search</Text>
                            <Text style={styles.placeholderText}>e.g., by name, email, or account</Text>
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

                            {searchState.status === "success" && searchState.data.length > 0 && (
                                <ScrollView style={[styles.searchResults, { backgroundColor: cardColor }]} nestedScrollEnabled={true}>
                                    {searchState.data
                                        .filter(user => currentUser && user.id !== currentUser.id) // Exclude current user from search results
                                        .map((user, index, filteredArray) => {
                                            const isAlreadyAdded = formState.participants.find((p: Users.User) => p.id === user.id);
                                            const isLastItem = index === filteredArray.length - 1;
                                            const isSingleItem = filteredArray.length === 1;
                                            return (
                                                <TouchableOpacity
                                                    key={user.id}
                                                    style={[
                                                        styles.searchResultItem,
                                                        !isLastItem && !isSingleItem && styles.searchResultItemWithBorder,
                                                        isAlreadyAdded && styles.searchResultItemDisabled
                                                    ]}
                                                    onPress={() => {
                                                        if (!isAlreadyAdded) {
                                                            dispatch({ type: 'ADD_PARTICIPANT', participant: user });
                                                        }
                                                    }}
                                                    disabled={!!isAlreadyAdded}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[
                                                        styles.profileCircle,
                                                        isAlreadyAdded && styles.profileCircleDisabled
                                                    ]}>
                                                        <Text style={[
                                                            styles.profileInitials,
                                                            isAlreadyAdded && styles.profileInitialsDisabled
                                                        ]}>
                                                            {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                                                        </Text>
                                                    </View>

                                                    <View style={styles.userInfo}>
                                                        <Text style={[
                                                            styles.userName,
                                                            { color: isAlreadyAdded ? theme.colorGrey : textColor },
                                                            isAlreadyAdded && styles.userNameDisabled
                                                        ]}>
                                                            {user.name}
                                                        </Text>
                                                        <Text style={[
                                                            styles.userEmail,
                                                            isAlreadyAdded && styles.userEmailDisabled
                                                        ]}>
                                                            {user.email}
                                                        </Text>
                                                    </View>
                                                    {isAlreadyAdded ? (
                                                        <Feather name="check" size={20} color={theme.colorGrey} />
                                                    ) : (
                                                        <Feather name="plus" size={20} color={theme.colorNouraBlue} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                </ScrollView>
                            )}

                            {/* Participants List */}
                            <View style={styles.chipContainer}>
                                {formState.participants.map((participant) => {
                                    const isCurrentUser = currentUser && participant.id === currentUser.id;
                                    return (
                                        <View
                                            key={participant.id}
                                            style={[styles.participantChip, isCurrentUser && styles.disabledChip]}
                                        >
                                            <Text style={[styles.chipText, isCurrentUser && styles.disabledChipText]}>
                                                {participant.name} {isCurrentUser && "(You)"}
                                            </Text>
                                            {!isCurrentUser && (
                                                <TouchableOpacity
                                                    style={styles.removeChipButton}
                                                    onPress={() => dispatch({
                                                        type: 'REMOVE_PARTICIPANT',
                                                        participantId: participant.id,
                                                        currentUserId: currentUser?.id
                                                    })}
                                                >
                                                    <Feather name="x" size={16} color={theme.colorWhite} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>



                    {/* Meeting Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionHeader, { color: textColor }]}>Meeting Details</Text>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Title</Text>
                            <TextInput
                                style={[styles.input, { color: textColor, backgroundColor: cardColor }, !formState.title && createMeetingState.status === "error" && styles.inputError]}
                                placeholder="Enter meeting title"
                                placeholderTextColor={theme.colorGrey}
                                value={formState.title}
                                onChangeText={(text) => dispatch({ name: 'title', value: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Meeting Type</Text>
                            <TextInput
                                style={[styles.input, { color: textColor, backgroundColor: cardColor }]}
                                placeholder="e.g., Standup, Planning, Retrospective"
                                placeholderTextColor={theme.colorGrey}
                                value={formState.type}
                                onChangeText={(text) => dispatch({ name: 'type', value: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Start Time</Text>
                            <TouchableOpacity
                                style={[styles.dateButton, { backgroundColor: cardColor }]}
                                onPress={() => {
                                    const currentDate = formState.start_time ? new Date(formState.start_time) : new Date();
                                    setTempDateTime(currentDate);
                                    setShowTimePicker(true);
                                }}
                            >
                                <Text style={[styles.dateButtonText, { color: formState.start_time ? textColor : theme.colorGrey }]}>
                                    {formState.start_time ? new Date(formState.start_time).toLocaleString([], {
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : "Select meeting start time"}
                                </Text>
                                <TouchableOpacity style={styles.calendarButton}>
                                    <Feather name="calendar" size={20} color={theme.colorGrey} />
                                </TouchableOpacity>
                            </TouchableOpacity>

                            <NouraTimePicker
                                value={tempDateTime || (formState.start_time ? new Date(formState.start_time) : new Date())}
                                visible={showTimePicker}
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) {
                                        setTempDateTime(selectedDate);
                                    }
                                }}
                                onConfirm={() => {
                                    if (tempDateTime) {
                                        // Remove milliseconds from ISO string to match Postman format
                                        const isoString = tempDateTime.toISOString().replace(/\.\d{3}Z$/, 'Z');
                                        dispatch({ name: 'start_time', value: isoString });
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

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Location</Text>
                            <TextInput
                                style={[styles.input, { color: textColor, backgroundColor: cardColor }]}
                                placeholder="e.g., Zoom, Office, Google Meet"
                                placeholderTextColor={theme.colorGrey}
                                value={formState.location}
                                onChangeText={(text) => dispatch({ name: 'location', value: text })}
                            />
                        </View>
                    </View>

                </View >
            </ScrollView >

            {/* Fixed Create Button */}
            <View style={styles.footerContainer}>
                <NouraButton
                    title={createMeetingState.status === "loading" ? "Creating..." : "Create Meeting"}
                    onPress={handleCreateMeeting}
                    disabled={createMeetingState.status === "loading" || !formState.title || formState.participants.length === 0}
                    style={styles.createButton}
                />
            </View>
        </SafeAreaContainer >
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    placeholder: {
        width: 32, // Same width as close button for centering
    },
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
        marginBottom: 0,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    placeholderText: {
        fontSize: 14,
        color: theme.colorGrey,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
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
    },
    calendarButton: {
        padding: 4, // Add some padding for better touch target
        borderRadius: 4,
        marginLeft: 8, // Add some spacing from the text
    },
    dateButtonText: {
        fontSize: 16,
        flex: 1,
    },
    searchSection: {
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
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
    searchResultItemDisabled: {
        opacity: 0.6,
        backgroundColor: theme.colorLightGrey,
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
    userNameDisabled: {
        color: theme.colorGrey,
    },
    userEmail: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    userEmailDisabled: {
        color: theme.colorLightGrey,
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
    profileCircleDisabled: {
        backgroundColor: theme.colorLightGrey,
    },
    profileInitials: {
        color: theme.colorWhite,
        fontSize: 14,
        fontWeight: '600',
    },
    profileInitialsDisabled: {
        color: theme.colorGrey,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 8,
    },
    participantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colorNouraBlue,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    disabledChip: {
        backgroundColor: theme.colorLightGrey,
        opacity: 0.7,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colorWhite,
    },
    disabledChipText: {
        color: theme.colorGrey,
    },
    removeChipButton: {
        padding: 2,
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
