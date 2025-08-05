import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { theme } from '@/styles/theme';

export interface NouraTimePickerProps {
    /**
     * The current selected date
     */
    value: Date;

    /**
     * Whether the picker is visible
     */
    visible: boolean;

    /**
     * Callback when date changes in the picker
     */
    onChange: (event: any, selectedDate?: Date) => void;

    /**
     * Callback when user confirms the selection
     */
    onConfirm: () => void;

    /**
     * Callback when user cancels the selection
     */
    onCancel: () => void;

    /**
     * The minimum date that can be selected
     */
    minimumDate?: Date;

    /**
     * The maximum date that can be selected
     */
    maximumDate?: Date;

    /**
     * Custom title for the picker
     */
    title?: string;

    /**
     * Custom subtitle for the picker
     */
    subtitle?: string;
}

function NouraTimePicker({
    value,
    visible,
    onChange,
    onConfirm,
    onCancel,
    minimumDate,
    maximumDate,
    title = "Select Date & Time",
    subtitle
}: NouraTimePickerProps) {
    // Helper functions for formatting
    const formatDateShort = (date: Date) => {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        });
    };

    const formatTimeShort = (date: Date) => {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
        return date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimezoneInfo = () => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return timeZone;
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onCancel}
        >
            <BlurView intensity={50} style={styles.modalOverlay}>
                <View style={styles.backgroundOverlay} />
                <TouchableOpacity
                    style={styles.touchableOverlay}
                    activeOpacity={1}
                    onPress={onCancel}
                >
                    <View style={styles.modalContainer}>
                        {/* Main Modal Content */}
                        <TouchableOpacity
                            style={styles.modalContent}
                            activeOpacity={1}
                            onPress={() => { }} // Prevent modal from closing when tapping inside
                        >
                            {/* Drag Indicator */}
                            <View style={styles.dragIndicator} />

                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>{title}</Text>
                                <Text style={styles.pickerSubtitle}>
                                    {subtitle || `${formatDateShort(value)} • ${formatTimeShort(value)}`}
                                </Text>
                                <Text style={styles.pickerTimezone}>
                                    {getTimezoneInfo()}
                                </Text>
                            </View>

                            <View style={styles.pickerContainer}>
                                <DateTimePicker
                                    value={value}
                                    mode="datetime"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onChange}
                                    style={styles.dateTimePicker}
                                    locale={Intl.DateTimeFormat().resolvedOptions().locale}
                                    minimumDate={minimumDate}
                                    maximumDate={maximumDate}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Confirm Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.confirmButton,
                                pressed && styles.confirmButtonPressed
                            ]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmButtonText}>Confirm</Text>
                        </Pressable>

                        {/* Cancel Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.cancelButton,
                                pressed && styles.cancelButtonPressed
                            ]}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </TouchableOpacity>
            </BlurView>
        </Modal>
    );
}

export default NouraTimePicker;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backgroundOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    touchableOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        paddingBottom: 34, // Safe area padding for iOS
        paddingHorizontal: 16,
        gap: 12,
    },
    modalContent: {
        backgroundColor: theme.colorWhite,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 16,
        // Clean shadow without ring effect
        shadowColor: theme.colorBlack,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    dragIndicator: {
        width: 36,
        height: 4,
        backgroundColor: theme.colorLightGrey,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
        // Subtle ring effect
        shadowColor: 'rgba(135, 206, 235, 0.3)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 3,
        elevation: 2,
    },
    pickerHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 8,
    },
    pickerSubtitle: {
        fontSize: 16,
        color: theme.colorGrey,
        marginBottom: 4,
    },
    pickerTimezone: {
        fontSize: 14,
        color: theme.colorGrey,
        fontStyle: 'italic',
    },
    pickerContainer: {
        alignItems: 'center',
    },
    dateTimePicker: {
        width: '100%',
        height: 200,
    },
    confirmButton: {
        backgroundColor: theme.colorNouraBlue,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        // Clean shadow without ring effect
        shadowColor: theme.colorBlack,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    confirmButtonPressed: {
        backgroundColor: '#6ba3be', // 20% darker than colorNouraBlue
        // Slightly stronger shadow when pressed
        shadowOpacity: 0.15,
        elevation: 4,
    },
    confirmButtonText: {
        color: theme.colorWhite,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: theme.colorWhite,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        // Ring effect using colored shadow
        shadowColor: 'rgba(128, 128, 128, 0.4)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },
    cancelButtonPressed: {
        backgroundColor: theme.colorLightGrey, // Darker background when pressed
        // Stronger ring when pressed
        shadowColor: 'rgba(128, 128, 128, 0.6)',
        shadowRadius: 8,
        elevation: 6,
    },
    cancelButtonText: {
        color: theme.colorBlack,
        fontSize: 16,
        fontWeight: '500',
    },
});
