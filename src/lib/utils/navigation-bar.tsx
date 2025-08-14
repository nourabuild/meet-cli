import React from 'react';
import {
    View,
    StyleSheet,
} from 'react-native';

interface NavbarProps {
    title?: string;
    orientation?: string;
    backgroundColor?: string;
    children?: React.ReactNode;
}

export default function Navbar({
    title = "",
    orientation = "portrait",
    backgroundColor = '#9b59b6',
    children,
}: NavbarProps) {

    return (
        <View style={[styles.navigationArea, { backgroundColor }]}>
            {children && (
                <View style={styles.childrenContainer}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    navigationArea: {
        backgroundColor: '#9b59b6',
        paddingHorizontal: 20,
        paddingVertical: 0,
        borderRadius: 0,
    },
    childrenContainer: {
        paddingVertical: 0,
        margin: 0, // Remove all margins
    },
});
