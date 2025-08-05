import { Stack } from "expo-router";
import React from "react";

export default function FollowDetailsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="following"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="followers"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}