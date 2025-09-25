import React from 'react';
import { ScrollView } from 'react-native';
import Availability from './Availability';
import Exceptions from './Exceptions';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';

export default function AvailabilityPage() {
    const backgroundColor = useThemeColor({}, 'background');

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            <Availability />
            <Exceptions />
        </ScrollView>
    );
}
