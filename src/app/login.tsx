import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { Link, router } from "expo-router";

import { theme } from "@/styles/theme";
import { NouraButton } from "@/lib/components";


export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            // Call the API route
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                // TODO: Store token securely (AsyncStorage or SecureStore)
                console.log("Login successful:", data.user);

                // Navigate to main app on successful login
                router.replace("/(tabs)");
            } else {
                Alert.alert("Error", data.error || "Login failed. Please try again.");
            }
        } catch (error) {
            console.error("Login error:", error);
            Alert.alert("Error", "Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.formContainer}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email"
                        placeholderTextColor={theme.colorGrey}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor={theme.colorGrey}
                        secureTextEntry
                        autoComplete="password"
                    />
                </View>

                <Text style={styles.forgotPassword}>Forgot Password?</Text>

                <NouraButton
                    title={isLoading ? "Signing In..." : "Sign In"}
                    onPress={handleLogin}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.button}
                />

                <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Don&apos;t have an account? </Text>
                    <Link href="/register" style={styles.signupLink}>
                        <Text style={styles.signupLinkText}>Sign Up</Text>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    formContainer: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: theme.colorBlack,
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: "center",
        marginBottom: 40,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colorBlack,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: theme.colorWhite,
    },
    forgotPassword: {
        color: theme.colorDeepSkyBlue,
        fontSize: 14,
        textAlign: "right",
        marginBottom: 32,
    },
    button: {
        marginBottom: 24,
    },
    signupContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    signupText: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    signupLink: {
        marginLeft: 4,
    },
    signupLinkText: {
        fontSize: 14,
        color: theme.colorDeepSkyBlue,
        fontWeight: "600",
    },
});
