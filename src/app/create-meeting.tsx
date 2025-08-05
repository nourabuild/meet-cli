import React, { useReducer, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';

import { theme } from '@/styles/theme';
import { NouraButton, NouraTimePicker } from '@/lib/components';
import { Users } from '@/repo/users';
import { UserRepo, MeetingRepo } from '@/repo';
import { useReduxSelector } from '@/lib/hooks';

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
    meetingType: string;
    assignedTo: string;
    location: string;
    participants: Users.User[];
};

const initialFormState: FormFields = {
    title: "",
    meetingType: "",
    assignedTo: "",
    location: "",
    participants: [],
};

function formReducer(state: FormFields, action: { name: keyof FormFields; value: string } | { type: 'SET_PARTICIPANTS'; participants: Users.User[] } | { type: 'ADD_PARTICIPANT'; participant: Users.User } | { type: 'REMOVE_PARTICIPANT'; participantId: string }) {
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

// -------------------------------
// Component
// -------------------------------

export default function NewMeeting() {
    const currentUser = useReduxSelector((state) => state.user);

    // Log user's locale information for debugging
    React.useEffect(() => {
        const browserLocale = navigator.language || 'en-US';
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;

        console.log('=== User Locale Information ===');
        console.log('Detected locale:', locale);
        console.log('Browser locale:', browserLocale);
        console.log('Timezone:', timeZone);
        console.log('Sample date format:', new Date().toLocaleDateString(locale));
        console.log('Sample time format:', new Date().toLocaleTimeString(locale));
    }, []);

    const [formState, dispatch] = useReducer(formReducer, {
        ...initialFormState,
        participants: currentUser ? [currentUser] : []
    });
    const [createMeetingState, setCreateMeetingState] = useState<CreateMeetingState>({ status: "idle" });

    // Initialize date with proper timezone consideration
    const [date, setDate] = useState(() => {
        const now = new Date();
        // Round to next 30-minute interval for better UX
        const minutes = now.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 30) * 30;
        now.setMinutes(roundedMinutes, 0, 0); // Set seconds and milliseconds to 0
        return now;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDate, setTempDate] = useState(() => {
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 30) * 30;
        now.setMinutes(roundedMinutes, 0, 0);
        return now;
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Users.User[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleChange = (name: keyof FormFields, value: string) => {
        dispatch({ name, value });
    };

    const handleClose = () => {
        router.back();
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (selectedDate) {
            setTempDate(selectedDate);
        }
    };

    const handleDatePickerDone = () => {
        setDate(tempDate);
        setShowDatePicker(false);
    };

    const handleDatePickerCancel = () => {
        setTempDate(date); // Reset to original date
        setShowDatePicker(false);
    };

    const openDatePicker = () => {
        setTempDate(date); // Initialize temp date with current date
        setShowDatePicker(true);
    };

    const formatDate = (date: Date) => {
        // Get the user's locale automatically from the browser/device
        const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';

        // Format date and time according to user's locale preferences
        const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        };

        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            // Automatically use 12h or 24h format based on locale
        };

        // Format date and time separately for better control
        const formattedDate = date.toLocaleDateString(locale, dateOptions);
        const formattedTime = date.toLocaleTimeString(locale, timeOptions);

        return `${formattedDate}, ${formattedTime}`;
    };

    // Helper function to get timezone information
    const getTimezoneInfo = () => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';

        return {
            locale,
            timeZone,
            region: locale.split('-')[1] || 'US',
        };
    };

    // Helper function to format date for backend (always ISO)
    const formatDateForBackend = (date: Date) => {
        // Always send ISO string to backend for consistent handling
        return date.toISOString();
    };

    const handleCreateMeeting = async () => {
        setCreateMeetingState({ status: "loading" });

        const { title, meetingType, assignedTo, location } = formState;

        if (!title.trim()) {
            setCreateMeetingState({ status: "error", error: "Meeting title is required" });
            return;
        }

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setCreateMeetingState({ status: "error", error: "Authentication required. Please log in again." });
                return;
            }

            console.log("=== Create Meeting Form Data ===");
            console.log("Form state:", formState);
            console.log("Date selected:", formatDate(date));
            console.log("Date for backend (ISO):", formatDateForBackend(date));
            console.log("Timezone info:", getTimezoneInfo());
            console.log("Current user:", currentUser);
            console.log("All participants:", formState.participants);

            // Create FormData for the meeting
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('type', meetingType.trim() || 'Meeting');
            formData.append('start_time', formatDateForBackend(date));
            formData.append('location', location.trim() || 'TBD');
            formData.append('location_url', '');

            if (assignedTo.trim()) {
                formData.append('assigned_to', assignedTo.trim());
                console.log("Added assigned_to:", assignedTo.trim());
            }

            // Add participant user IDs (excluding current user as they're automatically added by backend)
            const participantIds = formState.participants
                .filter((p: Users.User) => p.id !== currentUser?.id)
                .map((p: Users.User) => p.id);

            console.log("Participant IDs to send:", participantIds);

            participantIds.forEach((participantId: string, index: number) => {
                formData.append(`participants[${index}]`, participantId);
                console.log(`Added participants[${index}]:`, participantId);
            });

            console.log("About to call MeetingRepo.CreateMeetingWithParticipants");

            const result = await MeetingRepo.CreateMeetingWithParticipants(formData, token);

            if (!result.success) {
                setCreateMeetingState({
                    status: "error",
                    error: typeof result.errors === "string" ? result.errors : "Failed to create meeting",
                });
                return;
            }

            setCreateMeetingState({ status: "success", data: result.data });

            // Navigate back after successful creation with a shorter delay
            setTimeout(() => {
                router.back();
            }, 1000);
        } catch (error) {
            console.error("Create meeting error:", error);
            setCreateMeetingState({
                status: "error",
                error:
                    error instanceof Error
                        ? error.message
                        : "Network error. Please check your connection and try again.",
            });
        }
    };

    const handleSearchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.error('No auth token available');
                return;
            }

            setIsSearching(true);

            const controller = new AbortController();
            const searchResponse = await UserRepo.SearchUsers(query, token, controller.signal);

            if (searchResponse.success && searchResponse.data) {
                // Extract the users array from the response
                const users = searchResponse.data.data || [];
                setSearchResults(users);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddParticipant = (user: Users.User) => {
        dispatch({ type: 'ADD_PARTICIPANT', participant: user });
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with close button */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Feather name="x" size={24} color={theme.colorBlack} />
                </TouchableOpacity>
                <Text style={styles.title}>New Meeting</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Form Content */}
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>
                    {/* Meeting Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Details</Text>

                        {/* Meeting Title */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                value={formState.title}
                                onChangeText={(text) => handleChange("title", text)}
                            />
                        </View>

                        {/* Meeting Type */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Meeting Type</Text>
                            <Text style={styles.placeholderText}>e.g., All Hands, One on One, Team Meeting, Standup, or Project Meeting</Text>
                            <TextInput
                                style={styles.input}
                                value={formState.meetingType}
                                onChangeText={(text) => handleChange("meetingType", text)}
                            />
                        </View>

                        {/* Date & Time */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Date & Time</Text>

                            <View style={styles.dateButton}>
                                <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
                                <TouchableOpacity
                                    style={styles.calendarButton}
                                    onPress={openDatePicker}
                                >
                                    <Feather name="calendar" size={20} color={theme.colorNouraBlue} />
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && (
                                <NouraTimePicker
                                    value={tempDate}
                                    visible={showDatePicker}
                                    onChange={onDateChange}
                                    onConfirm={handleDatePickerDone}
                                    onCancel={handleDatePickerCancel}
                                    minimumDate={new Date()}
                                />
                            )}
                        </View>

                        {/* Location */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Location</Text>
                            <TextInput
                                style={styles.input}
                                value={formState.location}
                                onChangeText={(text) => handleChange("location", text)}
                            />
                        </View>

                        {/* Assigned To */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Assigned To (User ID)</Text>
                            <TextInput
                                style={styles.input}
                                value={formState.assignedTo}
                                onChangeText={(text) => handleChange("assignedTo", text)}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Participants Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Participants</Text>

                        {/* Search Users */}
                        <View style={styles.searchSection}>
                            <Text style={styles.sectionTitle}>Search</Text>
                            <Text style={styles.placeholderText}>e.g., by name, email, or account</Text>
                            <View style={styles.searchContainer}>
                                <Feather name="search" size={20} color={theme.colorGrey} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={searchQuery}
                                    onChangeText={(text) => {
                                        setSearchQuery(text);
                                        handleSearchUsers(text);
                                    }}
                                />
                                {searchQuery.length > 0 && !isSearching && (
                                    <TouchableOpacity
                                        style={styles.clearButton}
                                        onPress={() => {
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                    >
                                        <Feather name="x" size={18} color={theme.colorGrey} />
                                    </TouchableOpacity>
                                )}
                                {isSearching && (
                                    <Feather name="loader" size={20} color={theme.colorNouraBlue} style={styles.loadingIcon} />
                                )}
                            </View>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <ScrollView style={styles.searchResults} nestedScrollEnabled={true}>
                                    {searchResults.map((user, index) => {
                                        const isAlreadyAdded = formState.participants.find((p: Users.User) => p.id === user.id);
                                        const isLastItem = index === searchResults.length - 1;
                                        const isSingleItem = searchResults.length === 1;
                                        return (
                                            <TouchableOpacity
                                                key={user.id}
                                                style={[
                                                    styles.searchResultItem,
                                                    !isLastItem && !isSingleItem && styles.searchResultItemWithBorder,
                                                    isAlreadyAdded && styles.searchResultItemDisabled
                                                ]}
                                                onPress={() => handleAddParticipant(user)}
                                                disabled={!!isAlreadyAdded}
                                                activeOpacity={0.7}
                                            >
                                                {/* Profile Picture Circle */}
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
                        </View>

                        {/* Participants List */}
                        <View>
                            {/* <Text style={styles.sectionTitle}>Added Participants</Text> */}
                            <View style={styles.chipContainer}>
                                {formState.participants.map((participant: Users.User, index: number) => {
                                    const isCurrentUser = participant.id === currentUser?.id;
                                    return (
                                        <View
                                            key={participant.id}
                                            style={[
                                                styles.participantChip,
                                                isCurrentUser && styles.disabledChip
                                            ]}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                isCurrentUser && styles.disabledChipText
                                            ]}>
                                                {participant.name}
                                                {isCurrentUser && " (You)"}
                                            </Text>
                                            {!isCurrentUser && (
                                                <TouchableOpacity
                                                    style={styles.removeChipButton}
                                                    onPress={() => {
                                                        dispatch({ type: 'REMOVE_PARTICIPANT', participantId: participant.id });
                                                    }}
                                                >
                                                    <Feather name="x" size={16} color={theme.colorBlack} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {createMeetingState.status === "error" && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{createMeetingState.error}</Text>
                        </View>
                    )}

                    {createMeetingState.status === "success" && (
                        <View style={styles.successContainer}>
                            <Text style={styles.successText}>
                                🎉 Meeting created successfully!
                            </Text>
                            <Text style={styles.redirectText}>
                                Redirecting back...
                            </Text>
                        </View>
                    )}

                    <NouraButton
                        title={createMeetingState.status === "loading" ? "Creating..." : "Create Meeting"}
                        onPress={handleCreateMeeting}
                        loading={createMeetingState.status === "loading"}
                        disabled={createMeetingState.status === "loading" || createMeetingState.status === "success" || !formState.title.trim()}
                        style={styles.createButton}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
    },
    placeholder: {
        width: 32, // Same width as close button for centering
    },
    scrollContainer: {
        flex: 1,
    },
    formContainer: {
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
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
        backgroundColor: theme.colorWhite,
        color: theme.colorBlack,
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
        backgroundColor: theme.colorWhite,
    },
    calendarButton: {
        padding: 4, // Add some padding for better touch target
        borderRadius: 4,
        marginLeft: 8, // Add some spacing from the text
    },
    dateButtonText: {
        fontSize: 16,
        color: theme.colorBlack,
        flex: 1, // Take up remaining space
    },
    searchSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        backgroundColor: theme.colorWhite,
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
        color: theme.colorBlack,
    },
    searchResults: {
        marginTop: 8,
        backgroundColor: theme.colorWhite,
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
        color: theme.colorBlack,
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
    createButton: {
        backgroundColor: theme.colorNouraBlue,
        marginBottom: 40,

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
    redirectText: {
        color: '#2e7d32',
        fontSize: 14,
        fontStyle: 'italic',
    },
});
