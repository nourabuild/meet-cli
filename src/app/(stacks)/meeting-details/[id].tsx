import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';

import { theme } from '@/styles/theme';
import { Meetings } from '@/repo/meetings';
import { MeetingRepo, UserRepo } from '@/repo';
import { useReduxSelector } from '@/lib/hooks';
import SafeAreaContainer from '@/lib/utils/safe-area-container';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';

// -------------------------------
// State Management
// -------------------------------

type MeetingDetailState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Meetings.Meeting };

export default function MeetingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [meetingState, setMeetingState] = useState<MeetingDetailState>({ status: "idle" });
    const currentUser = useReduxSelector((state) => state.user);

    const textColor = useThemeColor({}, 'text');
    const backgroundColor = useThemeColor({}, 'background');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    useEffect(() => {
        const fetchMeeting = async () => {
            if (!id) {
                setMeetingState({ status: "error", error: "No meeting ID provided" });
                return;
            }

            setMeetingState({ status: "loading" });

            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) {
                    setMeetingState({ status: "error", error: "Authentication required. Please log in again." });
                    return;
                }

                const response = await MeetingRepo.GetMeetingById(id, token);
                if (response.success) {
                    if (!Array.isArray(response.data)) {
                        let meetingData = response.data as Meetings.Meeting;
                        // If participants are empty or missing, fetch them separately
                        if (!meetingData.participants || meetingData.participants.length === 0) {
                            const participantsResponse = await MeetingRepo.GetParticipantsByMeetingId(id, token);
                            if (participantsResponse.success) {
                                const participantsData = Array.isArray(participantsResponse.data)
                                    ? participantsResponse.data
                                    : [participantsResponse.data];

                                meetingData = {
                                    ...meetingData,
                                    participants: participantsData as Meetings.Participant[]
                                };
                            } else {
                                console.error('Failed to fetch participants:', participantsResponse.errors);
                            }
                        }

                        if (meetingData.participants && meetingData.participants.length > 0) {
                        }

                        setMeetingState({ status: "success", data: meetingData });
                    } else {
                        console.error('Unexpected array response from GetMeetingById');
                        setMeetingState({ status: "error", error: "Invalid response format from server" });
                    }
                } else {
                    console.error('Failed to fetch meeting:', response);
                    setMeetingState({
                        status: "error",
                        error: typeof response.errors === "string" ? response.errors : "Failed to fetch meeting details"
                    });
                }
            } catch (error) {
                console.error('Error fetching meeting:', error);
                setMeetingState({
                    status: "error",
                    error: error instanceof Error ? error.message : "Network error. Please check your connection and try again.",
                });
            }
        };

        fetchMeeting();
    }, [id]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleParticipantPress = async (account: string) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                return;
            }

            // Check if this is the current user
            if (account === currentUser?.account) {
                // Navigate to the profile tab for current user
                router.dismiss();
                setTimeout(() => {
                    router.push('/(tabs)/profile');
                }, 100);
            } else {
                // Fetch user data by account for other users
                const userResponse = await UserRepo.GetByAccount(account, token);
                if (userResponse.success) {
                    // Navigate to dynamic [account] route for other users
                    router.dismiss();
                    setTimeout(() => {
                        router.push(`/${account}`);
                    }, 100);
                } else {
                    console.error('Failed to fetch user data:', userResponse.errors);
                    // TODO: Show error message to user
                }
            }
        } catch (error) {
            console.error('Error handling participant press:', error);
            // TODO: Show error message to user
        }
    };

    const renderParticipant = (participant: Meetings.Participant) => (
        <TouchableOpacity
            key={participant.id}
            style={[styles.participantItem, { backgroundColor: cardColor, borderColor }]}
            onPress={() => {
                handleParticipantPress(participant.user.account);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.participantAvatar}>
                <Text style={styles.participantInitials}>
                    {getInitials(participant.user.name)}
                </Text>
            </View>
            <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: textColor }]}>{participant.user.name}</Text>
                <Text style={styles.participantEmail}>{participant.user.email}</Text>
                <Text style={styles.participantStatus}>Status: {participant.status}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colorGrey} />
        </TouchableOpacity>
    );

    const handleGoBack = () => {
        router.back();
    };

    if (meetingState.status === "loading") {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Feather name="arrow-left" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>Meeting Details</Text>
                    <TouchableOpacity>
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading meeting details...</Text>
                </View>
            </View>
        );
    }

    if (meetingState.status === "error") {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Feather name="arrow-left" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>Meeting Details</Text>
                    <TouchableOpacity>
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{meetingState.error}</Text>
                </View>
            </View>
        );
    }

    if (meetingState.status !== "success") {
        return null;
    }

    const meeting = meetingState.data;

    return (
        <SafeAreaContainer edges={['bottom']} backgroundColor={backgroundColor}>
            <View style={[styles.container, { backgroundColor }]}>
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Feather name="arrow-left" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>Meeting Details</Text>
                    <TouchableOpacity >
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Meeting Info */}
                    <View style={[styles.section, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.meetingTitle, { color: textColor }]}>{meeting.title}</Text>

                        <Text style={styles.meetingDescription}>
                            Type: {meeting.meeting_type?.title || 'N/A'}
                        </Text>

                        <View style={styles.statusBadge}>
                            <Feather
                                name={meeting.status === 'pending' ? 'clock' : meeting.status === 'approved' ? 'check-circle' : 'x-circle'}
                                size={16}
                                color={meeting.status === 'pending' ? '#ffc107' : meeting.status === 'approved' ? '#28a745' : '#dc3545'}
                            />
                            <Text style={[styles.statusText, {
                                color: meeting.status === 'pending' ? '#856404' : meeting.status === 'approved' ? '#155724' : '#721c24'
                            }]}>
                                {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                            </Text>
                        </View>
                    </View>

                    {/* Meeting Details */}
                    <View style={[styles.section, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Details</Text>

                        <View style={styles.detailItem}>
                            <Feather name="calendar" size={20} color={theme.colorNouraBlue} />
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Start Time</Text>
                                <Text style={[styles.detailValue, { color: textColor }]}>{formatDate(meeting.start_time)}</Text>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Feather name="map-pin" size={20} color={theme.colorNouraBlue} />
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Location</Text>
                                <Text style={[styles.detailValue, { color: textColor }]}>{meeting.location}</Text>
                            </View>
                        </View>

                        {meeting.location_url && (
                            <View style={styles.detailItem}>
                                <Feather name="link" size={20} color={theme.colorNouraBlue} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Meeting Link</Text>
                                    <Text style={[styles.detailValue, { color: textColor }]}>{meeting.location_url}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Owner */}
                    <View style={[styles.section, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Meeting Owner</Text>

                        {meeting.participants.find(p => p.user_id === meeting.owner_id) ? (
                            <TouchableOpacity
                                style={[styles.organizerItem, { backgroundColor: cardColor }]}
                                onPress={() => {
                                    const owner = meeting.participants.find(p => p.user_id === meeting.owner_id);
                                    if (owner) handleParticipantPress(owner.user.account);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.organizerAvatar}>
                                    <Text style={styles.organizerInitials}>
                                        {getInitials(meeting.participants.find(p => p.user_id === meeting.owner_id)?.user.name || 'Unknown')}
                                    </Text>
                                </View>
                                <View style={styles.organizerInfo}>
                                    <Text style={[styles.organizerName, { color: textColor }]}>
                                        {meeting.participants.find(p => p.user_id === meeting.owner_id)?.user.name || 'Unknown'}
                                    </Text>
                                    <Text style={styles.organizerEmail}>
                                        {meeting.participants.find(p => p.user_id === meeting.owner_id)?.user.email || 'Unknown'}
                                    </Text>
                                </View>
                                <Feather name="chevron-right" size={16} color={theme.colorGrey} />
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.detailValue}>Owner information not available</Text>
                        )}
                    </View>

                    {/* Participants */}
                    <View style={[styles.section, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            Participants ({meeting.participants.length})
                        </Text>

                        <View style={styles.participantsList}>
                            {meeting.participants.map(renderParticipant)}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaContainer>
    );
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
        borderBottomWidth: 1,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorNouraBlue,
    },
    title: {
        fontSize: 20,
        marginBottom: 10,
        fontWeight: '600',
        color: theme.colorBlack,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    meetingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colorBlack,
        marginBottom: 8,
    },
    meetingDescription: {
        fontSize: 16,
        color: theme.colorGrey,
        lineHeight: 22,
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4edda',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        gap: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#155724',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: theme.colorGrey,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colorBlack,
    },
    organizerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    organizerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colorNouraBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    organizerInitials: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colorWhite,
    },
    organizerInfo: {
        flex: 1,
    },
    organizerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 2,
    },
    organizerEmail: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    participantsList: {
        gap: 8,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
    },
    participantAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colorNouraBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    participantInitials: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colorWhite,
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 2,
    },
    participantEmail: {
        fontSize: 12,
        color: theme.colorGrey,
    },
    participantStatus: {
        fontSize: 11,
        color: theme.colorNouraBlue,
        fontWeight: '500',
        marginTop: 2,
    },
});
