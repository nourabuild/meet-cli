import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, Alert, FlatList } from "react-native";
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';

import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";
import { theme } from '@/styles/theme';
import { MeetingRepo } from '@/repo';
import { Meetings } from '@/repo/meetings';
import { formatMeetingTime } from '@/lib/utils/format';

// -------------------------------
// State Management
// -------------------------------

type RequestStatus = 'new' | 'accepted' | 'declined' | 'pending' | 'rejected';

// Extended participant type that includes meeting data
type ParticipantWithMeeting = Meetings.Participant & {
    meeting: Meetings.Meeting;
};


type RequestsState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: ParticipantWithMeeting[] };

type ActionState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success" };

export default function RequestsScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');


    const [activeTab, setActiveTab] = useState<RequestStatus>('new');
    const [requestsState, setRequestsState] = useState<RequestsState>({ status: "idle" });
    const [actionState, setActionState] = useState<ActionState>({ status: "idle" });

    // Fetch all requests only once when component mounts
    useEffect(() => {
        const fetchAllRequests = async () => {
            setRequestsState({ status: "loading" });

            try {
                // Get access token
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) {
                    setRequestsState({ status: "error", error: "Authentication required. Please log in again." });
                    return;
                }

                // Fetch ALL meeting requests (not filtered by status)
                const requestsResponse = await MeetingRepo.GetMeetingsRequests("", token); // Empty string to get all
                if (requestsResponse.success) {
                    if (Array.isArray(requestsResponse.data)) {
                        // Transform meetings into participants with meeting data
                        const meetingsData = requestsResponse.data as Meetings.Meeting[];
                        const participantsWithMeetings: ParticipantWithMeeting[] = [];

                        meetingsData.forEach(meeting => {
                            if (meeting.participants) {
                                meeting.participants.forEach(participant => {
                                    participantsWithMeetings.push({
                                        ...participant,
                                        meeting: meeting
                                    });
                                });
                            }
                        });

                        setRequestsState({ status: "success", data: participantsWithMeetings });
                    } else if (requestsResponse.data && 'title' in requestsResponse.data) {
                        // Single meeting case
                        const meeting = requestsResponse.data as Meetings.Meeting;
                        const participantsWithMeetings: ParticipantWithMeeting[] = [];

                        if (meeting.participants) {
                            meeting.participants.forEach(participant => {
                                participantsWithMeetings.push({
                                    ...participant,
                                    meeting: meeting
                                });
                            });
                        }

                        setRequestsState({ status: "success", data: participantsWithMeetings });
                    } else {
                        setRequestsState({ status: "success", data: [] });
                    }
                } else {
                    console.error('Failed to fetch requests:', requestsResponse.errors);
                    setRequestsState({
                        status: "error",
                        error: typeof requestsResponse.errors === "string" ? requestsResponse.errors : "Failed to fetch requests"
                    });
                }
            } catch (error) {
                console.error('Error fetching requests:', error);
                setRequestsState({
                    status: "error",
                    error: error instanceof Error ? error.message : "Network error. Please check your connection and try again.",
                });
            }
        };

        fetchAllRequests();
    }, []); // Only run once on mount

    // Get requests data from state
    const requests = requestsState.status === "success" ? requestsState.data : [];
    const filteredRequests = requests.filter((participantWithMeeting: ParticipantWithMeeting) => participantWithMeeting.status === activeTab);
    const isLoading = requestsState.status === "loading";

    // Calculate tab counts - show actual counts or 0 when no data
    const getTabCount = (status: RequestStatus) => {
        if (requestsState.status !== "success") {
            return 0;
        }
        return requests.filter((r: ParticipantWithMeeting) => r.status === status).length;
    };

    const handleApprove = async (requestId: string) => {
        setActionState({ status: "loading" });

        try {
            // Get access token
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "No access token found. Please log in again.");
                setActionState({ status: "error", error: "Authentication required" });
                return;
            }

            // Call approve API using await with your Python API
            const response = await MeetingRepo.ApproveMeetingByParticipant(requestId, token);

            if (response.success) {
                Alert.alert(
                    "Request Approved",
                    "Meeting request has been approved successfully!",
                    [{ text: "OK" }]
                );

                setActionState({ status: "success" });

                // Refresh ALL requests list (not filtered by tab)
                const requestsResponse = await MeetingRepo.GetMeetingsRequests("", token);
                if (requestsResponse.success && Array.isArray(requestsResponse.data)) {
                    // Transform meetings into participants with meeting data
                    const meetingsData = requestsResponse.data as Meetings.Meeting[];
                    const participantsWithMeetings: ParticipantWithMeeting[] = [];

                    meetingsData.forEach(meeting => {
                        if (meeting.participants) {
                            meeting.participants.forEach(participant => {
                                participantsWithMeetings.push({
                                    ...participant,
                                    meeting: meeting
                                });
                            });
                        }
                    });

                    setRequestsState({ status: "success", data: participantsWithMeetings });
                }
            } else {
                Alert.alert("Error", "Failed to approve request. Please try again.");
                setActionState({ status: "error", error: "Failed to approve request" });
            }
        } catch (error) {
            console.error('Error approving request:', error);
            Alert.alert("Error", "Failed to approve request. Please try again.");
            setActionState({
                status: "error",
                error: error instanceof Error ? error.message : "Network error"
            });
        }
    };

    const handleReject = async (requestId: string) => {
        Alert.alert(
            "Reject Request",
            "Are you sure you want to reject this meeting request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
                        setActionState({ status: "loading" });

                        try {
                            // Get access token
                            const token = await SecureStore.getItemAsync('access_token');
                            if (!token) {
                                Alert.alert("Error", "No access token found. Please log in again.");
                                setActionState({ status: "error", error: "Authentication required" });
                                return;
                            }

                            // Call reject API using await with your Python API
                            const response = await MeetingRepo.RejectMeetingByParticipant(requestId, token);

                            if (response.success) {
                                Alert.alert(
                                    "Request Rejected",
                                    "Meeting request has been rejected.",
                                    [{ text: "OK" }]
                                );

                                setActionState({ status: "success" });

                                // Refresh ALL requests list (not filtered by tab)
                                const requestsResponse = await MeetingRepo.GetMeetingsRequests("", token);
                                if (requestsResponse.success && Array.isArray(requestsResponse.data)) {
                                    // Transform meetings into participants with meeting data
                                    const meetingsData = requestsResponse.data as Meetings.Meeting[];
                                    const participantsWithMeetings: ParticipantWithMeeting[] = [];

                                    meetingsData.forEach(meeting => {
                                        if (meeting.participants) {
                                            meeting.participants.forEach(participant => {
                                                participantsWithMeetings.push({
                                                    ...participant,
                                                    meeting: meeting
                                                });
                                            });
                                        }
                                    });

                                    setRequestsState({ status: "success", data: participantsWithMeetings });
                                }
                            } else {
                                Alert.alert("Error", "Failed to reject request. Please try again.");
                                setActionState({ status: "error", error: "Failed to reject request" });
                            }
                        } catch (error) {
                            console.error('Error rejecting request:', error);
                            Alert.alert("Error", "Failed to reject request. Please try again.");
                            setActionState({
                                status: "error",
                                error: error instanceof Error ? error.message : "Network error"
                            });
                        }
                    }
                }
            ]
        );
    };

    const renderRequestCard = ({ item }: { item: ParticipantWithMeeting }) => (
        <TouchableOpacity
            style={[styles.requestCard, { backgroundColor: cardColor, borderColor }]}

            onPress={() => router.push(`/show-meeting/${item.meeting_id}`)}
            activeOpacity={0.7}
        >
            {/* Header */}
            <View style={styles.requestHeader}>
                <View style={styles.requestHeaderLeft}>
                    <View style={styles.requesterInfo}>
                        <Text style={[styles.requesterName, { color: textColor }]}>{item.meeting.title}</Text>
                        <Text style={[styles.requestTime, { color: textSecondaryColor }]}>
                            Created {formatMeetingTime(item.created_at)}
                        </Text>
                    </View>
                </View>

                <View style={[
                    styles.statusBadge,
                    item.status === 'new' ? styles.newBadge :
                        item.status === 'pending' ? styles.pendingBadge :
                            item.status === 'accepted' ? styles.acceptedBadge :
                                styles.rejectedBadge
                ]}>
                    <Text style={[
                        styles.statusText,
                        item.status === 'new' ? styles.newText :
                            item.status === 'pending' ? styles.pendingText :
                                item.status === 'accepted' ? styles.acceptedText :
                                    styles.rejectedText
                    ]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                </View>
            </View>

            {/* Meeting Details */}
            <View style={styles.meetingDetails}>
                <Text style={[styles.meetingDescription, { color: textSecondaryColor }]}>
                    Scheduled: {formatMeetingTime(item.meeting.appointed_at)}
                </Text>

                <View style={styles.meetingMeta}>
                    <View style={styles.metaItem}>
                        <Feather name="user" size={16} color={theme.colorGrey} />
                        <Text style={[styles.metaText, { color: textSecondaryColor }]}>
                            Owner: {
                                // Find the owner among participants
                                item.meeting.participants?.find(p => p.user_id === item.meeting.created_by)?.user.name ||
                                'Unknown'
                            }
                        </Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            {item.status === 'new' && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(item.meeting_id)}
                        disabled={actionState.status === "loading"}
                    >
                        <Feather name="x" size={18} color={theme.colorGrey} />
                        <Text style={[styles.rejectButtonText, { color: textColor }]}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item.meeting_id)}
                        disabled={actionState.status === "loading"}
                    >
                        <Feather name="check" size={18} color={theme.colorWhite} />
                        <Text style={styles.approveButtonText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Header */}


            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { backgroundColor: cardColor, borderBottomColor: useThemeColor({}, 'border') }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'new' && styles.activeTab]}
                    onPress={() => setActiveTab('new')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, { color: useThemeColor({}, 'textSecondary') }, activeTab === 'new' && { color: textColor }]}>
                        {getTabCount('new')} New
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'declined' && styles.activeTab]}
                    onPress={() => setActiveTab('declined')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, { color: useThemeColor({}, 'textSecondary') }, activeTab === 'declined' && { color: textColor }]}>
                        {getTabCount('declined')} Declined
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Requests List */}
            <FlatList
                data={filteredRequests}
                renderItem={renderRequestCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather
                            name={activeTab === 'pending' ? 'inbox' : 'x-circle'}
                            size={48}
                            color={useThemeColor({}, 'textSecondary')}
                        />
                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                            {isLoading ? "Loading requests..." : `No ${activeTab} requests`}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: useThemeColor({}, 'textSecondary') }]}>
                            {isLoading
                                ? 'Please wait while we fetch your requests'
                                : activeTab === 'pending'
                                    ? 'All meeting requests have been processed'
                                    : 'No rejected requests to show'
                            }
                        </Text>
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

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.colorNouraBlue,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        padding: 20,
        paddingTop: 16,
    },
    requestCard: {
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
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    requestHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    requesterInfo: {
        flex: 1,
    },
    requesterName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    requestTime: {
        fontSize: 14,
    },
    statusBadge: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    newBadge: {
        backgroundColor: '#e3f2fd',
    },
    pendingBadge: {
        backgroundColor: '#fff3cd',
    },
    acceptedBadge: {
        backgroundColor: '#d4edda',
    },
    rejectedBadge: {
        backgroundColor: '#f8d7da',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    newText: {
        color: '#1976d2',
    },
    pendingText: {
        color: '#856404',
    },
    acceptedText: {
        color: '#155724',
    },
    rejectedText: {
        color: '#721c24',
    },
    meetingDetails: {
        marginBottom: 16,
    },
    meetingDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    meetingMeta: {
        flexDirection: 'row',
        gap: 20,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    rejectButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colorLightGrey,
    },
    approveButton: {
        backgroundColor: theme.colorNouraBlue,
    },
    rejectButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    approveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorWhite,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
});
