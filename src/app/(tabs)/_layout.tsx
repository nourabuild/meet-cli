import { router, Tabs } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import { Text, View, TouchableOpacity, Alert } from "react-native";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";
import { useReduxSelector } from "@/lib/hooks";
import Ionicons from '@expo/vector-icons/Ionicons';

function AppLayout() {
    const backgroundColor = useThemeColor({}, 'background');
    const cardColor = useThemeColor({}, 'card');
    const textColor = useThemeColor({}, 'text');
    const currentUser = useReduxSelector((state) => state.user?.user);


    return (
        <View style={{ flex: 1, backgroundColor }}>
            <Tabs screenOptions={{
                tabBarStyle: { backgroundColor: cardColor },
                headerShown: true,
                headerTitle: "",
                headerShadowVisible: false,
            }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({ size, color }) => (
                            <Feather name="home" size={size} color={color} />
                        ),
                        headerLeft: () =>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: '500',
                                    marginLeft: 20,
                                    color: textColor,
                                }}>
                                Upcoming
                            </Text>,
                        headerRight: () =>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
                                <TouchableOpacity
                                    accessibilityLabel="Open Noura AI assistant"
                                    onPress={() => {
                                        Alert.alert(
                                            "Noura AI",
                                            "This feature will connect you with the Noura AI assistant soon."
                                        );
                                    }}
                                    style={{ padding: 4, marginRight: 12 }}
                                >
                                    <Ionicons name="sparkles-outline" size={24} color={textColor} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    accessibilityLabel="Create a new meeting"
                                    onPress={() => {
                                        router.push('/create-meeting');
                                    }}
                                    style={{ padding: 4 }}
                                >
                                    <Feather name="plus" size={24} color={textColor} />
                                </TouchableOpacity>
                            </View>,
                    }}
                />
                <Tabs.Screen
                    name="requests"
                    options={{
                        title: "Requests",
                        tabBarIcon: ({ size, color }) => (
                            <Feather name="file-text" size={size} color={color} />
                        ),
                        headerLeft: () =>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: '500',
                                    marginLeft: 20,
                                    color: textColor,
                                }}>
                                Requests
                            </Text>,
                    }}
                />
                <Tabs.Screen
                    name="availability"
                    options={{
                        title: "Availability",
                        tabBarIcon: ({ size, color }) => (
                            <Feather name="clock" size={size} color={color} />
                        ),
                        headerLeft: () =>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: '500',
                                    marginLeft: 20,
                                    color: textColor,
                                }}>
                                Availability
                            </Text>,
                    }}
                />


                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "Profile",
                        tabBarIcon: ({ size, color }) => (
                            <Feather name="user" size={size} color={color} />
                        ),
                        headerLeft: () =>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: '500',
                                    marginLeft: 20,
                                    color: textColor,
                                }}>
                                {currentUser?.account}
                            </Text>,
                        headerRight: () =>
                            <Feather
                                name="settings"
                                size={24}
                                style={{
                                    marginRight: 20,
                                    color: textColor,
                                }}
                                color={textColor}
                                onPress={() => {
                                    router.push('/show-settings');
                                }}
                            />,
                    }}
                />
            </Tabs>
        </View>
    );
}

//  <TouchableOpacity
//                         onPress={() => router.push('/show-settings')}
//                     >
//                         <Feather name="settings" size={24} color={textColor} />
//                     </TouchableOpacity>

export default AppLayout;
