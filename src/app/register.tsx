import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from "react-native";
import { Link, router } from "expo-router";

import { theme } from "@/styles/theme";
import { NouraButton } from "@/lib/components";




export default function RegisterScreen() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long");
            return;
        }

        setIsLoading(true);
        try {
            // Call the API route
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });

            const data = await response.json();

            if (data.success) {
                // TODO: Store token securely (AsyncStorage or SecureStore)
                console.log("Registration successful:", data.user);
                Alert.alert("Success", data.message, [
                    {
                        text: "OK",
                        onPress: () => router.replace("/(tabs)"),
                    },
                ]);
            } else {
                Alert.alert("Error", data.error || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Registration error:", error);
            Alert.alert("Error", "Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }; return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to get started</Text>

                    <View style={styles.nameContainer}>
                        <View style={[styles.inputContainer, styles.nameInput]}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="First name"
                                placeholderTextColor={theme.colorGrey}
                                autoCapitalize="words"
                                autoComplete="given-name"
                            />
                        </View>

                        <View style={[styles.inputContainer, styles.nameInput]}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Last name"
                                placeholderTextColor={theme.colorGrey}
                                autoCapitalize="words"
                                autoComplete="family-name"
                            />
                        </View>
                    </View>

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
                            placeholder="Create a password"
                            placeholderTextColor={theme.colorGrey}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm your password"
                            placeholderTextColor={theme.colorGrey}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                    </View>

                    <NouraButton
                        title={isLoading ? "Creating Account..." : "Create Account"}
                        onPress={handleRegister}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.button}
                    />

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <Link href="/login" style={styles.loginLink}>
                            <Text style={styles.loginLinkText}>Sign In</Text>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    formContainer: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 20,
        minHeight: "100%",
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
    nameContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    nameInput: {
        flex: 1,
        marginBottom: 0,
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
        marginRight: 8,
    },
    button: {
        marginBottom: 24,
        marginTop: 8,
    },
    loginContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    loginText: {
        fontSize: 14,
        color: theme.colorGrey,
    },
    loginLink: {
        marginLeft: 4,
    },
    loginLinkText: {
        fontSize: 14,
        color: theme.colorDeepSkyBlue,
        fontWeight: "600",
    },
});
