import React, { ReactNode } from 'react';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StyleSheet, ViewStyle } from 'react-native';

interface SafeAreaContainerProps {
    children: ReactNode;
    edges?: Edge[];
    style?: ViewStyle;
    backgroundColor?: string;
}

export default function SafeAreaContainer({
    children,
    edges = [],
    style,
    backgroundColor = 'transparent',
}: SafeAreaContainerProps) {
    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor },
                style
            ]}
            edges={edges}
        >
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
