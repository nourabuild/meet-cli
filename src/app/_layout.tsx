import { store } from "@/stores";
import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import React from 'react';
import { StatusBar } from "expo-status-bar";

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/utils/auth-context';
import SafeAreaContainer from '@/lib/utils/safe-area-container';
import { useTheme } from '@/lib/hooks/theme/useTheme';
import ThemeProvider from "@/lib/utils/theme-provider";

export { ErrorBoundary } from "expo-router";

function AuthLayout() {
    const { isAuthenticated, hasCompletedOnboarding } = useAuth();
    const { statusBarStyle, statusBarBackgroundColor } = useTheme();

    if (isAuthenticated === null) return null;

    return (
        <SafeAreaContainer
            edges={['top']}
            backgroundColor={statusBarBackgroundColor}
        >
            <StatusBar style={statusBarStyle} backgroundColor={statusBarBackgroundColor} />

            <Stack>
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen
                        name="login-user"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="register-user"
                        options={{ headerShown: false }}
                    />
                </Stack.Protected>

                {/* <Stack.Protected guard={isAuthenticated && !hasCompletedOnboarding}> */}
                <Stack.Protected guard={!hasCompletedOnboarding}>
                    <Stack.Screen
                        name="onboarding-user"
                        options={{ headerShown: false }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={!!isAuthenticated && !!hasCompletedOnboarding}>
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false, animation: "fade" }}
                    />
                    <Stack.Screen
                        name="(stacks)"
                        options={{ headerShown: false }}
                    />
                </Stack.Protected>

                <Stack.Screen
                    name="+not-found"
                    options={{ headerShown: false }}
                />
            </Stack>
        </SafeAreaContainer>
    );
}

export default function AuthRoot() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <AuthLayout />
                    </ThemeProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </Provider>
    );
}
