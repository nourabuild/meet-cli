import { theme } from "@/styles/theme";

import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TouchableOpacity,
} from "react-native";


interface NouraCardProps {
    title?: string;
    children?: React.ReactNode;
    onPress?: () => void;
    variant?: "default" | "elevated" | "outlined";
    padding?: "small" | "medium" | "large";
    style?: ViewStyle;
    titleStyle?: TextStyle;
}

export default function NouraCard({
    title,
    children,
    onPress,
    variant = "default",
    padding = "medium",
    style,
    titleStyle,
}: NouraCardProps) {
    const getVariantStyle = () => {
        switch (variant) {
            case "default":
                return styles.default;
            case "elevated":
                return styles.elevated;
            case "outlined":
                return styles.outlined;
            default:
                return styles.default;
        }
    };

    const getPaddingStyle = () => {
        switch (padding) {
            case "small":
                return styles.smallPadding;
            case "medium":
                return styles.mediumPadding;
            case "large":
                return styles.largePadding;
            default:
                return styles.mediumPadding;
        }
    };

    const cardStyle = [
        styles.base,
        getVariantStyle(),
        getPaddingStyle(),
        style,
    ];

    const CardContent = () => (
        <>
            {title && (
                <Text style={[styles.title, titleStyle]}>{title}</Text>
            )}
            {children}
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                style={cardStyle}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <CardContent />
            </TouchableOpacity>
        );
    }

    return (
        <View style={cardStyle}>
            <CardContent />
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        backgroundColor: theme.colorWhite,
    },
    default: {
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
    },
    elevated: {
        shadowColor: theme.colorBlack,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    outlined: {
        borderWidth: 2,
        borderColor: theme.colorDeepSkyBlue,
    },
    smallPadding: {
        padding: 12,
    },
    mediumPadding: {
        padding: 16,
    },
    largePadding: {
        padding: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: theme.colorBlack,
        marginBottom: 8,
    },
});