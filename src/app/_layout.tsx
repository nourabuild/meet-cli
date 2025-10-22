import { store } from "@/stores";
import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import React from 'react';
import { StatusBar } from "expo-status-bar";
import { Text } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/utils/auth-context';
import SafeAreaContainer from '@/lib/utils/safe-area-container';
import { useTheme } from '@/lib/hooks/theme/useTheme';
import ThemeProvider from "@/lib/utils/theme-provider";

// import Personal from "@/screens/Settings/Personal";

export { ErrorBoundary } from "expo-router";

function RootLayout() {
    const { isAuthenticated, hasCompletedOnboarding } = useAuth();
    const { statusBarStyle, statusBarBackgroundColor } = useTheme();

    if (isAuthenticated === null) return null;

    return (
        <React.Fragment>
            <SafeAreaContainer edges={[]} backgroundColor={statusBarBackgroundColor}>
                <StatusBar style={statusBarStyle} backgroundColor={statusBarBackgroundColor} />

                <Stack>
                    <Stack.Protected guard={!isAuthenticated}>
                        <Stack.Screen name="login-user" options={{
                            headerShown: false
                        }}
                        />
                        <Stack.Screen name="register-user"
                            options={{
                                headerShown: false
                            }}
                        />
                    </Stack.Protected>

                    <Stack.Protected guard={isAuthenticated && !hasCompletedOnboarding}>
                        <Stack.Screen name="onboard-user" options={{ animation: "fade" }} />
                    </Stack.Protected>

                    <Stack.Protected guard={!!isAuthenticated && !!hasCompletedOnboarding}>
                        {/* Tabs */}
                        <Stack.Screen name="(tabs)" options={{
                            headerShown: false,
                            animation: "fade"
                        }} />

                        {/* Stacks */}
                        <Stack.Screen name="create-meeting" options={{
                            headerShown: true,
                            headerTitle: "New Meeting",
                            headerBackButtonDisplayMode: "minimal",
                        }} />

                        <Stack.Screen name="show-follow" options={{
                            headerShown: true,
                            headerTitle: "Connections",
                            headerBackButtonDisplayMode: "minimal",
                        }} />

                        <Stack.Screen name="show-meeting/[id]" options={{
                            headerShown: true,
                            headerTitle: "Meeting",
                            headerBackButtonDisplayMode: "minimal",
                            headerRight: () =>
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: '500',
                                        marginLeft: 20
                                    }}>
                                    Edit
                                </Text>,
                        }} />

                        <Stack.Screen
                            name="show-user/[account]"
                            options={{
                                headerTitle: 'Profile',
                                headerBackButtonDisplayMode: 'minimal',
                                headerShown: true,
                                headerShadowVisible: true,
                            }}
                        />

                        {/* ---- */}

                        <Stack.Screen name="show-settings/index"
                            options={{
                                headerShown: true,
                                headerTitle: "Settings",
                                headerBackButtonDisplayMode: "minimal",
                            }}
                        />

                        <Stack.Screen name="show-settings/personal"
                            options={{
                                headerTitle: 'Personal',
                                headerBackButtonDisplayMode: 'minimal',
                                headerShown: true,
                                headerShadowVisible: true,
                            }}
                        />

                        <Stack.Screen name="show-settings/preferences"
                            options={{
                                headerTitle: 'Preferences',
                                headerBackButtonDisplayMode: 'minimal',
                                headerShown: true,
                                headerShadowVisible: true,
                            }}
                        />

                    </Stack.Protected>

                    <Stack.Screen name="+not-found" />
                </Stack>
            </SafeAreaContainer>
        </React.Fragment>
    );
}

export default function AuthRoot() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <RootLayout />
                    </ThemeProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </Provider>
    );
}
