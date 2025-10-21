import { Stack } from "expo-router";
import { View } from "react-native";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";

export default function AuthLayout() {
    const backgroundColor = useThemeColor({}, 'background');

    return (
        <View style={{ flex: 1, backgroundColor }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor }
                }}
            >
                <Stack.Screen name="login-user" />
                <Stack.Screen name="register-user" />
            </Stack>
        </View>
    );
}