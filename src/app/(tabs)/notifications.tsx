import { Text, StyleSheet, View, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';

import { theme } from '@/styles/theme';

type NotificationType = 'meeting_invite' | 'meeting_reminder' | 'meeting_update' | 'system' | 'mention';

type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    actionRequired?: boolean;
    meetingId?: string;
    fromUser?: {
        name: string;
        account: string;
    };
};

export default function NotificationsScreen() {
    const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');

    // Mock notifications data
    const notifications: Notification[] = [
        {
            id: '1',
            type: 'meeting_invite',
            title: 'Meeting Invitation',
            message: 'Sarah Wilson invited you to "Q2 Planning Session" on Aug 5, 2025 at 2:00 PM',
            timestamp: '2025-07-30T10:30:00Z',
            isRead: false,
            actionRequired: true,
            meetingId: 'meeting_1',
            fromUser: { name: 'Sarah Wilson', account: 'sarahw' }
        },
        {
            id: '2',
            type: 'meeting_reminder',
            title: 'Meeting Reminder',
            message: 'Your meeting "Team Sync" starts in 15 minutes',
            timestamp: '2025-07-30T09:45:00Z',
            isRead: false,
            meetingId: 'meeting_2'
        },
        {
            id: '3',
            type: 'meeting_update',
            title: 'Meeting Updated',
            message: 'Mike Johnson updated the location for "Product Demo" to Conference Room B',
            timestamp: '2025-07-30T08:20:00Z',
            isRead: true,
            meetingId: 'meeting_3',
            fromUser: { name: 'Mike Johnson', account: 'mikej' }
        },
        {
            id: '4',
            type: 'mention',
            title: 'You were mentioned',
            message: 'Alex Chen mentioned you in a comment on "Budget Review Meeting"',
            timestamp: '2025-07-29T16:45:00Z',
            isRead: false,
            meetingId: 'meeting_4',
            fromUser: { name: 'Alex Chen', account: 'alexc' }
        },
        {
            id: '5',
            type: 'system',
            title: 'Account Security',
            message: 'Your password was changed successfully from a new device',
            timestamp: '2025-07-29T14:30:00Z',
            isRead: true
        }
    ];

    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case 'meeting_invite':
                return 'calendar';
            case 'meeting_reminder':
                return 'clock';
            case 'meeting_update':
                return 'edit-3';
            case 'mention':
                return 'at-sign';
            case 'system':
                return 'shield';
            default:
                return 'bell';
        }
    };

    const getNotificationColor = (type: NotificationType) => {
        switch (type) {
            case 'meeting_invite':
                return theme.colorNouraBlue;
            case 'meeting_reminder':
                return '#ff9500';
            case 'meeting_update':
                return '#007aff';
            case 'mention':
                return '#ff3b30';
            case 'system':
                return '#34c759';
            default:
                return theme.colorGrey;
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const notificationTime = new Date(timestamp);
        const diffMs = now.getTime() - notificationTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays}d ago`;
        } else if (diffHours > 0) {
            return `${diffHours}h ago`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes > 0 ? `${diffMinutes}m ago` : 'Just now';
        }
    };

    const filteredNotifications = notifications.filter(notification => {
        switch (filter) {
            case 'unread':
                return !notification.isRead;
            case 'mentions':
                return notification.type === 'mention';
            default:
                return true;
        }
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[
                styles.notificationCard,
                !item.isRead && styles.unreadCard
            ]}
            activeOpacity={0.7}
            onPress={() => console.log('Notification tapped:', item.id)}
        >
            <View style={styles.notificationHeader}>
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: `${getNotificationColor(item.type)}15` }
                ]}>
                    <Feather
                        name={getNotificationIcon(item.type)}
                        size={18}
                        color={getNotificationColor(item.type)}
                    />
                </View>

                <View style={styles.notificationContent}>
                    <View style={styles.titleRow}>
                        <Text style={[
                            styles.notificationTitle,
                            !item.isRead && styles.unreadTitle
                        ]}>
                            {item.title}
                        </Text>
                        <Text style={styles.timestamp}>
                            {formatTimeAgo(item.timestamp)}
                        </Text>
                    </View>

                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.message}
                    </Text>

                    {item.fromUser && (
                        <Text style={styles.fromUser}>
                            from {item.fromUser.name}
                        </Text>
                    )}

                    {item.actionRequired && (
                        <View style={styles.actionContainer}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.declineButton]}>
                                <Text style={[styles.actionButtonText, styles.declineButtonText]}>
                                    Decline
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                    </View>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === 'all' && styles.activeFilterTab
                        ]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[
                            styles.filterText,
                            filter === 'all' && styles.activeFilterText
                        ]}>
                            All
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === 'unread' && styles.activeFilterTab
                        ]}
                        onPress={() => setFilter('unread')}
                    >
                        <Text style={[
                            styles.filterText,
                            filter === 'unread' && styles.activeFilterText
                        ]}>
                            Unread
                        </Text>
                        {unreadCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === 'mentions' && styles.activeFilterTab
                        ]}
                        onPress={() => setFilter('mentions')}
                    >
                        <Text style={[
                            styles.filterText,
                            filter === 'mentions' && styles.activeFilterText
                        ]}>
                            Mentions
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Notifications List */}
            <FlatList
                data={filteredNotifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="bell-off" size={48} color={theme.colorGrey} />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'unread'
                                ? "You're all caught up!"
                                : filter === 'mentions'
                                    ? "No mentions yet"
                                    : "No notifications to show"
                            }
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colorBlack,
    },
    unreadBadge: {
        backgroundColor: '#ff3b30',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 24,
        alignItems: 'center',
    },
    unreadBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colorWhite,
    },
    filterContainer: {
        backgroundColor: theme.colorLightGrey,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    filterContent: {
        flexDirection: 'row',
        gap: 12,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colorWhite,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        gap: 6,
    },
    activeFilterTab: {
        backgroundColor: theme.colorNouraBlue,
        borderColor: theme.colorNouraBlue,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colorGrey,
    },
    activeFilterText: {
        color: theme.colorWhite,
        fontWeight: '600',
    },
    filterBadge: {
        backgroundColor: theme.colorWhite,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 16,
        alignItems: 'center',
    },
    filterBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colorNouraBlue,
    },
    listContainer: {
        padding: 20,
    },
    notificationCard: {
        backgroundColor: theme.colorWhite,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colorLightGrey,
        shadowColor: theme.colorBlack,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    unreadCard: {
        borderColor: theme.colorNouraBlue,
        backgroundColor: '#f8fcff',
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 12,
        color: theme.colorGrey,
    },
    notificationMessage: {
        fontSize: 14,
        color: theme.colorGrey,
        lineHeight: 20,
        marginBottom: 8,
    },
    fromUser: {
        fontSize: 12,
        color: theme.colorNouraBlue,
        fontWeight: '500',
        marginBottom: 8,
    },
    actionContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        backgroundColor: theme.colorNouraBlue,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    declineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colorGrey,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colorWhite,
    },
    declineButtonText: {
        color: theme.colorGrey,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff3b30',
        marginTop: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colorBlack,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
        lineHeight: 22,
    },
});