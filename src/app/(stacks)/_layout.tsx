import { Stack } from "expo-router";
import { View } from "react-native";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";

export default function StacksLayout() {
    const backgroundColor = useThemeColor({}, 'background');

    return (
        <View style={{ flex: 1, backgroundColor }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor }
                }}
            >
                <Stack.Screen name="create-meeting" />
                <Stack.Screen name="profile-settings" />
                <Stack.Screen name="meeting-details/[id]" />
                <Stack.Screen name="follow-details" />
                <Stack.Screen name="[account]" />
            </Stack>
        </View>
    );
}
