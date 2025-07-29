import { theme } from "@/styles/theme";

import React, { useState } from "react";
import {
    Image,
    View,
    StyleSheet,
    ActivityIndicator,
    Text,
    ImageStyle,
    ViewStyle,
    ImageSourcePropType,
} from "react-native";


interface NouraImageProps {
    source: ImageSourcePropType;
    style?: ImageStyle;
    containerStyle?: ViewStyle;
    placeholder?: string;
    showLoadingIndicator?: boolean;
    resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
    borderRadius?: number;
}

export default function NouraImage({
    source,
    style,
    containerStyle,
    placeholder = "Loading...",
    showLoadingIndicator = true,
    resizeMode = "cover",
    borderRadius = 8,
}: NouraImageProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleLoadStart = () => {
        setLoading(true);
        setError(false);
    };

    const handleLoadEnd = () => {
        setLoading(false);
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    const imageStyle = [
        styles.image,
        { borderRadius },
        style,
    ];

    const containerStyles = [
        styles.container,
        { borderRadius },
        containerStyle,
    ];

    return (
        <View style={containerStyles}>
            <Image
                source={source}
                style={imageStyle}
                resizeMode={resizeMode}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
            />

            {loading && showLoadingIndicator && !error && (
                <View style={styles.overlay}>
                    <ActivityIndicator
                        color={theme.colorDeepSkyBlue}
                        size="small"
                    />
                    {placeholder && (
                        <Text style={styles.placeholderText}>{placeholder}</Text>
                    )}
                </View>
            )}

            {error && (
                <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>Failed to load image</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colorLightGrey,
        overflow: "hidden",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    errorOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colorLightGrey,
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 12,
        color: theme.colorGrey,
        textAlign: "center",
    },
    errorText: {
        fontSize: 12,
        color: theme.colorGrey,
        textAlign: "center",
    },
});