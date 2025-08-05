import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { theme } from '@/styles/theme';

export default function NotificationSettings() {
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [meetingReminders, setMeetingReminders] = useState(true);
    const [teamUpdates, setTeamUpdates] = useState(false);
    const [weeklyDigest, setWeeklyDigest] = useState(true);

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Feather name="arrow-left" size={24} color={theme.colorBlack} />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Push Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Push Notifications</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingTitle}>Enable Push Notifications</Text>
                            <Text style={styles.settingSubtitle}>Receive notifications on your device</Text>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={setPushNotifications}
                            trackColor={{ false: theme.colorLightGrey, true: theme.colorNouraBlue }}
                            thumbColor={theme.colorWhite}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingTitle}>Meeting Reminders</Text>
                            <Text style={styles.settingSubtitle}>Get notified before meetings start</Text>
                        </View>
                        <Switch
                            value={meetingReminders}
                            onValueChange={setMeetingReminders}
                            trackColor={{ false: theme.colorLightGrey, true: theme.colorNouraBlue }}
                            thumbColor={theme.colorWhite}
                            disabled={!pushNotifications}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingTitle}>Team Updates</Text>
                            <Text style={styles.settingSubtitle}>New team member activities</Text>
                        </View>
                        <Switch
                            value={teamUpdates}
                            onValueChange={setTeamUpdates}
                            trackColor={{ false: theme.colorLightGrey, true: theme.colorNouraBlue }}
                            thumbColor={theme.colorWhite}
                            disabled={!pushNotifications}
                        />
                    </View>
                </View>

                {/* Email Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Email Notifications</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingTitle}>Email Notifications</Text>
                            <Text style={styles.settingSubtitle}>Receive updates via email</Text>
                        </View>
                        <Switch
                            value={emailNotifications}
                            onValueChange={setEmailNotifications}
                            trackColor={{ false: theme.colorLightGrey, true: theme.colorNouraBlue }}
                            thumbColor={theme.colorWhite}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingTitle}>Weekly Digest</Text>
                            <Text style={styles.settingSubtitle}>Summary of your weekly activity</Text>
                        </View>
                        <Switch
                            value={weeklyDigest}
                            onValueChange={setWeeklyDigest}
                            trackColor={{ false: theme.colorLightGrey, true: theme.colorNouraBlue }}
                            thumbColor={theme.colorWhite}
                            disabled={!emailNotifications}
                        />
                    </View>
                </View>

                {/* Quiet Hours Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quiet Hours</Text>

                    <TouchableOpacity style={styles.settingItemButton}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingTitle}>Do Not Disturb</Text>
                            <Text style={styles.settingSubtitle}>Set quiet hours for notifications</Text>
                        </View>
                        <View style={styles.settingRight}>
                            <Text style={styles.timeText}>10:00 PM - 8:00 AM</Text>
                            <Feather name="chevron-right" size={20} color={theme.colorGrey} />
                        </View>
                    </TouchableOpacity>
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
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: theme.colorWhite,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
    },
    settingItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: theme.colorWhite,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
    },
    settingLeft: {
        flex: 1,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 14,
        color: theme.colorGrey,
        lineHeight: 18,
    },
    timeText: {
        fontSize: 14,
        color: theme.colorGrey,
        fontWeight: '500',
    },
});
