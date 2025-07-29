import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView } from "react-native";

import { theme } from "@/styles/theme";
import { NouraButton, NouraCard } from "@/lib/components";

export default function HomeScreen() {
  const handleCreateMeeting = () => {
    // TODO: Navigate to create meeting screen
    console.log("Create meeting pressed");
  };

  const handleExplore = () => {
    // TODO: Navigate to explore screen
    console.log("Explore pressed");
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to Wall</Text>
        <Text style={styles.subtitleText}>Your fortress for interaction and engagement</Text>
      </View>

      <View style={styles.content}>
        <NouraCard
          title="Quick Actions"
          variant="elevated"
          padding="large"
          style={styles.quickActionsCard}
        >
          <NouraButton
            title="Create Meeting"
            onPress={handleCreateMeeting}
            variant="primary"
            style={styles.actionButton}
          />
          <NouraButton
            title="Explore"
            onPress={handleExplore}
            variant="outline"
            style={styles.actionButton}
          />
        </NouraCard>

        <NouraCard
          title="Recent Activity"
          variant="default"
          style={styles.activityCard}
        >
          <Text style={styles.activityText}>
            No recent activity to display.
          </Text>
          <Text style={styles.activitySubtext}>
            Start by creating your first meeting or exploring the platform.
          </Text>
        </NouraCard>

        <NouraCard
          title="Platform Stats"
          variant="outlined"
          style={styles.statsCard}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Meetings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>User</Text>
            </View>
          </View>
        </NouraCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPaleBlue,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: theme.colorWhite,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colorBlack,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: theme.colorGrey,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  quickActionsCard: {
    marginBottom: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  activityCard: {
    marginBottom: 8,
  },
  activityText: {
    fontSize: 16,
    color: theme.colorBlack,
    marginBottom: 8,
  },
  activitySubtext: {
    fontSize: 14,
    color: theme.colorGrey,
  },
  statsCard: {
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colorDeepSkyBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colorGrey,
    textTransform: "uppercase",
  },
});
