import { Tabs } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import { View } from "react-native";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";

function AppLayout() {
    const backgroundColor = useThemeColor({}, 'background');
    const cardColor = useThemeColor({}, 'card');

    return (
        <View style={{ flex: 1, backgroundColor }}>
            <Tabs screenOptions={{
                tabBarStyle: { backgroundColor: cardColor },
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
                    name="availability"
                    options={{
                        title: "Availability",
                        headerShown: false,
                        tabBarIcon: ({ size, color }) => (
                            <Feather name="clock" size={size} color={color} />
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
                    name="calview"
                    options={{
                        title: "Calendar View",
                        headerShown: false,
                        tabBarIcon: ({ size, color }) => (
                            <Feather name="calendar" size={size} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </View>
    );
}

export default AppLayout;