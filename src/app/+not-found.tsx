import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { theme } from '@/styles/theme';

export default function NotFoundScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Feather name="file" size={80} color={theme.colorGrey} />
                </View>

                <Text style={styles.title}>Page Not Found</Text>
                <Text style={styles.subtitle}>
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={() => router.replace('/(tabs)')}
                        activeOpacity={0.7}
                    >
                        <Feather name="home" size={20} color={theme.colorWhite} />
                        <Text style={styles.primaryButtonText}>Go Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Feather name="arrow-left" size={20} color={theme.colorNouraBlue} />
                        <Text style={styles.secondaryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colorBlack,
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 48,
    },
    buttonContainer: {
        gap: 16,
        width: '100%',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    primaryButton: {
        backgroundColor: theme.colorNouraBlue,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colorNouraBlue,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorWhite,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorNouraBlue,
    },
});
