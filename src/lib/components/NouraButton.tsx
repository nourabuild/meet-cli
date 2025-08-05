
import { theme } from "@/styles/theme";

import React from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from "react-native";


interface NouraButtonProps {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "outline";
    size?: "small" | "medium" | "large";
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function NouraButton({
    title,
    onPress,
    variant = "primary",
    size = "medium",
    loading = false,
    disabled = false,
    style,
    textStyle,
}: NouraButtonProps) {
    const getVariantStyle = () => {
        switch (variant) {
            case "primary":
                return styles.primary;
            case "secondary":
                return styles.secondary;
            case "outline":
                return styles.outline;
            default:
                return styles.primary;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case "small":
                return styles.small;
            case "medium":
                return styles.medium;
            case "large":
                return styles.large;
            default:
                return styles.medium;
        }
    };

    const getTextVariantStyle = () => {
        switch (variant) {
            case "primary":
                return styles.primaryText;
            case "secondary":
                return styles.secondaryText;
            case "outline":
                return styles.outlineText;
            default:
                return styles.primaryText;
        }
    };

    const getTextSizeStyle = () => {
        switch (size) {
            case "small":
                return styles.smallText;
            case "medium":
                return styles.mediumText;
            case "large":
                return styles.largeText;
            default:
                return styles.mediumText;
        }
    };

    const buttonStyle = [
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        (disabled || loading) && styles.disabled,
        style,
    ];

    const buttonTextStyle = [
        styles.baseText,
        getTextVariantStyle(),
        getTextSizeStyle(),
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === "primary" ? theme.colorWhite : theme.colorDeepSkyBlue}
                    size="small"
                />
            ) : (
                <Text style={buttonTextStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    primary: {
        backgroundColor: theme.colorDeepSkyBlue,
    },
    secondary: {
        backgroundColor: theme.colorNouraBlue,
    },
    outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: theme.colorDeepSkyBlue,
    },
    small: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 36,
    },
    medium: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
    },
    large: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        minHeight: 56,
    },
    disabled: {
        opacity: 0.6,
    },
    baseText: {
        fontWeight: "600",
        textAlign: "center",
    },
    primaryText: {
        color: theme.colorWhite,
    },
    secondaryText: {
        color: theme.colorWhite,
    },
    outlineText: {
        color: theme.colorDeepSkyBlue,
    },
    smallText: {
        fontSize: 14,
    },
    mediumText: {
        fontSize: 16,
    },
    largeText: {
        fontSize: 18,
    },
});
