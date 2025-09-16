import React, { createContext, useContext, useEffect, useReducer, ReactNode, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReduxSelector, useReduxDispatch } from '@/lib/hooks';
import { setSession, logout as logoutAction } from '@/stores/user-slice';
import { CalendarRepo, UserRepo } from '@/repo';
import { createAction } from '@reduxjs/toolkit';
import { REMEMBER_PERSISTED } from 'redux-remember';

/* ----------------- State & Actions ----------------- */

type AuthState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "authenticated"; hasCompletedOnboarding: boolean }
    | { status: "unauthenticated" }
    | { status: "error"; error: string };

type AuthAction =
    | { type: "SET_IDLE" }
    | { type: "SET_LOADING" }
    | { type: "SET_AUTHENTICATED"; hasCompletedOnboarding: boolean }
    | { type: "SET_UNAUTHENTICATED" }
    | { type: "SET_ERROR"; error: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case "SET_IDLE":
            return { status: "idle" };
        case "SET_LOADING":
            return { status: "loading" };
        case "SET_AUTHENTICATED":
            return { status: "authenticated", hasCompletedOnboarding: action.hasCompletedOnboarding };
        case "SET_UNAUTHENTICATED":
            return { status: "unauthenticated" };
        case "SET_ERROR":
            return { status: "error", error: action.error };
        default:
            return state;
    }
}

/* ----------------- Context ----------------- */

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
    const [authState, dispatchAuth] = useReducer(authReducer, { status: "idle" });
    const userSlice = useReduxSelector((state) => state.user);
    const user = userSlice?.user ?? null;
    const isPersisted = userSlice?.isPersisted ?? null;
    const isRehydrated = userSlice?.isRehydrated ?? null;
    console.log("[AuthProvider] Redux user slice:", userSlice);
    console.log("[AuthProvider] isRehydrated:", isRehydrated, "isPersisted:", isPersisted);
    // Use isPersisted and isRehydrated from userSlice
    const dispatch = useReduxDispatch();

    const isAuthenticated = authState.status === "authenticated";
    const hasCompletedOnboarding = authState.status === "authenticated" ? authState.hasCompletedOnboarding : null;

    /* ----------------- Functions ----------------- */

    const checkAuth = useCallback(async () => {
        dispatchAuth({ type: "SET_LOADING" });
        try {
            const token = await SecureStore.getItemAsync("access_token");
            const hasAuth = !!(token && user);

            if (hasAuth) {
                const onboardingResult = await CalendarRepo.GetOnboardingStatus(token);
                console.log("Onboarding status checked:", onboardingResult);
                if (onboardingResult.success) {
                    dispatchAuth({
                        type: "SET_AUTHENTICATED",
                        hasCompletedOnboarding: onboardingResult.data.completed,
                    });
                } else {
                    const errorMessage = onboardingResult.errors?.[0]?.error || "";
                    if (errorMessage.includes("COULD_NOT_VALIDATE_CREDENTIALS") || errorMessage.includes("credential")) {
                        await SecureStore.deleteItemAsync("access_token");
                        await SecureStore.deleteItemAsync("refresh_token");
                        dispatch(logoutAction());
                        dispatchAuth({ type: "SET_UNAUTHENTICATED" });
                    } else {
                        dispatchAuth({ type: "SET_AUTHENTICATED", hasCompletedOnboarding: false });
                    }
                }
            } else {
                dispatchAuth({ type: "SET_UNAUTHENTICATED" });
            }
        } catch (error) {
            console.error("Error checking auth:", error);
            dispatchAuth({
                type: "SET_ERROR",
                error: error instanceof Error ? error.message : "Authentication check failed",
            });
        }
    }, [user, dispatch]);

    const checkOnboardingStatus = useCallback(async () => {
        if (authState.status !== "authenticated") return;

        try {
            const token = await SecureStore.getItemAsync("access_token");
            if (!token) {
                dispatchAuth({ type: "SET_UNAUTHENTICATED" });
                return;
            }

            const result = await CalendarRepo.GetOnboardingStatus(token);
            if (result.success) {
                dispatchAuth({
                    type: "SET_AUTHENTICATED",
                    hasCompletedOnboarding: result.data.completed,
                });
            } else {
                dispatchAuth({ type: "SET_ERROR", error: "Failed to fetch onboarding status" });
            }
            console.log("Onboarding status checked:", result);
        } catch (error) {
            console.error("Error checking onboarding status:", error);
            dispatchAuth({
                type: "SET_ERROR",
                error: error instanceof Error ? error.message : "Onboarding status check failed",
            });
        }
    }, [authState.status]);

    const login = async (token: string, refreshToken?: string) => {
        dispatchAuth({ type: "SET_LOADING" });

        try {
            await SecureStore.setItemAsync("access_token", token);
            if (refreshToken) {
                await SecureStore.setItemAsync("refresh_token", refreshToken);
            }

            const userResult = await UserRepo.WhoAmI(token);
            if (userResult.success) {
                dispatch(setSession(userResult.data));

                // Manually trigger persistence action after a brief delay to ensure persistence completes
                setTimeout(() => {
                    dispatch(createAction(REMEMBER_PERSISTED)());
                    console.log("[login] Manually dispatched REMEMBER_PERSISTED action");
                }, 500);

                // Debug: inspect AsyncStorage for redux-remember persisted user after a brief delay
                setTimeout(async () => {
                    try {
                        const persistedUser = await AsyncStorage.getItem("user");
                        const allKeys = await AsyncStorage.getAllKeys();
                        console.log("[login] All AsyncStorage keys after delay:", allKeys);
                        console.log("[login] Persisted user in AsyncStorage after delay:", persistedUser);

                        // Check for the redux-remember key format
                        const rememberUserKey = await AsyncStorage.getItem("@@remember-user");
                        console.log("[login] Redux-remember user key after delay:", rememberUserKey);

                        // Parse the JSON to see the actual structure
                        if (rememberUserKey) {
                            try {
                                const parsed = JSON.parse(rememberUserKey);
                                console.log("[login] Parsed redux-remember data:", parsed);
                            } catch (e) {
                                console.log("[login] Failed to parse redux-remember data:", e);
                            }
                        }
                    } catch (err) {
                        console.warn("[login] Error reading persisted user from AsyncStorage:", err);
                    }
                }, 100);

                const onboardingResult = await CalendarRepo.GetOnboardingStatus(token);
                const hasCompletedOnboarding = onboardingResult.success
                    ? onboardingResult.data.completed || false
                    : false;

                dispatchAuth({ type: "SET_AUTHENTICATED", hasCompletedOnboarding });
            } else {
                throw new Error("Failed to fetch user data");
            }
        } catch (error) {
            console.error("Error during login:", error);
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");
            dispatchAuth({
                type: "SET_ERROR",
                error: error instanceof Error ? error.message : "Login failed",
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            dispatch(logoutAction());
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");
            dispatchAuth({ type: "SET_UNAUTHENTICATED" });
        } catch (error) {
            console.error("Error during logout:", error);
            dispatch(logoutAction());
            dispatchAuth({ type: "SET_UNAUTHENTICATED" });
        }
    };



    /* ----------------- Effects ----------------- */


    useEffect(() => {
        // Wait for redux-remember to finish rehydration before checking auth
        if (authState.status === "idle" && isRehydrated === true) {
            checkAuth();
        }
    }, [checkAuth, authState.status, isRehydrated]);

    /* ----------------- Provider ----------------- */

    // Show a minimal splash while rehydrating on first launch
    if (isRehydrated !== true) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#00a3ff" />
            </View>
        );
    }

    return (
        <AuthContext.Provider
            value={{
                authState,
                isAuthenticated,
                hasCompletedOnboarding,
                login,
                logout,
                checkAuth,
                checkOnboardingStatus,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}



// ---

// import React, { createContext, useContext, useEffect, useReducer, ReactNode, useCallback } from 'react';
// import { ActivityIndicator, View } from 'react-native';
// import * as SecureStore from 'expo-secure-store';
// import { useReduxSelector, useReduxDispatch } from '@/lib/hooks';
// import { setSession, logout as logoutAction } from '@/stores/user-slice';
// import { CalendarRepo, UserRepo } from '@/repo';

// /* ----------------- State & Actions ----------------- */

// type AuthState =
//     | { status: "idle" }
//     | { status: "loading" }
//     | { status: "authenticated"; hasCompletedOnboarding: boolean }
//     | { status: "unauthenticated" }
//     | { status: "error"; error: string };

// type AuthAction =
//     | { type: "SET_IDLE" }
//     | { type: "SET_LOADING" }
//     | { type: "SET_AUTHENTICATED"; hasCompletedOnboarding: boolean }
//     | { type: "SET_UNAUTHENTICATED" }
//     | { type: "SET_ERROR"; error: string };

// function authReducer(state: AuthState, action: AuthAction): AuthState {
//     switch (action.type) {
//         case "SET_IDLE":
//             return { status: "idle" };
//         case "SET_LOADING":
//             return { status: "loading" };
//         case "SET_AUTHENTICATED":
//             return { status: "authenticated", hasCompletedOnboarding: action.hasCompletedOnboarding };
//         case "SET_UNAUTHENTICATED":
//             return { status: "unauthenticated" };
//         case "SET_ERROR":
//             return { status: "error", error: action.error };
//         default:
//             return state;
//     }
// }

// /* ----------------- Context ----------------- */

// interface AuthContextType {
//     authState: AuthState;
//     login: (token: string, refreshToken?: string) => Promise<void>;
//     logout: () => Promise<void>;
//     checkAuth: () => Promise<void>;
//     checkOnboardingStatus: () => Promise<void>;
//     isAuthenticated: boolean;
//     hasCompletedOnboarding: boolean | null;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// interface AuthProviderProps {
//     children: ReactNode;
// }

// const [authState, dispatchAuth] = useReducer(authReducer, { status: "idle" });
// const user = useReduxSelector((state) => state.user);
// const isPersisted = useReduxSelector((state) => state.user.isPersisted);
// const isRehydrated = useReduxSelector((state) => state.user.isRehydrated);
// const dispatch = useReduxDispatch();

// const isAuthenticated = authState.status === "authenticated";
// const hasCompletedOnboarding = authState.status === "authenticated" ? authState.hasCompletedOnboarding : null;

// /* ----------------- Functions ----------------- */

// const checkAuth = useCallback(async () => {
//     dispatchAuth({ type: "SET_LOADING" });
//     try {
//         const token = await SecureStore.getItemAsync("access_token");
//         const hasAuth = !!(token && user);

//         if (hasAuth) {
//             const onboardingResult = await CalendarRepo.GetOnboardingStatus(token);
//             console.log("Onboarding status checked:", onboardingResult);
//             if (onboardingResult.success) {
//                 dispatchAuth({
//                     type: "SET_AUTHENTICATED",
//                     hasCompletedOnboarding: onboardingResult.data.completed,
//                 });
//             } else {
//                 const errorMessage = onboardingResult.errors?.[0]?.error || "";
//                 if (errorMessage.includes("COULD_NOT_VALIDATE_CREDENTIALS") || errorMessage.includes("credential")) {
//                     await SecureStore.deleteItemAsync("access_token");
//                     await SecureStore.deleteItemAsync("refresh_token");
//                     dispatch(logoutAction());
//                     dispatchAuth({ type: "SET_UNAUTHENTICATED" });
//                 } else {
//                     dispatchAuth({ type: "SET_AUTHENTICATED", hasCompletedOnboarding: false });
//                 }
//             }
//         } else {
//             dispatchAuth({ type: "SET_UNAUTHENTICATED" });
//         }
//     } catch (error) {
//         console.error("Error checking auth:", error);
//         dispatchAuth({
//             type: "SET_ERROR",
//             error: error instanceof Error ? error.message : "Authentication check failed",
//         });
//     }
// }, [user, dispatch]);

// const checkOnboardingStatus = useCallback(async () => {
//     if (authState.status !== "authenticated") return;

//     try {
//         const token = await SecureStore.getItemAsync("access_token");
//         if (!token) {
//             dispatchAuth({ type: "SET_UNAUTHENTICATED" });
//             return;
//         }

//         const result = await CalendarRepo.GetOnboardingStatus(token);
//         if (result.success) {
//             dispatchAuth({
//                 type: "SET_AUTHENTICATED",
//                 hasCompletedOnboarding: result.data.completed,
//             });
//         } else {
//             dispatchAuth({ type: "SET_ERROR", error: "Failed to fetch onboarding status" });
//         }
//         console.log("Onboarding status checked:", result);
//     } catch (error) {
//         console.error("Error checking onboarding status:", error);
//         dispatchAuth({
//             type: "SET_ERROR",
//             error: error instanceof Error ? error.message : "Onboarding status check failed",
//         });
//     }
// }, [authState.status]);

// const login = async (token: string, refreshToken?: string) => {
//     dispatchAuth({ type: "SET_LOADING" });

//     try {
//         await SecureStore.setItemAsync("access_token", token);
//         if (refreshToken) {
//             await SecureStore.setItemAsync("refresh_token", refreshToken);
//         }

//         const userResult = await UserRepo.WhoAmI(token);
//         if (userResult.success) {
//             dispatch(setSession(userResult.data));

//             const onboardingResult = await CalendarRepo.GetOnboardingStatus(token);
//             const hasCompletedOnboarding = onboardingResult.success
//                 ? onboardingResult.data.completed || false
//                 : false;

//             dispatchAuth({ type: "SET_AUTHENTICATED", hasCompletedOnboarding });
//         } else {
//             throw new Error("Failed to fetch user data");
//         }
//     } catch (error) {
//         console.error("Error during login:", error);
//         await SecureStore.deleteItemAsync("access_token");
//         await SecureStore.deleteItemAsync("refresh_token");
//         dispatchAuth({
//             type: "SET_ERROR",
//             error: error instanceof Error ? error.message : "Login failed",
//         });
//         throw error;
//     }
// };

// const logout = async () => {
//     try {
//         dispatch(logoutAction());
//         await SecureStore.deleteItemAsync("access_token");
//         await SecureStore.deleteItemAsync("refresh_token");
//         dispatchAuth({ type: "SET_UNAUTHENTICATED" });
//     } catch (error) {
//         console.error("Error during logout:", error);
//         dispatch(logoutAction());
//         dispatchAuth({ type: "SET_UNAUTHENTICATED" });
//     }
// };



// /* ----------------- Effects ----------------- */

// useEffect(() => {
//     // Only run checkAuth after Redux rehydration is complete
//     if (authState.status === "idle" && isRehydrated) {
//         checkAuth();
//     }
// }, [checkAuth, authState.status, isRehydrated]);

// /* ----------------- Provider ----------------- */

// // Show loading spinner while rehydrating
// if (!isRehydrated) {
//     return (
//         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//             <ActivityIndicator size="large" color="#00a3ff" />
//         </View>
//     );
// }


// return (
//     <AuthContext.Provider
//         value={{
//             authState,
//             isAuthenticated,
//             hasCompletedOnboarding,
//             login,
//             logout,
//             checkAuth,
//             checkOnboardingStatus,
//         }}
//     >
//         {children}
//     </AuthContext.Provider>
// );


// export function useAuth() {
//     const context = useContext(AuthContext);
//     if (context === undefined) {
//         throw new Error("useAuth must be used within an AuthProvider");
//     }
//     return context;
// }
