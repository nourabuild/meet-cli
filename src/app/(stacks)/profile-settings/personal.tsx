import React, { useState, useEffect, useReducer } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from "react-native";
import { useReduxSelector } from "@/lib/hooks";
import NouraButton from "@/lib/components/NouraButton";
import PhoneInput from "@/lib/components/phone-input";
import { UserRepo } from "@/repo";
import * as SecureStore from 'expo-secure-store';
import { theme } from "@/styles/theme";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import SafeAreaContainer from "@/lib/utils/safe-area-container";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";

interface FormData {
    name: string;
    email: string;
    account: string;
    bio: string;
    dob: string;
    phone: string;
}

interface FormErrors {
    [key: string]: string;
}

// -------------------------------
// State Management
// -------------------------------

type AccountState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success" };

const initialFormData: FormData = {
    name: "",
    email: "",
    account: "",
    bio: "",
    dob: "",
    phone: "",
};

function formDataReducer(state: FormData, action: { type: string; field?: keyof FormData; value?: string; data?: Partial<FormData> }) {
    switch (action.type) {
        case 'SET_FIELD':
            if (action.field && action.value !== undefined) {
                return { ...state, [action.field]: action.value };
            }
            return state;
        case 'SET_ALL':
            return { ...state, ...action.data };
        case 'RESET':
            return initialFormData;
        default:
            return state;
    }
}

export default function AccountSettings() {
    const user = useReduxSelector((state) => state.user);
    
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    // State management using reducers (same pattern as login/register)
    const [formData, dispatchFormData] = useReducer(formDataReducer, initialFormData);
    const [accountState, setAccountState] = useReducer(
        (state: AccountState, newState: AccountState) => newState,
        { status: "idle" }
    );
    const [errors, setErrors] = useState<FormErrors>({});
    const [hasChanges, setHasChanges] = useState(false);

    const handleBack = () => {
        router.back();
    };

    useEffect(() => {
        if (user) {
            const initialData = {
                name: user.name || "",
                email: user.email || "",
                account: user.account || "",
                bio: user.bio || "",
                dob: user.dob || "",
                phone: user.phone || "",
            };
            dispatchFormData({ type: 'SET_ALL', data: initialData });
        }
    }, [user]);

    const handleInputChange = (field: keyof FormData, value: string) => {
        dispatchFormData({ type: 'SET_FIELD', field, value });
        setHasChanges(true);
        // Clear field error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleUpdate = async () => {
        if (!user || !hasChanges) return;

        setAccountState({ status: "loading" });
        setErrors({});

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "Authentication token not found");
                return;
            }

            // Create FormData with only changed fields
            const formDataToSend = new FormData();
            const changedFields: (keyof FormData)[] = [];

            // Check which fields have changed
            if (formData.name !== (user.name || "")) {
                formDataToSend.append("name", formData.name);
                changedFields.push("name");
            }
            if (formData.email !== (user.email || "")) {
                formDataToSend.append("email", formData.email);
                changedFields.push("email");
            }
            if (formData.account !== (user.account || "")) {
                formDataToSend.append("account", formData.account);
                changedFields.push("account");
            }
            if (formData.bio !== (user.bio || "")) {
                formDataToSend.append("bio", formData.bio || "");
                changedFields.push("bio");
            }
            if (formData.dob !== (user.dob || "")) {
                formDataToSend.append("dob", formData.dob || "");
                changedFields.push("dob");
            }
            if (formData.phone !== (user.phone || "")) {
                formDataToSend.append("phone", formData.phone || "");
                changedFields.push("phone");
            }

            // Only proceed if there are changes
            if (changedFields.length === 0) {
                Alert.alert("Info", "No changes to save");
                setHasChanges(false);
                return;
            }

            const result = await UserRepo.UpdateUser(formDataToSend, token);

            if (result.success) {
                Alert.alert("Success", "Account updated successfully");
                setHasChanges(false);
                setAccountState({ status: "success" });
                // Optionally refresh user data
                const updatedUser = await UserRepo.WhoAmI(token);
                if (updatedUser.success) {
                    // Update Redux store if needed
                }
            } else {
                // Handle validation errors
                const fieldErrors: FormErrors = {};
                result.errors.forEach(error => {
                    fieldErrors[error.field] = error.error;
                });
                setErrors(fieldErrors);

                if (fieldErrors.updateuser) {
                    Alert.alert("Error", fieldErrors.updateuser);
                }
                setAccountState({ status: "error", error: "Validation failed" });
            }
        } catch (error) {
            console.error("Update error:", error);
            Alert.alert("Error", "Failed to update account. Please try again.");
            setAccountState({
                status: "error",
                error: error instanceof Error ? error.message : "Failed to update account. Please try again."
            });
        }
    };

    if (!user) {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <Text style={styles.errorText}>User data not available</Text>
            </View>
        );
    }

    return (
        <SafeAreaContainer
            backgroundColor={backgroundColor}
            edges={['bottom']}>
            <View style={[styles.container, { backgroundColor }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack}>
                        <Feather name="arrow-left" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Personal</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.contentContainer}
                    keyboardDismissMode="on-drag">

                    <View>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Basic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Name *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor }, errors.name && styles.inputError]}
                                value={formData.name}
                                onChangeText={(value) => handleInputChange("name", value)}
                                placeholderTextColor={theme.colorGrey}
                            />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Email *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor }, errors.email && styles.inputError]}
                                value={formData.email}
                                onChangeText={(value) => handleInputChange("email", value)}
                                placeholderTextColor={theme.colorGrey}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Username *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor }, errors.account && styles.inputError]}
                                value={formData.account}
                                onChangeText={(value) => handleInputChange("account", value)}
                                placeholderTextColor={theme.colorGrey}
                                autoCapitalize="none"
                            />
                            {errors.account && <Text style={styles.errorText}>{errors.account}</Text>}
                        </View>
                    </View>

                    <View >
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Additional Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Bio</Text>
                            <Text style={styles.placeholderText}>Tell us about yourself</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor }, errors.bio && styles.inputError]}
                                value={formData.bio}
                                onChangeText={(value) => handleInputChange("bio", value)}
                                placeholderTextColor={theme.colorGrey}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Date of Birth</Text>
                            <View style={styles.dateFieldContainer}>
                                <View style={styles.dayWrapper}>
                                    <Text style={[styles.dateLabel, { color: textColor }]}>Day</Text>
                                    <TextInput
                                        style={[styles.dateInput, { backgroundColor: cardColor, color: textColor }, errors.dob && styles.inputError]}
                                        value={formData.dob ? (formData.dob.split('-')[2] || '') : ''}
                                        onChangeText={(value) => {
                                            const parts = formData.dob ? formData.dob.split('-') : ['', '', ''];
                                            const year = parts[0] || '';
                                            const month = parts[1] || '';
                                            const day = value || '';
                                            const newDob = year || month || day ? `${year}-${month}-${day}` : '';
                                            handleInputChange("dob", newDob);
                                        }}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.monthWrapper}>
                                    <Text style={[styles.dateLabel, { color: textColor }]}>Month</Text>
                                    <TextInput
                                        style={[styles.dateInput, { backgroundColor: cardColor, color: textColor }, errors.dob && styles.inputError]}
                                        value={formData.dob ? (formData.dob.split('-')[1] || '') : ''}
                                        onChangeText={(value) => {
                                            const parts = formData.dob ? formData.dob.split('-') : ['', '', ''];
                                            const year = parts[0] || '';
                                            const month = value || '';
                                            const day = parts[2] || '';
                                            const newDob = year || month || day ? `${year}-${month}-${day}` : '';
                                            handleInputChange("dob", newDob);
                                        }}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.yearWrapper}>
                                    <Text style={[styles.dateLabel, { color: textColor }]}>Year</Text>
                                    <TextInput
                                        style={[styles.dateInput, { backgroundColor: cardColor, color: textColor }, errors.dob && styles.inputError]}
                                        value={formData.dob ? (formData.dob.split('-')[0] || '') : ''}
                                        onChangeText={(value) => {
                                            const parts = formData.dob ? formData.dob.split('-') : ['', '', ''];
                                            const year = value || '';
                                            const month = parts[1] || '';
                                            const day = parts[2] || '';
                                            const newDob = year || month || day ? `${year}-${month}-${day}` : '';
                                            handleInputChange("dob", newDob);
                                        }}
                                        keyboardType="numeric"
                                        maxLength={4}
                                    />
                                </View>
                            </View>
                            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Phone</Text>
                            <PhoneInput
                                value={formData.phone}
                                onChangeText={(value) => handleInputChange("phone", value)}
                                error={!!errors.phone}
                            />
                            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <NouraButton
                            title="Update Account"
                            onPress={handleUpdate}
                            loading={accountState.status === "loading"}
                            disabled={accountState.status === "loading" || !hasChanges}
                            variant="primary"
                            size="large"
                        />
                    </View>
                </ScrollView>
            </View>
        </SafeAreaContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 16,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: "600",
    },
    placeholder: {
        width: 40,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 48,
    },
    textArea: {
        minHeight: 100,
    },
    inputError: {
        borderColor: theme.colorRed || "#FF0000",
    },
    errorText: {
        color: theme.colorRed || "#FF0000",
        fontSize: 14,
        marginTop: 4,
    },
    placeholderText: {
        fontSize: 14,
        color: theme.colorGrey,
        marginBottom: 6,
        fontStyle: "italic",
    },
    buttonContainer: {
        marginTop: 10,
    },
    dateFieldContainer: {
        flexDirection: "row",
        gap: 12,
    },
    dayWrapper: {
        flex: 1,
    },
    monthWrapper: {
        flex: 1,
    },
    yearWrapper: {
        flex: 2,
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 6,
    },
    dateInput: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 48,
        textAlign: "center",
    },
});
