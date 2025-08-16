import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useReduxSelector, useReduxDispatch } from '@/lib/hooks';
import { setSession, logout as logoutAction } from '@/stores/user-slice';
import { CalendarRepo, UserRepo } from '@/repo';

type AuthState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "authenticated"; hasCompletedOnboarding: boolean }
    | { status: "unauthenticated" }
    | { status: "error"; error: string };

interface AuthContextType {
    authState: AuthState;
    login: (token: string, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    checkOnboardingStatus: () => Promise<void>;
    isAuthenticated: boolean;
    hasCompletedOnboarding: boolean | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({ status: "idle" });
    const user = useReduxSelector((state) => state.user);
    const dispatch = useReduxDispatch();

    // Computed values for backward compatibility
    const isAuthenticated = authState.status === "authenticated";
    const hasCompletedOnboarding = authState.status === "authenticated" ? authState.hasCompletedOnboarding : null;

    const checkAuth = useCallback(async () => {
        setAuthState({ status: "loading" });
        try {
            const token = await SecureStore.getItemAsync('access_token');
            // Check both token existence AND Redux user state
            const hasAuth = !!(token && user);

            if (hasAuth) {
                // Check onboarding status when authenticated
                const onboardingResult = await CalendarRepo.GetOnboardingStatus(token);
                const hasCompletedOnboarding = onboardingResult.success ? (onboardingResult.data.completed || false) : false;

                setAuthState({
                    status: "authenticated",
                    hasCompletedOnboarding
                });
            } else {
                setAuthState({ status: "unauthenticated" });
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            setAuthState({
                status: "error",
                error: error instanceof Error ? error.message : "Authentication check failed"
            });
        }
    }, [user]);

    const checkOnboardingStatus = useCallback(async () => {
        if (authState.status !== "authenticated") return;

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setAuthState({ status: "unauthenticated" });
                return;
            }

            const result = await CalendarRepo.GetOnboardingStatus(token);
            if (result.success) {
                setAuthState({
                    status: "authenticated",
                    hasCompletedOnboarding: result.data.completed || false
                });
            } else {
                setAuthState({
                    status: "error",
                    error: "Failed to fetch onboarding status"
                });
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            setAuthState({
                status: "error",
                error: error instanceof Error ? error.message : "Onboarding status check failed"
            });
        }
    }, [authState.status]);

    const login = async (token: string, refreshToken?: string) => {
        setAuthState({ status: "loading" });

        try {
            // Store tokens securely
            await SecureStore.setItemAsync('access_token', token);
            if (refreshToken) {
                await SecureStore.setItemAsync('refresh_token', refreshToken);
            }

            // Fetch user data and store in Redux
            try {
                const userResult = await UserRepo.WhoAmI(token);
                if (userResult.success) {
                    dispatch(setSession(userResult.data));

                    // Check onboarding status
                    const onboardingResult = await CalendarRepo.GetOnboardingStatus(token);
                    const hasCompletedOnboarding = onboardingResult.success ? (onboardingResult.data.completed || false) : false;

                    setAuthState({
                        status: "authenticated",
                        hasCompletedOnboarding
                    });
                } else {
                    console.log('User fetch failed during login:', userResult.errors);
                    throw new Error('Failed to fetch user data');
                }
            } catch (userError) {
                console.error('User fetch error during login:', userError);
                // Clear tokens if user fetch fails
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                setAuthState({
                    status: "error",
                    error: userError instanceof Error ? userError.message : "Login failed"
                });
                throw userError;
            }
        } catch (error) {
            console.error('Error during login:', error);
            setAuthState({
                status: "error",
                error: error instanceof Error ? error.message : "Login failed"
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Clear Redux state first
            dispatch(logoutAction());

            // Clear stored tokens
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');

            // Set auth state to unauthenticated
            setAuthState({ status: "unauthenticated" });
        } catch (error) {
            console.error('Error during logout:', error);
            // Still clear state even if SecureStore fails
            dispatch(logoutAction());
            setAuthState({ status: "unauthenticated" });
        }
    };

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Re-check auth only when user state becomes available after login
    useEffect(() => {
        // Only re-check if we have a user but auth state isn't authenticated yet
        if (user && authState.status !== "authenticated") {
            checkAuth();
        }
    }, [user, authState.status, checkAuth]);

    return (
        <AuthContext.Provider value={{
            authState,
            isAuthenticated,
            hasCompletedOnboarding,
            login,
            logout,
            checkAuth,
            checkOnboardingStatus
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
