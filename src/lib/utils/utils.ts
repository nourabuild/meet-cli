import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

// Get user tracking permission
// This function is important for compliance with privacy regulations
// Don't remove it, because Apple will reject the app if this is not implemented
export const getUserTrackingPermission = async (): Promise<boolean> => {
    try {
        const { status } = await requestTrackingPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting tracking permission:', error);
        return false;
    }
};

// -----------------------------------

export const STORAGE_KEYS = {
    device_id: 'device_id',
} as const;

// Helper functions for type-safe storage access
export async function getString(key: keyof typeof STORAGE_KEYS): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(key);
    } catch (error) {
        console.error(`Error getting ${key} from storage:`, error);
        return null;
    }
}

export async function setString(key: keyof typeof STORAGE_KEYS, value: string): Promise<void> {
    try {
        await AsyncStorage.setItem(key, value);
    } catch (error) {
        console.error(`Error setting ${key} in storage:`, error);
    }
}



export const getDeviceId = async (): Promise<string> => {
    let deviceId = await getString(STORAGE_KEYS.device_id);

    if (!deviceId) {
        try {
            if (Platform.OS === 'ios') {
                const iosId = await Application.getIosIdForVendorAsync();
                deviceId = iosId || uuid.v4().toString();
            } else {
                deviceId = Application.getAndroidId() || uuid.v4().toString();
            }
            await setString(STORAGE_KEYS.device_id, deviceId);
        } catch (error) {
            console.error('Error generating device ID:', error);
            // Fallback to UUID if all else fails
            deviceId = uuid.v4().toString();
            await setString(STORAGE_KEYS.device_id, deviceId);
        }
    }

    return deviceId;
};