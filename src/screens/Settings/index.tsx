import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { theme } from '@/styles/theme';
import { useAuth } from '@/lib/utils/auth-context';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import SafeAreaContainer from '@/lib/utils/safe-area-container';

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

export default function SettingsPage() {
    const { logout } = useAuth();

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    const accountSettings: SettingsItem[] = [
        {
            id: 'personal',
            title: 'Personal',
            icon: 'user',
            showChevron: true,
        }
    ];

    const appSettings: SettingsItem[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            icon: 'sliders',
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
                            await logout();
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
            case 'personal':
                router.push('/show-settings/personal');
                break;

            case 'preferences':
                router.push('/show-settings/preferences');
                break;

            // case 'availability':
            //     router.push('/show-settings/availability');
            //     break;

            // case 'billing':
            //     Alert.alert(
            //         "Billing & Subscription",
            //         "Manage your subscription, view billing history, and update payment methods.",
            //         [{ text: "OK" }]
            //     );
            //     break;

            // case 'integrations':
            //     Alert.alert(
            //         "Integrations",
            //         "Connect with third-party services like Slack, Discord, and Zoom.",
            //         [{ text: "OK" }]
            //     );
            //     break;

            // case 'notifications':
            //     router.push('/show-settings/notifications');
            //     break;



            // case 'security':
            //     Alert.alert(
            //         "Security & Privacy",
            //         "Manage two-factor authentication, privacy settings, and data controls.",
            //         [{ text: "OK" }]
            //     );
            //     break;

            // case 'teams':
            //     Alert.alert(
            //         "Teams & Organizations",
            //         "Create and manage teams, invite members, and set organization permissions.",
            //         [{ text: "OK" }]
            //     );
            //     break;

            default:
                if (item.action) {
                    item.action();
                } else {
                    Alert.alert(item.title, `${item.title} functionality coming soon!`);
                }
                break;
        }
    };

    const renderSettingsItem = (item: SettingsItem, isLast: boolean = false) => (
        <View key={item.id}>
            <TouchableOpacity
                style={[styles.settingsItem, { backgroundColor: cardColor }]}
                onPress={() => handleSettingsPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.settingsItemLeft}>
                    <View style={styles.iconContainer}>
                        <Feather name={item.icon} size={22} color={theme.colorNouraBlue} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.settingsTitle, { color: textColor }]}>{item.title}</Text>
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
            {!isLast && <View style={styles.settingsItemDivider} />}
        </View>
    );

    const renderSettingsGroup = (items: SettingsItem[]) => (
        <View style={[styles.settingsGroup, { backgroundColor: cardColor }]}>
            {items.map((item, index) => renderSettingsItem(item, index === items.length - 1))}
        </View>
    );

    return (
        <SafeAreaContainer
            backgroundColor={backgroundColor}
            edges={['bottom']}>
            <View style={[styles.container, { backgroundColor }]}>


                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.settingsContainer}>
                        {renderSettingsGroup(accountSettings)}
                        {renderSettingsGroup(appSettings)}
                    </View>


                    {/* Login Section */}
                    <View style={styles.appInfoSection}>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            activeOpacity={0.85}
                            onPress={handleLogout}
                        >
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* App Version - positioned above safe area */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>v1.0.0</Text>
                </View>
            </View>
        </SafeAreaContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // header: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     paddingHorizontal: 20,
    //     paddingVertical: 16,
    // },
    // headerLeft: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     gap: 12,
    // },

    // title: {
    //     fontSize: 20,
    //     fontWeight: "bold",
    // },
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
    },
    settingsGroup: {
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        overflow: 'hidden',
    },
    settingsItemDivider: {
        height: 1,
        backgroundColor: theme.colorLightGrey,
        marginLeft: 64, // Aligns with text content, accounting for icon width
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
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
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    appInfoSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    logoutButton: {
        backgroundColor: '#ff4444',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 8,
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});


//    productDescription: {
//         fontSize: 14,
//         color: theme.colorGrey,
//         marginTop: 2,
//     },

{/* <View style={styles.appInfoSection}>
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
                </View> */}
