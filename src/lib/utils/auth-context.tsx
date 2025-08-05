import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useReduxSelector, useReduxDispatch } from '@/lib/hooks';
import { setSession, logout as logoutAction } from '@/stores/user-slice';
import { UserRepo } from '@/repo';

interface AuthContextType {
    isAuthenticated: boolean | null;
    login: (token: string, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const user = useReduxSelector((state) => state.user);
    const dispatch = useReduxDispatch();

    const checkAuth = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            // Check both token existence AND Redux user state
            const hasAuth = !!(token && user);
            setIsAuthenticated(hasAuth);
        } catch (error) {
            console.error('Error checking auth:', error);
            setIsAuthenticated(false);
        }
    }, [user]);

    const login = async (token: string, refreshToken?: string) => {
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
                    // Auth state will be updated by the useEffect that watches user state
                } else {
                    console.log('User fetch failed during login:', userResult.errors);
                    throw new Error('Failed to fetch user data');
                }
            } catch (userError) {
                console.error('User fetch error during login:', userError);
                // Clear tokens if user fetch fails
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                throw userError;
            }
        } catch (error) {
            console.error('Error during login:', error);
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

            // Set auth state to false
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error during logout:', error);
            // Still clear state even if SecureStore fails
            dispatch(logoutAction());
            setIsAuthenticated(false);
        }
    };

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Re-check auth whenever Redux user state changes
    useEffect(() => {
        checkAuth();
    }, [user, checkAuth]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, checkAuth }}>
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
