import React, { useReducer, useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { theme } from "@/styles/theme";
import { NouraButton, NouraImage } from "@/lib/components";
import { usePasswordVisibility } from "@/lib/hooks";
import { useAuth } from "@/lib/utils/auth-context";
import { AuthRepo } from "@/repo";
import { Auths } from "@/repo/auths";

// -------------------------------
// Form + State Management
// -------------------------------

type LoginState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Auths.Token };

type FormFields = {
    email: string;
    password: string;
};

const initialFormState: FormFields = {
    email: "",
    password: "",
};

function formReducer(state: FormFields, action: { name: keyof FormFields; value: string }) {
    return {
        ...state,
        [action.name]: action.value,
    };
}

// -------------------------------
// Component
// -------------------------------

function LoginScreen() {
    const { visible, toggleVisibility } = usePasswordVisibility();
    const { login } = useAuth();

    const [formState, dispatch] = useReducer(formReducer, initialFormState);
    const [loginState, setLoginState] = useState<LoginState>({ status: "idle" });

    const handleChange = (name: keyof FormFields, value: string) => {
        dispatch({ name, value });
    };

    const handleLogin = async () => {
        setLoginState({ status: "loading" });

        const { email, password } = formState;

        if (!email.trim() || !password.trim()) {
            setLoginState({ status: "error", error: "Required field missing" });
            return;
        }

        try {
            const formData = new FormData();
            formData.append("email", email);
            formData.append("password", password);

            const result = await AuthRepo.AuthenticateUser(formData);

            if (!result.success) {
                setLoginState({
                    status: "error",
                    error: typeof result.errors === "string" ? result.errors : "Login failed",
                });
                return;
            }

            setLoginState({ status: "success", data: result.data });

            await login(result.data.access_token, result.data.refresh_token);
        } catch (error) {
            console.error("Login error:", error);
            setLoginState({
                status: "error",
                error:
                    error instanceof Error
                        ? error.message
                        : "Network error. Please check your connection and try again.",
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.formContainer}>
                    <NouraImage
                        source={require("../../assets/icon.png")}
                        style={styles.logo}
                        containerStyle={styles.logoContainer}
                        resizeMode="contain"
                        borderRadius={0}
                        showLoadingIndicator={false}
                    />

                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formState.email}
                            onChangeText={(text) => handleChange("email", text)}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordInputContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                secureTextEntry={!visible}
                                value={formState.password}
                                onChangeText={(text) => handleChange("password", text)}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={toggleVisibility}
                                activeOpacity={0.7}
                            >
                                <Feather
                                    name={visible ? "eye-off" : "eye"}
                                    size={20}
                                    color={theme.colorGrey}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loginState.status === "error" && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{loginState.error}</Text>
                        </View>
                    )}

                    <Text style={styles.forgotPassword}>Forgot Password?</Text>

                    <NouraButton
                        title={loginState.status === "loading" ? "Signing In..." : "Sign In"}
                        onPress={handleLogin}
                        loading={loginState.status === "loading"}
                        disabled={loginState.status === "loading"}
                        style={styles.button}
                    />

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don&apos;t have an account? </Text>
                        <Link href="/register-user" style={styles.signupLink}>
                            <Text style={styles.signupLinkText}>Sign Up</Text>
                        </Link>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export default LoginScreen;

// -------------------------------
// Styles
// -------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    keyboardContainer: {
        flex: 1,
    },
    formContainer: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 20,
    },
    logo: {
        width: 80,
        height: 80,
        alignSelf: "center",
        marginBottom: 32,
    },
    logoContainer: {
        backgroundColor: "transparent",
        width: 80,
        height: 80,
        alignSelf: "center",
        marginBottom: 32,
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
    passwordInputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingRight: 50, // Make room for the eye icon
        fontSize: 16,
        backgroundColor: theme.colorWhite,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    errorContainer: {
        marginVertical: 16,
        backgroundColor: '#ffebee',
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '500',
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