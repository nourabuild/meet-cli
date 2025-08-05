import { Stack } from "expo-router";
import React from "react";

export default function ProfileSettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="notifications"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
