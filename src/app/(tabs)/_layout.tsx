import { Tabs } from "expo-router";
import Feather from '@expo/vector-icons/Feather';

export default function Layout() {
    return (
        <Tabs>
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

        </Tabs>
    );
}
