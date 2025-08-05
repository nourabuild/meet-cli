import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { theme } from '@/styles/theme';
import { useAuth } from '@/lib/utils/auth-context';

type SettingsItem = {
    id: string;
    title: string;
    subtitle?: string;
    icon: keyof typeof Feather.glyphMap;
    route?: string;
    action?: () => void;
    showChevron?: boolean;
    badge?: string;
};

export default function SettingsScreen() {
    const { logout } = useAuth();

    const settingsData: SettingsItem[] = [
        // Account Section
        {
            id: 'account',
            title: 'Account Settings',
            icon: 'user',
            showChevron: true,
        },
        {
            id: 'billing',
            title: 'Billing & Subscription',
            icon: 'credit-card',
            showChevron: true,
            badge: 'Pro',
        },

        // Integrations Section
        {
            id: 'integrations',
            title: 'Integrations',
            icon: 'link',
            showChevron: true,
        },

        // Notifications Section
        {
            id: 'notifications',
            title: 'Notifications',
            icon: 'bell',
            showChevron: true,
        },

        // Preferences Section
        {
            id: 'preferences',
            title: 'Preferences',
            icon: 'sliders',
            showChevron: true,
        },

        // Security Section
        {
            id: 'security',
            title: 'Security & Privacy',
            icon: 'shield',
            showChevron: true,
        },

        // Teams Section
        {
            id: 'teams',
            title: 'Teams & Organizations',
            icon: 'users',
            showChevron: true,
        },
    ];

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log('Starting logout process...');

                            // Use auth context to handle complete logout
                            await logout();
                            console.log('Auth logout completed');
                        } catch (error) {
                            console.error("Logout error:", error);
                            Alert.alert("Error", "Failed to logout. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleSettingsPress = (item: SettingsItem) => {
        switch (item.id) {
            case 'account':
                Alert.alert(
                    "Account Settings",
                    "Edit your profile, change password, and manage account preferences.",
                    [{ text: "OK" }]
                );
                break;

            case 'billing':
                Alert.alert(
                    "Billing & Subscription",
                    "Manage your subscription, view billing history, and update payment methods.",
                    [{ text: "OK" }]
                );
                break;

            case 'integrations':
                Alert.alert(
                    "Integrations",
                    "Connect with third-party services like Slack, Discord, and Zoom.",
                    [{ text: "OK" }]
                );
                break;

            case 'notifications':
                router.push('/profile-settings/notifications');
                break;

            case 'preferences':
                Alert.alert(
                    "Preferences",
                    "Set your default meeting settings, time zone, and app preferences.",
                    [{ text: "OK" }]
                );
                break;

            case 'security':
                Alert.alert(
                    "Security & Privacy",
                    "Manage two-factor authentication, privacy settings, and data controls.",
                    [{ text: "OK" }]
                );
                break;

            case 'teams':
                Alert.alert(
                    "Teams & Organizations",
                    "Create and manage teams, invite members, and set organization permissions.",
                    [{ text: "OK" }]
                );
                break;

            default:
                if (item.action) {
                    item.action();
                } else {
                    Alert.alert(item.title, `${item.title} functionality coming soon!`);
                }
                break;
        }
    };

    const renderSettingsItem = (item: SettingsItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.settingsItem}
            onPress={() => handleSettingsPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.settingsItemLeft}>
                <View style={styles.iconContainer}>
                    <Feather name={item.icon} size={22} color={theme.colorNouraBlue} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.settingsTitle}>{item.title}</Text>
                </View>
            </View>

            <View style={styles.settingsItemRight}>
                {item.badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                )}
                {item.showChevron && (
                    <Feather name="chevron-right" size={20} color={theme.colorGrey} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Feather name="arrow-left" size={24} color={theme.colorBlack} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Settings</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.settingsContainer}>
                    {settingsData.map(renderSettingsItem)}
                </View>

                {/* App Info Section */}
                <View style={styles.appInfoSection}>
                    <Text style={styles.sectionTitle}>App Information</Text>

                    <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                        <View style={styles.settingsItemLeft}>
                            <View style={styles.iconContainer}>
                                <Feather name="info" size={22} color={theme.colorGrey} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingsTitle}>About</Text>
                            </View>
                        </View>
                        <View style={styles.settingsItemRight}>
                            <Text style={styles.versionText}>v1.0.0</Text>
                            <Feather name="chevron-right" size={20} color={theme.colorGrey} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                        <View style={styles.settingsItemLeft}>
                            <View style={styles.iconContainer}>
                                <Feather name="help-circle" size={22} color={theme.colorGrey} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingsTitle}>Help & Support</Text>
                            </View>
                        </View>
                        <View style={styles.settingsItemRight}>
                            <Feather name="chevron-right" size={20} color={theme.colorGrey} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Also from Noura Section */}
                <View style={styles.appInfoSection}>
                    <Text style={styles.sectionTitle}>Also from Noura</Text>

                    <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                        <View style={styles.settingsItemLeft}>
                            <View style={styles.iconContainer}>
                                <Feather name="package" size={22} color={theme.colorNouraBlue} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingsTitle}>Product 1</Text>
                                <Text style={styles.productDescription}>Description</Text>
                            </View>
                        </View>
                        <View style={styles.settingsItemRight}>
                            <Feather name="chevron-right" size={20} color={theme.colorGrey} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                        <View style={styles.settingsItemLeft}>
                            <View style={styles.iconContainer}>
                                <Feather name="box" size={22} color={theme.colorNouraBlue} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingsTitle}>Product 2</Text>
                                <Text style={styles.productDescription}>Description</Text>
                            </View>
                        </View>
                        <View style={styles.settingsItemRight}>
                            <Feather name="chevron-right" size={20} color={theme.colorGrey} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Login Section */}
                <View style={styles.appInfoSection}>
                    <Text style={styles.sectionTitle}>Login</Text>

                    <TouchableOpacity
                        style={[styles.settingsItem, styles.logoutItem]}
                        activeOpacity={0.7}
                        onPress={handleLogout}
                    >
                        <View style={styles.settingsItemLeft}>
                            <View style={[styles.iconContainer, styles.logoutIconContainer]}>
                                <Feather name="log-out" size={22} color="#ff4444" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.settingsTitle, styles.logoutText]}>Logout</Text>
                            </View>
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colorBlack,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    settingsContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.colorWhite,
        borderRadius: 12,
        marginBottom: 2,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colorLightGrey,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 2,
    },
    settingsItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: theme.colorNouraBlue,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colorWhite,
    },
    versionText: {
        fontSize: 14,
        color: theme.colorGrey,
        fontWeight: '500',
    },
    appInfoSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    productDescription: {
        fontSize: 14,
        color: theme.colorGrey,
        marginTop: 2,
    },
    logoutItem: {
        borderColor: '#ff4444',
    },
    logoutIconContainer: {
        backgroundColor: '#ffe6e6',
    },
    logoutText: {
        color: '#ff4444',
    },
});
