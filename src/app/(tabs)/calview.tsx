import { StyleSheet, Text, View, TouchableOpacity, FlatList } from "react-native";
import { router } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";
import { theme } from "@/styles/theme";
import { MeetingRepo } from "@/repo";
import { Meetings } from "@/repo/meetings";
import Navbar from "@/lib/utils/navigation-bar";
import CalendarView from "@/lib/components/calendar-view";

// -------------------------------
// State Management
// -------------------------------

type MeetingsState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Meetings.Meeting[] };

export default function CalendarScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [meetingsState, setMeetingsState] = useState<MeetingsState>({ status: "idle" });

    const fetchMeetings = async () => {
        setMeetingsState({ status: "loading" });

        try {
            // Get access token
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                console.log('No access token found');
                setMeetingsState({ status: "error", error: "Authentication required. Please log in again." });
                return;
            }

            // Fetch meetings
            const meetingResponse = await MeetingRepo.GetMeetings("", token);
            console.log('Meetings response:', JSON.stringify(meetingResponse, null, 2));

            if (meetingResponse.success) {
                if (Array.isArray(meetingResponse.data)) {
                    const meetingsData = meetingResponse.data as Meetings.Meeting[];
                    setMeetingsState({ status: "success", data: meetingsData });
                } else if (meetingResponse.data && 'title' in meetingResponse.data) {
                    setMeetingsState({ status: "success", data: [meetingResponse.data as Meetings.Meeting] });
                } else {
                    setMeetingsState({ status: "success", data: [] });
                }
            } else {
                console.error('Failed to fetch meetings:', meetingResponse.errors);
                setMeetingsState({
                    status: "error",
                    error: typeof meetingResponse.errors === "string" ? meetingResponse.errors : "Failed to fetch meetings"
                });
            }
        } catch (error) {
            console.error('Error fetching meetings:', error);
            setMeetingsState({
                status: "error",
                error: error instanceof Error ? error.message : "Network error. Please check your connection and try again.",
            });
        }
    };

    useEffect(() => {
        fetchMeetings();
    }, []);

    const formatMeetingTime = (datetime: string) => {
        const date = new Date(datetime);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getMeetingTypeIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return 'check-circle';
            case 'new':
                return 'clock';
            case 'canceled':
                return 'x-circle';
            default:
                return 'calendar';
        }
    };

    // Get meetings for the selected date
    const getSelectedDateMeetings = () => {
        if (meetingsState.status !== "success") return [];

        const selectedDateString = selectedDate.toISOString().split('T')[0];
        return meetingsState.data.filter(meeting => {
            const meetingDate = new Date(meeting.start_time).toISOString().split('T')[0];
            return meetingDate === selectedDateString;
        });
    };

    // Create marked dates for calendar
    const getMarkedDates = () => {
        if (meetingsState.status !== "success") return {};

        const marked: { [key: string]: { selected?: boolean; available?: boolean } } = {};

        meetingsState.data.forEach(meeting => {
            const dateKey = new Date(meeting.start_time).toISOString().split('T')[0];
            marked[dateKey] = { available: true };
        });

        return marked;
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    const handleNewPress = () => {
        router.navigate('/create-meeting');
    };

    const renderMeetingCard = ({ item }: { item: Meetings.Meeting }) => (
        <TouchableOpacity
            style={[styles.meetingCard, { backgroundColor: cardColor, borderColor }]}
            onPress={() => router.push(`/meeting-details/${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.meetingHeader}>
                <View style={styles.meetingHeaderLeft}>
                    <Text style={[styles.meetingTitle, { color: textColor }]}>{item.title}</Text>
                    <Text style={styles.meetingTime}>
                        {formatMeetingTime(item.start_time)}
                    </Text>
                    <Text style={[styles.meetingLocation, { color: textSecondaryColor }]}>
                        {item.location}
                    </Text>
                </View>
                <View style={styles.meetingTypeContainer}>
                    <Feather
                        name={getMeetingTypeIcon(item.status)}
                        size={16}
                        color={theme.colorNouraBlue}
                    />
                </View>
            </View>

            <Text style={[styles.meetingDescription, { color: textColor }]} numberOfLines={2}>
                Type: {item.meeting_type.title} Participants: {item.participants.length}
            </Text>

            <View style={styles.meetingFooter}>
                <Text style={[styles.statusText, { color: textColor }]}>
                    Status: {item.status}
                </Text>
                <Text style={[styles.createdText, { color: textSecondaryColor }]}>
                    Type: {item.meeting_type.title}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const selectedDateMeetings = getSelectedDateMeetings();

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <Navbar backgroundColor={backgroundColor}>
                <View style={styles.navbarContent}>
                    <View style={styles.navbarLeft}>
                        <View style={styles.navbarTitleRow}>
                            <Text style={[styles.navbarTitle, { color: textColor }]}>Calendar</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.navbarButton, { backgroundColor: useThemeColor({}, 'tabIconDefault') }]}
                        onPress={handleNewPress}
                        accessibilityLabel="Create event"
                    >
                        <Feather name="plus" size={22} color={textColor} />
                    </TouchableOpacity>
                </View>
            </Navbar>

            {/* Calendar Component */}
            <CalendarView
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                markedDates={getMarkedDates()}
                containerStyle={styles.calendarContainer}
                defaultView="week"
                meetings={meetingsState.status === "success" ? meetingsState.data : []}
            />

            {/* Selected Date Header */}
            <View style={styles.selectedDateHeader}>
                <Text style={[styles.selectedDateText, { color: textColor }]}>
                    {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </Text>
                <Text style={[styles.meetingCount, { color: textSecondaryColor }]}>
                    {selectedDateMeetings.length} {selectedDateMeetings.length === 1 ? 'meeting' : 'meetings'}
                </Text>
            </View>

            {/* Meetings List for Selected Date */}
            <FlatList
                data={selectedDateMeetings}
                renderItem={renderMeetingCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
                        <View style={styles.emptyCardInner}>
                            <View style={styles.emptyIconWrapper}>
                                <Feather name="calendar" size={28} color={useThemeColor({}, 'textSecondary')} />
                            </View>
                            <Text style={[styles.emptyTitleBig, { color: textColor }]}>
                                {meetingsState.status === "loading" ? "Loading Meetings" :
                                    meetingsState.status === "error" ? "Error Loading" :
                                        "No Meetings"}
                            </Text>
                            <Text style={[styles.emptySubtitleCenter, { color: useThemeColor({}, 'textSecondary') }]}>
                                {meetingsState.status === "loading"
                                    ? "Please wait while we fetch your meetings."
                                    : meetingsState.status === "error"
                                        ? meetingsState.error
                                        : "No meetings scheduled for this date."}
                            </Text>

                            {meetingsState.status !== "loading" && (
                                <TouchableOpacity
                                    style={[styles.emptyCTAButton, { backgroundColor: cardColor, borderColor: borderColor }]}
                                    onPress={handleNewPress}
                                >
                                    <Text style={[styles.emptyCTAButtonText, { color: textColor }]}>Create Meeting</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                }
            />
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
    navbarLeft: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        margin: 0,
    },
    navbarTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginRight: 4,
    },
    navbarTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navbarButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        borderRadius: 18,
    },
    calendarContainer: {
        marginTop: 10,
        marginBottom: 0,
        marginHorizontal: 0,
        borderRadius: 0,
    },
    selectedDateHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    selectedDateText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    meetingCount: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContainer: {
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    meetingCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: theme.colorBlack,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    meetingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    meetingHeaderLeft: {
        flex: 1,
    },
    meetingTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    meetingTime: {
        fontSize: 14,
        color: theme.colorNouraBlue,
        fontWeight: '600',
    },
    meetingLocation: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    meetingTypeContainer: {
        backgroundColor: theme.colorLightGrey,
        borderRadius: 20,
        padding: 8,
    },
    meetingDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    meetingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    createdText: {
        fontSize: 14,
    },
    emptyCard: {
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
    },
    emptyCardInner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    emptyIconWrapper: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderColor: theme.colorLightGrey,
    },
    emptyTitleBig: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 8,
    },
    emptySubtitleCenter: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
        paddingHorizontal: 12,
    },
    emptyCTAButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 28,
        borderWidth: 1,
        shadowColor: theme.colorBlack,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    emptyCTAButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});