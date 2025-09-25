import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const usePushNotification = () => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [channels, setChannels] = useState<Notifications.NotificationChannel[]>([]);
    const [notification, setNotification] =
        useState<Notifications.Notification | null>(null);

    // const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    // const responseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

        if (Platform.OS === 'android') {
            Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
        }
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        });

        return () => {
            notificationListener.remove();
            responseListener.remove();
        };
    }, []);

    const sendPushNotification = async (
        expoPushToken: string,
        title: string,
        body: string,
        data?: { [key: string]: any }
    ) => {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data: data || {},
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
    };

    // Helper function specifically for follow notifications
    const sendFollowNotification = async (
        targetUserPushToken: string,
        followerName: string,
        followerAccount: string
    ) => {
        if (!targetUserPushToken) {
            return;
        }

        const title = 'New Follower';
        const body = `${followerName} (${followerAccount}) has started following you`;
        const data = {
            type: 'follow',
            followerAccount,
            followerName,
            timestamp: new Date().toISOString(),
        };

        try {
            await sendPushNotification(targetUserPushToken, title, body, data);
        } catch (error) {
            console.error('Failed to send follow notification:', error);
        }
    };

    const registerForPushNotificationsAsync = async () => {
        let token;
        if (Device.isDevice) {
            const { status: existingStatus } =
                await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                Alert.alert('Failed to get push token for push notification!');
                return;
            }
            token = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas.projectId,
            });
        } else {
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token?.data;
    };

    return {
        expoPushToken,
        notification,
        channels,
        sendPushNotification,
        sendFollowNotification,
        registerForPushNotificationsAsync,
    };
};
