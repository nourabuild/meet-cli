import { Stack } from "expo-router";

export default function OnboardingLayout() {
    return (
        <Stack>
            <Stack.Screen name="calendar" options={{ headerShown: false }} />
        </Stack>
    );
}