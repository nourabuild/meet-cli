import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Animated } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { theme } from "@/styles/theme";
import { MeetingRepo } from "@/repo";
import { Meetings } from "@/repo/meetings";

// -------------------------------
// State Management
// -------------------------------

type MeetingsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: Meetings.Meeting[] };

export default function HomeScreen() {
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

      // Fetch meetings - using empty string for status since your backend doesn't seem to use it
      const meetingResponse = await MeetingRepo.GetMeetings("", token);
      console.log('Meetings response:', JSON.stringify(meetingResponse, null, 2));

      if (meetingResponse.success) {
        if (Array.isArray(meetingResponse.data)) {
          // The data is already meetings from your API
          const meetingsData = meetingResponse.data as Meetings.Meeting[];
          setMeetingsState({ status: "success", data: meetingsData });
        } else if (meetingResponse.data && 'title' in meetingResponse.data) {
          // Single meeting
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
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

  const renderMeetingCard = ({ item }: { item: Meetings.Meeting }) => (
    <TouchableOpacity
      style={styles.meetingCard}
      onPress={() => router.push(`/meeting-details/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.meetingHeader}>
        <View style={styles.meetingHeaderLeft}>
          <Text style={styles.meetingTitle}>{item.title}</Text>
          <Text style={styles.meetingTime}>
            {formatMeetingTime(item.start_time)}
          </Text>
          <Text style={styles.meetingLocation}>
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

      <Text style={styles.meetingDescription} numberOfLines={2}>
        Type: {item.meeting_type.title} • Participants: {item.participants.length}
      </Text>

      <View style={styles.meetingFooter}>
        <Text style={styles.statusText}>
          Status: {item.status}
        </Text>
        <Text style={styles.createdText}>
          Type: {item.meeting_type.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const handleNewPress = () => {
    router.navigate('/create-meeting');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>

        {/* Top Navigation Bar */}
        <View style={styles.navbar}>
          <View style={styles.navbarContent}>
            <View style={styles.navbarLeft}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.navbarButton} onPress={handleNewPress}>
              <Feather name="plus" size={24} color={theme.colorDeepSkyBlue} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Meetings List */}
        <FlatList
          data={meetingsState.status === "success" ? meetingsState.data.filter(meeting => meeting.status.toLowerCase() === 'approved') : []}
          renderItem={renderMeetingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="calendar" size={48} color={theme.colorGrey} />
              <Text style={styles.emptyTitle}>
                {meetingsState.status === "loading" ? "Loading meetings..." :
                  meetingsState.status === "error" ? "Error loading meetings" :
                    "No meetings scheduled"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {meetingsState.status === "loading"
                  ? "Please wait while we fetch your meetings"
                  : meetingsState.status === "error"
                    ? meetingsState.error
                    : "Tap the + button to create your first meeting"
                }
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colorWhite,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colorWhite,
  },
  navbar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navbarLeft: {
    flex: 1,
  },
  logoIcon: {
    width: 32,
    height: 32,
  },
  navbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 20,
  },
  meetingCard: {
    backgroundColor: theme.colorWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colorLightGrey,
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
    color: theme.colorBlack,
    marginBottom: 4,
  },
  meetingTime: {
    fontSize: 14,
    color: theme.colorNouraBlue,
    fontWeight: '600',
  },
  meetingLocation: {
    fontSize: 13,
    color: theme.colorGrey,
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
    color: theme.colorGrey,
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
    color: theme.colorBlack,
    fontWeight: '500',
  },
  createdText: {
    fontSize: 14,
    color: theme.colorGrey,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colorBlack,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colorGrey,
    textAlign: 'center',
    lineHeight: 22,
  },
});
