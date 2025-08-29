import { StyleSheet, Text, View, TouchableOpacity, FlatList, ScrollView } from "react-native";
import { router } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";
import { theme } from "@/styles/theme";
import { MeetingRepo } from "@/repo";
import { Meetings } from "@/repo/meetings";
import Navbar from "@/lib/utils/navigation-bar";

// -------------------------------
// State Management & Grouping
// -------------------------------

type MeetingSection = {
  title: string;
  data: Meetings.Meeting[];
  count: number;
};

type MeetingsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: Meetings.Meeting[]; sections: MeetingSection[] };

// Date grouping utility functions
const formatDateSection = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Normalize dates to compare only the date part (not time)
  const meetingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  console.log('=== Date Comparison Debug ===');
  console.log('Meeting date:', meetingDate.toDateString());
  console.log('Today:', todayDate.toDateString());
  console.log('Tomorrow:', tomorrowDate.toDateString());
  console.log('Meeting === Today:', meetingDate.getTime() === todayDate.getTime());
  console.log('Meeting === Tomorrow:', meetingDate.getTime() === tomorrowDate.getTime());

  if (meetingDate.getTime() === todayDate.getTime()) {
    return 'Today';
  } else if (meetingDate.getTime() === tomorrowDate.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
};

const groupMeetingsByDate = (meetings: Meetings.Meeting[]): MeetingSection[] => {
  // Group meetings by their start_time date
  const grouped = meetings.reduce((acc, meeting) => {
    const meetingDate = new Date(meeting.start_time);
    const dateKey = meetingDate.toDateString();

    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: meetingDate,
        meetings: []
      };
    }

    acc[dateKey].meetings.push(meeting);
    return acc;
  }, {} as Record<string, { date: Date; meetings: Meetings.Meeting[] }>);

  // Convert to sections array and sort by date
  return Object.values(grouped)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(group => ({
      title: formatDateSection(group.date),
      data: group.meetings.sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
      count: group.meetings.length
    }));
};

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  const [meetingsState, setMeetingsState] = useState<MeetingsState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<string>('Today');

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

      // Fetch both owned meetings and participant meetings
      const [ownedMeetingsResponse, participantMeetingsResponse] = await Promise.all([
        MeetingRepo.GetMeetings("", token), // Meetings where user is owner
        MeetingRepo.GetMeetingsRequests("", token) // Meetings where user is participant
      ]);

      console.log('Owned meetings response:', JSON.stringify(ownedMeetingsResponse, null, 2));
      console.log('Participant meetings response:', JSON.stringify(participantMeetingsResponse, null, 2));

      const allMeetings: Meetings.Meeting[] = [];

      // Process owned meetings
      if (ownedMeetingsResponse.success) {
        if (Array.isArray(ownedMeetingsResponse.data)) {
          allMeetings.push(...(ownedMeetingsResponse.data as Meetings.Meeting[]));
        } else if (ownedMeetingsResponse.data && 'title' in ownedMeetingsResponse.data) {
          allMeetings.push(ownedMeetingsResponse.data as Meetings.Meeting);
        }
      }

      // Process participant meetings
      if (participantMeetingsResponse.success) {
        if (Array.isArray(participantMeetingsResponse.data)) {
          const participantMeetings = participantMeetingsResponse.data as Meetings.Meeting[];
          // Add participant meetings, but avoid duplicates
          participantMeetings.forEach(meeting => {
            if (!allMeetings.some(existing => existing.id === meeting.id)) {
              allMeetings.push(meeting);
            }
          });
        }
      }

      // Filter to only show approved meetings (for both owned and participated)
      const approvedMeetings = allMeetings.filter(meeting => meeting.status.toLowerCase() === 'approved');
      const sections = groupMeetingsByDate(approvedMeetings);

      console.log('=== Meeting Debug Info ===');
      console.log('All meetings:', allMeetings.length);
      console.log('All meetings details:', allMeetings.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        start_time: m.start_time,
        parsed_date: new Date(m.start_time).toDateString(),
        dateSection: formatDateSection(new Date(m.start_time))
      })));
      console.log('Approved meetings:', approvedMeetings.length);
      console.log('Approved meetings details:', approvedMeetings.map(m => ({
        id: m.id,
        title: m.title,
        start_time: m.start_time,
        parsed_date: new Date(m.start_time).toDateString(),
        dateSection: formatDateSection(new Date(m.start_time))
      })));
      console.log('Generated sections:', sections.map(s => ({ title: s.title, count: s.count })));

      setMeetingsState({ status: "success", data: allMeetings, sections });

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

  // Update active tab when sections change
  useEffect(() => {
    if (meetingsState.status === "success" && meetingsState.sections.length > 0) {
      // Set the first available tab as active if current active tab doesn't exist
      const availableTabs = meetingsState.sections.map(s => s.title);
      if (!availableTabs.includes(activeTab)) {
        setActiveTab(availableTabs[0]);
      }
    }
  }, [meetingsState, activeTab]);

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

  // Get the active tab's meetings
  const getActiveMeetings = () => {
    if (meetingsState.status !== "success") return [];
    const activeSection = meetingsState.sections.find(section => section.title === activeTab);
    return activeSection ? activeSection.data : [];
  };

  // Get available tabs from sections
  const getAvailableTabs = () => {
    if (meetingsState.status !== "success") return [];
    return meetingsState.sections.map(section => ({
      title: section.title,
      count: section.count
    }));
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
        Type: {item.meeting_type.title} • Participants: {item.participants.length}
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

  const handleNewPress = () => {
    router.navigate('/create-meeting');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Navbar
        backgroundColor={backgroundColor}
      >
        <View style={styles.navbarContent}>
          <View style={styles.navbarLeft}>
            <View style={styles.navbarTitleRow}>
              <Text style={[styles.navbarTitle, { color: textColor }]}>Upcoming</Text>
              {/* <Feather name="chevron-down" size={20} color={theme.colorBlack} /> */}
            </View>
          </View>
          <TouchableOpacity style={[styles.navbarButton, { backgroundColor: useThemeColor({}, 'tabIconDefault') }]} onPress={handleNewPress} accessibilityLabel="Create event">
            <Feather name="plus" size={22} color={textColor} />
          </TouchableOpacity>
        </View>
      </Navbar>

      {getAvailableTabs().length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabContainer}
        >
          {getAvailableTabs().map((tab, index) => (
            <TouchableOpacity
              key={tab.title}
              style={[
                styles.tab,
                activeTab === tab.title && styles.activeTab,
                index === 0 && styles.firstTab
              ]}
              onPress={() => setActiveTab(tab.title)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.title ? theme.colorWhite : textSecondaryColor }
              ]}>
                {tab.title} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Meetings List */}
      <FlatList
        data={getActiveMeetings()}
        renderItem={renderMeetingCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
            <View style={styles.emptyCardInner}>
              <View style={styles.emptyIconWrapper}>
                <Feather name="calendar" size={28} color={textSecondaryColor} />
              </View>
              <Text style={[styles.emptyTitleBig, { color: textColor }]}>
                {meetingsState.status === "loading" ? "Loading Meetings" :
                  meetingsState.status === "error" ? "Error Loading" :
                    getAvailableTabs().length === 0 ? "No Upcoming Meetings" : `No ${activeTab} Meetings`}
              </Text>
              <Text style={[styles.emptySubtitleCenter, { color: textSecondaryColor }]}>
                {meetingsState.status === "loading"
                  ? "Please wait while we fetch your meetings."
                  : meetingsState.status === "error"
                    ? meetingsState.error
                    : getAvailableTabs().length === 0
                      ? "Scheduled meetings relevant to you, regardless of your role as organizer or attendee."
                      : `No meetings scheduled for ${activeTab.toLowerCase()}.`}
              </Text>

              {meetingsState.status !== "loading" && (
                <TouchableOpacity style={[styles.emptyCTAButton, { backgroundColor: cardColor, borderColor: borderColor }]} onPress={handleNewPress}>
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
    paddingVertical: 0, // Remove all vertical padding
  },
  navbarLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    margin: 0, // Remove all margins
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
  // logoIcon: {
  //   width: 32,
  //   height: 32,
  //   margin: 0, // Remove all margins
  // },
  navbarButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0, // Remove all margins
    padding: 0, // Remove all padding
    borderRadius: 18,
  },
  listContainer: {
    paddingTop: 20, // Adjusted top padding for symmetry with dynamic island
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tabScrollView: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colorLightGrey,
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tab: {
    backgroundColor: theme.colorLightGrey,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  firstTab: {
    marginLeft: 0,
  },
  activeTab: {
    backgroundColor: theme.colorNouraBlue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
