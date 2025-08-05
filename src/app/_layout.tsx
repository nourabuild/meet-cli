import { store } from "@/stores";
import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import React from 'react';
import { StatusBar } from "expo-status-bar";

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/utils/auth-context';

export { ErrorBoundary } from "expo-router";

function AuthLayout() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated === null) return null;

    return (
        <React.Fragment>
            <StatusBar style="auto" />
            <Stack>
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen name="login-user"
                        options={{
                            headerShown: false
                        }} />
                    <Stack.Screen name="register-user" options={{ headerShown: false }} />
                </Stack.Protected>

                <Stack.Protected guard={isAuthenticated}>
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false, animation: "fade" }}
                    />
                    <Stack.Screen
                        name="create-meeting"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="profile-settings"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="meeting-details/[id]"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="follow-details"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="[account]"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="+not-found"
                        options={{ headerShown: false }}
                    />
                </Stack.Protected>
            </Stack>
        </React.Fragment>
    );
}

export default function AuthRoot() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <AuthProvider>
                    <AuthLayout />
                </AuthProvider>
            </SafeAreaProvider>
        </Provider>
    );
}



// import { store } from "@/stores";
// import { Stack } from "expo-router";
// import { Provider } from 'react-redux';
// import { useEffect, useRef } from 'react';
// import { useReduxDispatch, useReduxSelector } from "@/lib/hooks";
// import { UserRepo } from "@/repo";
// import { setSession } from "@/stores/user-slice";
// import * as SecureStore from 'expo-secure-store';
// import { SafeAreaProvider } from 'react-native-safe-area-context';


// export { ErrorBoundary } from "expo-router";

// function AuthLayout() {
//     const dispatch = useReduxDispatch();
//     const user = useReduxSelector((state) => state.user);
//     const authenticated = !!user;
//     const hasCheckedAuth = useRef(false);

//     useEffect(() => {
//         // Only run auto-authentication once on app start
//         if (hasCheckedAuth.current) return;

//         hasCheckedAuth.current = true;

//         // Auto-authenticate on app start if we have a stored token
//         const checkAuth = async () => {
//             try {
//                 const token = await SecureStore.getItemAsync('access_token');

//                 // Only auto-authenticate if we have a token and no user data
//                 if (token && !user) {
//                     console.log('Auto-authenticating with stored token...');
//                     const res = await UserRepo.WhoAmI(token);

//                     if (res.success) {
//                         console.log('Auto-authentication successful');
//                         dispatch(setSession(res.data));
//                     } else {
//                         console.log('Stored token is invalid, clearing tokens');
//                         // Token is invalid, clear it
//                         await SecureStore.deleteItemAsync('access_token');
//                         await SecureStore.deleteItemAsync('refresh_token');
//                     }
//                 } else if (!token) {
//                     console.log('No stored token found, user needs to login');
//                 }
//             } catch (error) {
//                 console.error('Auth check failed:', error);
//                 // Clear tokens on error
//                 await SecureStore.deleteItemAsync('access_token');
//                 await SecureStore.deleteItemAsync('refresh_token');
//             }
//         };

//         checkAuth();
//     }, [dispatch, user]);

//     return (
//         <Stack>
//             <Stack.Protected guard={!authenticated}>
//                 <Stack.Screen name="login-user" options={{ headerShown: false }} />
//                 <Stack.Screen name="register-user" options={{ headerShown: false }} />
//             </Stack.Protected>

//             <Stack.Protected guard={authenticated}>
//                 <Stack.Screen
//                     name="(tabs)"
//                     options={{ headerShown: false, animation: "fade" }}
//                 />

//                 <Stack.Screen
//                     name="create-meeting"
//                     options={{
//                         presentation: "modal",
//                         headerShown: false,
//                     }}
//                 />

//                 <Stack.Screen
//                     name="show-meeting"
//                     options={{
//                         presentation: "modal",
//                         headerShown: false,
//                     }}
//                 />
//                 <Stack.Screen
//                     name="show-user-settings"
//                     options={{
//                         title: "Settings",
//                         headerShown: false,
//                     }}
//                 />

//             </Stack.Protected>
//         </Stack>
//     );
// }

// export default function AuthRoot() {
//     return (
//         <Provider store={store}>
//             <SafeAreaProvider>
//                 <AuthLayout />
//             </SafeAreaProvider>
//         </Provider>
//     );
// }

//  <Tabs.Screen
//             name="settings"
//             options={{
//                 title: "Settings",
//                 headerShown: false,
//                 tabBarIcon: ({ size, color }) => (
//                     <Feather name="settings" size={size} color={color} />
//                 ),
//             }}
//         />