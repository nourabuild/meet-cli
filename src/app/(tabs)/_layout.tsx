import { Tabs } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function AppLayout() {
    return (
        <Tabs screenOptions={{
            tabBarStyle: { backgroundColor: '#fff' },
            headerShown: false,
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    headerShown: false,
                    tabBarIcon: ({ size, color }) => (
                        <Feather name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="requests"
                options={{
                    title: "Requests",
                    headerShown: false,
                    tabBarIcon: ({ size, color }) => (
                        <Feather name="file-text" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Notifications",
                    headerShown: false,
                    tabBarIcon: ({ size, color }) => (
                        <Feather name="bell" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    headerShown: false,
                    tabBarIcon: ({ size, color }) => (
                        <Feather name="user" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="experimental"
                options={{
                    title: "Experimental",
                    headerShown: false,
                    tabBarIcon: ({ size, color }) => (
                        <Feather name="settings" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

export default function AppRoot() {
    return (
        <SafeAreaProvider>
            <AppLayout />
        </SafeAreaProvider>
    );
}