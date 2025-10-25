import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';

import { CalendarRepo } from '@/repo';
import { useAuth } from '@/lib/utils/auth-context';
import { Calendars } from '@/repo/calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WeeklySchedule } from './Calendar';

type SettingsStepOnboardingProps = {
    onBack?: () => void;
    onComplete?: () => void;
    schedule: WeeklySchedule[];
};

type SettingsFormState = {
    maxDaysToBook: string;
    minDaysToBook: string;
    delayBetweenMeetings: string;
    timezone: string;
};

const fallbackTimezone = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    } catch {
        return '';
    }
})();

const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

const submitWeeklyAvailability = async (weeklySchedule: WeeklySchedule[], token: string) => {
    const daysWithAvailability = weeklySchedule.filter(day => day.intervals.length > 0);

    for (const daySchedule of daysWithAvailability) {
        const result = await CalendarRepo.AddUserWeeklyAvailability(
            daySchedule.day_of_week,
            daySchedule.intervals,
            token,
        );

        if (!result.success) {
            const dayName = DAY_NAMES[daySchedule.day_of_week] ?? `day ${daySchedule.day_of_week}`;
            throw new Error(`Failed to save availability for ${dayName}`);
        }
    }
};

type LoadSettingsArgs = {
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setForm: React.Dispatch<React.SetStateAction<SettingsFormState>>;
    defaultTimezone: string;
};

const loadUserSettings = async ({
    setIsLoading,
    setError,
    setForm,
    defaultTimezone,
}: LoadSettingsArgs) => {
    setIsLoading(true);
    setError(null);
    try {
        const token = await SecureStore.getItemAsync('access_token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const response = await CalendarRepo.GetUserSettings(token);
        if (!response.success) {
            const message = response.errors?.[0]?.error ?? 'Failed to load scheduling preferences';
            throw new Error(message);
        }

        const data = response.data;
        console.log('[Settings] API returned data:', data);
        const formState = {
            maxDaysToBook: data.max_days_to_book != null ? String(data.max_days_to_book) : '',
            minDaysToBook: data.min_days_to_book != null ? String(data.min_days_to_book) : '',
            delayBetweenMeetings: data.delay_between_meetings != null ? String(data.delay_between_meetings) : '',
            timezone: data.timezone?.trim?.() || defaultTimezone,
        };
        console.log('[Settings] Setting form state to:', formState);
        setForm(formState);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load scheduling preferences';
        setError(message);
    } finally {
        setIsLoading(false);
    }
};

function SettingsStepOnboarding({ onBack, onComplete, schedule }: SettingsStepOnboardingProps) {
    const [form, setForm] = useState<SettingsFormState>({
        maxDaysToBook: '',
        minDaysToBook: '',
        delayBetweenMeetings: '',
        timezone: fallbackTimezone,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { checkOnboardingStatus } = useAuth();

    const updateFormField = (field: keyof SettingsFormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    useEffect(() => {
        loadUserSettings({
            setIsLoading,
            setError,
            setForm,
            defaultTimezone: fallbackTimezone,
        });
    }, [setError, setForm, setIsLoading]);

    const handleRetryLoad = () => {
        loadUserSettings({
            setIsLoading,
            setError,
            setForm,
            defaultTimezone: fallbackTimezone,
        });
    };

    const handleSavePreferences = async () => {
        const timezoneValue = form.timezone.trim();
        if (timezoneValue.length === 0) {
            const message = 'Timezone is required to finish onboarding.';
            setError(message);
            Alert.alert('Missing information', 'Please provide a timezone before finishing onboarding.');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            await submitWeeklyAvailability(schedule, token);

            const parseInteger = (value: string) => {
                const trimmed = value.trim();
                if (trimmed.length === 0) return undefined;
                const parsed = Number.parseInt(trimmed, 10);
                return Number.isFinite(parsed) ? parsed : undefined;
            };

            const payload: Calendars.UserSettingsUpdate = {};
            const maxDays = parseInteger(form.maxDaysToBook);
            const minDays = parseInteger(form.minDaysToBook);
            const delay = parseInteger(form.delayBetweenMeetings);

            payload.timezone = timezoneValue;
            if (maxDays !== undefined) payload.max_days_to_book = maxDays;
            if (minDays !== undefined) payload.min_days_to_book = minDays;
            if (delay !== undefined) payload.delay_between_meetings = delay;

            const response = await CalendarRepo.UpsertUserSettings(payload, token);
            if (!response.success) {
                const message = response.errors?.[0]?.error ?? 'Failed to save scheduling preferences';
                throw new Error(message);
            }

            await checkOnboardingStatus();
            onComplete?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save scheduling preferences';
            setError(message);
            Alert.alert('Error', message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                <View style={styles.header}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            style={styles.headerButton}
                            accessibilityRole="button"
                            accessibilityLabel="Go back to availability setup"
                        >
                            <Feather name="arrow-left" size={22} color="#1F2937" />
                        </TouchableOpacity>
                    ) : null}

                    <Text style={styles.title}>Scheduling Preferences</Text>
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Text style={styles.subtitle}>
                        Set default rules for how people can book time with you before finishing onboarding.
                    </Text>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <Text style={styles.loadingText}>Loading your preferences…</Text>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            {error && (
                                <View style={styles.errorBanner}>
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity
                                        onPress={handleRetryLoad}
                                        style={styles.retryButton}
                                        accessibilityRole="button"
                                        accessibilityLabel="Retry loading preferences"
                                    >
                                        <Feather name="refresh-cw" size={16} color="#1D4ED8" />
                                        <Text style={styles.retryText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Maximum days in advance</Text>
                                <Text style={styles.description}>
                                    How far ahead someone can book a meeting with you.
                                </Text>
                                <TextInput
                                    value={form.maxDaysToBook}
                                    onChangeText={(value) => updateFormField('maxDaysToBook', value)}
                                    placeholder="e.g. 30"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    style={styles.input}
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Minimum notice</Text>
                                <Text style={styles.description}>
                                    Minimum number of days before someone can book you.
                                </Text>
                                <TextInput
                                    value={form.minDaysToBook}
                                    onChangeText={(value) => updateFormField('minDaysToBook', value)}
                                    placeholder="e.g. 1"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    style={styles.input}
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Buffer between meetings</Text>
                                <Text style={styles.description}>
                                    Minutes of downtime required between scheduled meetings.
                                </Text>
                                <TextInput
                                    value={form.delayBetweenMeetings}
                                    onChangeText={(value) => updateFormField('delayBetweenMeetings', value)}
                                    placeholder="e.g. 15"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    style={styles.input}
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Timezone</Text>
                                <Text style={styles.description}>
                                    Invites and availability will use this timezone.
                                </Text>
                                <TextInput
                                    value={form.timezone}
                                    onChangeText={(value) => updateFormField('timezone', value)}
                                    placeholder="e.g. America/New_York"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={styles.input}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSavePreferences}
                                style={[styles.continueButton, isSaving && styles.continueButtonDisabled]}
                                disabled={isSaving}
                                accessibilityRole="button"
                                accessibilityLabel={isSaving ? "Saving preferences" : "Finish onboarding"}
                                accessibilityState={{ disabled: isSaving }}
                            >
                                {isSaving ? (
                                    <View style={styles.loadingInline}>
                                        <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingSpinner} />
                                        <Text style={styles.continueButtonText}>Saving…</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.continueButtonText}>Finish setup</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

export default SettingsStepOnboarding;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        paddingTop: 12,
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'left',
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerSafeArea: {
        backgroundColor: '#FAFAFA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    content: {
        padding: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'left',
        marginBottom: 24,
        lineHeight: 24,
    },
    loadingContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: '#4B5563',
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
    },
    errorBanner: {
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        marginBottom: 16,
    },
    errorText: {
        color: '#1D4ED8',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    retryText: {
        marginLeft: 6,
        color: '#1D4ED8',
        fontSize: 14,
        fontWeight: '600',
    },
    fieldGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 10,
        lineHeight: 20,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    continueButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 3,
    },
    continueButtonDisabled: {
        opacity: 0.7,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingInline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingSpinner: {
        marginRight: 8,
    },
});
