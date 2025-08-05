import React, { useReducer, useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { theme } from "@/styles/theme";
import { NouraButton, NouraImage } from "@/lib/components";
import { AuthRepo } from "@/repo";
import { usePasswordVisibility } from "@/lib/hooks";

// -------------------------------
// Form + State Management
// -------------------------------

type RegisterState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success" };

type FormFields = {
    firstName: string;
    lastName: string;
    account: string;
    email: string;
    password: string;
    confirmPassword: string;
};

const initialFormState: FormFields = {
    firstName: "",
    lastName: "",
    account: "",
    email: "",
    password: "",
    confirmPassword: "",
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

function RegisterScreen() {
    // Password visibility hooks
    const {
        visible: passwordVisible,
        toggleVisibility: togglePasswordVisibility
    } = usePasswordVisibility();
    const {
        visible: confirmPasswordVisible,
        toggleVisibility: toggleConfirmPasswordVisibility
    } = usePasswordVisibility();

    const [formState, dispatch] = useReducer(formReducer, initialFormState);
    const [registerState, setRegisterState] = useState<RegisterState>({ status: "idle" });

    const handleChange = (name: keyof FormFields, value: string) => {
        dispatch({ name, value });
    };

    const handleRegister = async () => {
        setRegisterState({ status: "loading" });

        const { firstName, lastName, account, email, password, confirmPassword } = formState;

        // Basic validation
        if (!firstName.trim() || !lastName.trim() || !account.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setRegisterState({ status: "error", error: "All fields are required" });
            return;
        }

        if (password !== confirmPassword) {
            setRegisterState({ status: "error", error: "Passwords don't match" });
            return;
        }

        try {
            // Create FormData with proper multipart structure
            const formData = new FormData();
            formData.append("name", `${firstName} ${lastName}`);
            formData.append("account", account);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("password_confirm", confirmPassword);

            const result = await AuthRepo.CreateUser(formData);

            if (!result.success) {
                setRegisterState({
                    status: "error",
                    error: typeof result.errors === "string" ? result.errors : "Registration failed",
                });
                return;
            }

            setRegisterState({ status: "success" });

            setTimeout(() => {
                router.replace("/login-user");
            }, 1500);
        } catch (error) {
            console.error("Registration error:", error);
            setRegisterState({
                status: "error",
                error:
                    error instanceof Error
                        ? error.message
                        : "Network error. Please check your connection and try again.",
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
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
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Sign up to get started</Text>

                        <View style={styles.nameContainer}>
                            <View style={[styles.inputContainer, styles.nameInput]}>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput
                                    style={styles.nameInputField}
                                    value={formState.firstName}
                                    onChangeText={(text) => handleChange("firstName", text)}
                                    autoCapitalize="words"
                                    autoComplete="given-name"
                                />
                            </View>

                            <View style={[styles.inputContainer, styles.nameInput]}>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput
                                    style={styles.nameInputField}
                                    value={formState.lastName}
                                    onChangeText={(text) => handleChange("lastName", text)}
                                    autoCapitalize="words"
                                    autoComplete="family-name"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Account</Text>
                            <TextInput
                                style={styles.input}
                                value={formState.account}
                                onChangeText={(text) => handleChange("account", text)}
                                autoCapitalize="none"
                                autoComplete="username"
                            />
                        </View>

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
                                    value={formState.password}
                                    onChangeText={(text) => handleChange("password", text)}
                                    secureTextEntry={!passwordVisible}
                                    autoComplete="new-password"
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={togglePasswordVisibility}
                                    activeOpacity={0.7}
                                >
                                    <Feather
                                        name={passwordVisible ? "eye-off" : "eye"}
                                        size={20}
                                        color={theme.colorGrey}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={formState.confirmPassword}
                                    onChangeText={(text) => handleChange("confirmPassword", text)}
                                    secureTextEntry={!confirmPasswordVisible}
                                    autoComplete="new-password"
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={toggleConfirmPasswordVisibility}
                                    activeOpacity={0.7}
                                >
                                    <Feather
                                        name={confirmPasswordVisible ? "eye-off" : "eye"}
                                        size={20}
                                        color={theme.colorGrey}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {registerState.status === "error" && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{registerState.error}</Text>
                            </View>
                        )}

                        {registerState.status === "success" && (
                            <View style={styles.successContainer}>
                                <Text style={styles.successText}>
                                    🎉 Account created successfully!
                                </Text>
                                <Text style={styles.redirectText}>
                                    Redirecting to login...
                                </Text>
                            </View>
                        )}

                        <NouraButton
                            title={registerState.status === "loading" ? "Creating Account..." : "Create Account"}
                            onPress={handleRegister}
                            loading={registerState.status === "loading"}
                            disabled={registerState.status === "loading" || registerState.status === "success"}
                            style={styles.button}
                        />

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <Link href="/login-user" style={styles.loginLink}>
                                <Text style={styles.loginLinkText}>Sign In</Text>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export default RegisterScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    keyboardContainer: {
        flex: 1,
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
    nameInputField: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: theme.colorWhite,
        marginRight: 8,
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
    successContainer: {
        marginVertical: 16,
        backgroundColor: '#e8f5e8',
        borderLeftWidth: 4,
        borderLeftColor: '#4caf50',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    successText: {
        color: '#2e7d32',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    redirectText: {
        color: '#2e7d32',
        fontSize: 14,
        fontStyle: 'italic',
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
