import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { setThemeMode, ThemeMode } from '@/stores/theme-slice';
import { useTheme } from '@/lib/hooks/theme/useTheme';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';
import { ApplicationDispatch } from '@/stores/store';
import { theme } from '@/styles/theme';
import SafeAreaContainer from '@/lib/utils/safe-area-container';

export default function Preferences() {
    const dispatch = useDispatch<ApplicationDispatch>();
    const { selectedMode } = useTheme();

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    const themeOptions: { mode: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
        { mode: 'light', label: 'Light', icon: 'sun' },
        { mode: 'dark', label: 'Dark', icon: 'moon' },
        { mode: 'system', label: 'System', icon: 'smartphone' },
    ];

    const handleThemeChange = (themeMode: ThemeMode) => {
        dispatch(setThemeMode(themeMode));
    };

    const renderPreferenceItem = (
        icon: keyof typeof Feather.glyphMap,
        title: string,
        subtitle?: string,
        onPress?: () => void
    ) => (
        <TouchableOpacity
            style={[styles.preferenceItem, { backgroundColor: cardColor }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.preferenceItemLeft}>
                <View style={styles.iconContainer}>
                    <Feather name={icon} size={22} color={theme.colorNouraBlue} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.preferenceTitle, { color: textColor }]}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
                    )}
                </View>
            </View>
            <View style={styles.preferenceItemRight}>
                <Feather name="chevron-right" size={20} color={theme.colorGrey} />
            </View>
        </TouchableOpacity>
    );

    const renderThemeOption = (option: { mode: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }) => (
        <TouchableOpacity
            key={option.mode}
            style={[styles.themeOption, { backgroundColor: cardColor }]}
            onPress={() => handleThemeChange(option.mode)}
            activeOpacity={0.7}
        >
            <View style={styles.preferenceItemLeft}>
                <View style={styles.iconContainer}>
                    <Feather
                        name={option.icon}
                        size={22}
                        color={selectedMode === option.mode ? theme.colorNouraBlue : theme.colorGrey}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[
                        styles.preferenceTitle,
                        { color: selectedMode === option.mode ? theme.colorNouraBlue : textColor }
                    ]}>
                        {option.label}
                    </Text>
                </View>
            </View>
            {selectedMode === option.mode && (
                <View style={styles.preferenceItemRight}>
                    <Feather name="check" size={20} color={theme.colorNouraBlue} />
                </View>
            )}
        </TouchableOpacity>
    );


    return (
        <SafeAreaContainer
            backgroundColor={backgroundColor}
            edges={['bottom']}
        >
            <View style={[styles.container, { backgroundColor }]}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.settingsContainer}>
                        {/* Theme Selection */}
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Appearance</Text>
                            <View style={[styles.preferenceGroup, { backgroundColor: cardColor }]}>
                                {themeOptions.map((option, index) => (
                                    <View key={option.mode}>
                                        {renderThemeOption(option)}
                                        {index < themeOptions.length - 1 && <View style={styles.divider} />}
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Other Preferences */}
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Settings</Text>
                            <View style={[styles.preferenceGroup, { backgroundColor: cardColor }]}>
                                {renderPreferenceItem('bell', 'Notifications', 'Manage your notifications')}
                                <View style={styles.divider} />
                                {renderPreferenceItem('globe', 'Language', 'English (US)')}
                            </View>
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
    // header: {
    //   flexDirection: 'row',
    //   alignItems: 'center',
    //   justifyContent: 'space-between',
    //   paddingHorizontal: 20,
    //   paddingVertical: 16,
    //   borderBottomWidth: 1,
    //   borderBottomColor: theme.colorLightGrey,
    // },
    // headerTitle: {
    //   fontSize: 20,
    //   fontWeight: '600',
    // },
    // placeholder: {
    //   width: 24,
    // },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    settingsContainer: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    preferenceGroup: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        overflow: 'hidden',
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    preferenceItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    preferenceTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    preferenceSubtitle: {
        fontSize: 14,
        color: theme.colorGrey,
        marginTop: 2,
    },
    preferenceItemRight: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colorLightGrey,
        marginLeft: 68, // Align with text content (icon container width + margin)
    },
});