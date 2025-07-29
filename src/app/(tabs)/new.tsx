import { theme } from '@/styles/theme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';



export default function NewMeeting() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>New Meeting</Text>
            <Text style={styles.text}>Create a new meeting here</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colorPaleBlue,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colorDeepSkyBlue,
        marginBottom: 10,
    },
    text: {
        fontSize: 16,
        color: theme.colorSkyBlue,
        textAlign: 'center',
    },
});
