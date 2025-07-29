import { Stack } from "expo-router";

export default function Layout() {


    const authenticated = false;

    return (
        <Stack>
            <Stack.Protected guard={!authenticated}>

                <Stack.Screen
                    name="login"
                    options={{
                        headerShown: false
                    }}
                />

                <Stack.Screen
                    name="register"
                    options={{
                        headerShown: false
                    }}
                />

            </Stack.Protected>

            <Stack.Protected guard={authenticated}>

                <Stack.Screen
                    name="(tabs)"
                    options={{
                        headerShown: false,
                        animation: "fade"
                    }}
                />

            </Stack.Protected>

        </Stack >
    );
}