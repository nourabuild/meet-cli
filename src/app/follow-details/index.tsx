import { Text, View, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useReducer, useState, useCallback } from 'react';
import Feather from '@expo/vector-icons/Feather';

import { useReduxSelector } from "@/lib/hooks";
import { theme } from "@/styles/theme";
import { FollowRepo } from "@/repo";
import { Follows } from "@/repo/follows";

type FollowState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "success"; data: Follows.FollowingListResponse };

type TabType = 'followers' | 'following';

export default function FollowTabsScreen() {
    const currentUser = useReduxSelector((state) => state.user);
    const { tab } = useLocalSearchParams<{ tab?: string }>();

    const [activeTab, setActiveTab] = useState<TabType>(() => {
        // Set initial tab based on URL parameter, default to 'followers'
        return (tab === 'following' || tab === 'followers') ? tab as TabType : 'followers';
    });
    const [followersState, setFollowersState] = useReducer(
        (state: FollowState, newState: FollowState) => newState,
        { status: "idle" }
    );
    const [followingState, setFollowingState] = useReducer(
        (state: FollowState, newState: FollowState) => newState,
        { status: "idle" }
    );
    const [actioningUsers, setActioningUsers] = useState<Set<string>>(new Set());

    const fetchFollowersList = useCallback(async () => {
        if (!currentUser?.account) return;

        try {
            setFollowersState({ status: "loading" });

            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setFollowersState({ status: "error", error: "No access token found" });
                return;
            }

            const response = await FollowRepo.GetFollowers(currentUser.account, token);

            if (response.success) {
                let followersData: Follows.FollowingListResponse;

                if (Array.isArray(response.data)) {
                    followersData = {
                        data: response.data as any[] as Follows.FollowRelation[],
                        count: response.data.length
                    };
                } else if (typeof response.data === 'object' && response.data && 'data' in response.data) {
                    followersData = response.data as Follows.FollowingListResponse;
                } else {
                    followersData = { data: [], count: 0 };
                }

                setFollowersState({
                    status: "success",
                    data: followersData
                });
            } else {
                setFollowersState({
                    status: "error",
                    error: response.errors?.[0]?.error || "Failed to fetch followers list"
                });
            }
        } catch (error) {
            console.error('Error fetching followers list:', error);
            setFollowersState({
                status: "error",
                error: error instanceof Error ? error.message : "An unexpected error occurred"
            });
        }
    }, [currentUser?.account]);

    const fetchFollowingList = useCallback(async () => {
        if (!currentUser?.account) return;

        try {
            setFollowingState({ status: "loading" });

            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                setFollowingState({ status: "error", error: "No access token found" });
                return;
            }

            const response = await FollowRepo.GetFollowing(currentUser.account, token);

            if (response.success) {
                let followingData: Follows.FollowingListResponse;

                if (Array.isArray(response.data)) {
                    followingData = {
                        data: response.data as any[] as Follows.FollowRelation[],
                        count: response.data.length
                    };
                } else if (typeof response.data === 'object' && response.data && 'data' in response.data) {
                    followingData = response.data as Follows.FollowingListResponse;
                } else {
                    followingData = { data: [], count: 0 };
                }

                setFollowingState({
                    status: "success",
                    data: followingData
                });
            } else {
                setFollowingState({
                    status: "error",
                    error: response.errors?.[0]?.error || "Failed to fetch following list"
                });
            }
        } catch (error) {
            console.error('Error fetching following list:', error);
            setFollowingState({
                status: "error",
                error: error instanceof Error ? error.message : "An unexpected error occurred"
            });
        }
    }, [currentUser?.account]);

    useEffect(() => {
        fetchFollowersList();
        fetchFollowingList();
    }, [fetchFollowersList, fetchFollowingList]);

    const handleFollow = async (userId: string, userName: string) => {
        try {
            setActioningUsers(prev => new Set(prev).add(userId));

            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "No access token found");
                return;
            }

            const response = await FollowRepo.FollowUser(userId, token);

            if (response.success) {
                Alert.alert("Success", `You are now following ${userName}`);
                await fetchFollowingList(); // Refresh following list
            } else {
                Alert.alert("Error", response.errors?.[0]?.error || "Failed to follow user");
            }
        } catch (error) {
            console.error('Error following user:', error);
            Alert.alert("Error", error instanceof Error ? error.message : "An unexpected error occurred");
        } finally {
            setActioningUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const handleUnfollow = async (userId: string, userName: string) => {
        Alert.alert(
            "Unfollow User",
            `Are you sure you want to unfollow ${userName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unfollow",
                    style: "destructive",
                    onPress: () => performUnfollow(userId, userName)
                }
            ]
        );
    };

    const performUnfollow = async (userId: string, userName: string) => {
        try {
            setActioningUsers(prev => new Set(prev).add(userId));

            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "No access token found");
                return;
            }

            const response = await FollowRepo.UnfollowUser(userId, token);

            if (response.success) {
                Alert.alert("Success", "User unfollowed successfully");
                await fetchFollowingList(); // Refresh following list
            } else {
                Alert.alert("Error", response.errors?.[0]?.error || "Failed to unfollow user");
            }
        } catch (error) {
            console.error('Error unfollowing user:', error);
            Alert.alert("Error", error instanceof Error ? error.message : "An unexpected error occurred");
        } finally {
            setActioningUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const renderUserItem = ({ item }: { item: Follows.FollowRelation }) => {
        const { user } = item;
        const isActioning = actioningUsers.has(user.id);
        const isFollowersTab = activeTab === 'followers';

        return (
            <View style={styles.userItem}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => router.push(`/(tabs)/(home)/${user.account}`)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitials}>
                            {getInitials(user.name)}
                        </Text>
                    </View>

                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userHandle}>@{user.account}</Text>
                        {user.bio && (
                            <Text style={styles.userBio} numberOfLines={2}>
                                {user.bio}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        isFollowersTab ? styles.followButton : styles.unfollowButton,
                        isActioning && styles.buttonDisabled
                    ]}
                    onPress={() => isFollowersTab
                        ? handleFollow(user.id, user.name)
                        : handleUnfollow(user.id, user.name)
                    }
                    disabled={isActioning}
                    activeOpacity={0.7}
                >
                    {isActioning ? (
                        <Text style={[
                            isFollowersTab ? styles.followButtonText : styles.unfollowButtonText
                        ]}>...</Text>
                    ) : (
                        <Text style={[
                            isFollowersTab ? styles.followButtonText : styles.unfollowButtonText
                        ]}>
                            {isFollowersTab ? 'Follow' : 'Unfollow'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Feather name="users" size={64} color={theme.colorGrey} />
            <Text style={styles.emptyStateTitle}>
                {activeTab === 'followers' ? 'No Followers' : 'No Following'}
            </Text>
            <Text style={styles.emptyStateText}>
                {activeTab === 'followers'
                    ? "You don't have any followers yet. Share your profile to get more followers!"
                    : "You're not following anyone yet. Discover and follow interesting people!"
                }
            </Text>
        </View>
    );

    const getCurrentState = () => activeTab === 'followers' ? followersState : followingState;
    const getCurrentData = () => {
        const state = getCurrentState();
        return state.status === 'success' ? state.data.data : [];
    };

    const renderContent = () => {
        const currentState = getCurrentState();

        if (currentState.status === "loading") {
            return (
                <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>
                        Loading {activeTab}...
                    </Text>
                </View>
            );
        }

        if (currentState.status === "error") {
            return (
                <View style={styles.errorState}>
                    <Feather name="alert-circle" size={48} color={theme.colorRed} />
                    <Text style={styles.errorTitle}>Error</Text>
                    <Text style={styles.errorText}>{currentState.error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={activeTab === 'followers' ? fetchFollowersList : fetchFollowingList}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const data = getCurrentData();

        return (
            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={data.length === 0 ? styles.emptyListContainer : styles.listContainer}
            />
        );
    };

    const followersCount = followersState.status === 'success' ? followersState.data.count : 0;
    const followingCount = followingState.status === 'success' ? followingState.data.count : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Feather name="arrow-left" size={24} color={theme.colorBlack} />
                </TouchableOpacity>
                <Text style={styles.title}>{currentUser?.account || 'Profile'}</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
                    onPress={() => setActiveTab('followers')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                        {followersCount} Followers
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                    onPress={() => setActiveTab('following')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                        {followingCount} Following
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content Header */}
            <View style={styles.contentHeader}>
                <Text style={styles.contentTitle}>
                    {activeTab === 'followers' ? 'All followers' : 'All following'}
                </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {renderContent()}
            </View>
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: theme.colorWhite,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: "bold",
        color: theme.colorBlack,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colorWhite,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.colorNouraBlue,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorGrey,
    },
    activeTabText: {
        color: theme.colorBlack,
    },
    contentHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: theme.colorWhite,
    },
    contentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colorBlack,
    },
    content: {
        flex: 1,
        backgroundColor: theme.colorWhite,
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colorNouraBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colorWhite,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        marginBottom: 2,
    },
    userHandle: {
        fontSize: 14,
        color: theme.colorGrey,
        marginBottom: 4,
    },
    userBio: {
        fontSize: 14,
        color: theme.colorBlack,
        lineHeight: 18,
    },
    followButton: {
        backgroundColor: theme.colorNouraBlue,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
    },
    unfollowButton: {
        backgroundColor: theme.colorGrey,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
    },
    buttonDisabled: {
        backgroundColor: theme.colorLightGrey,
    },
    followButtonText: {
        color: theme.colorWhite,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    unfollowButtonText: {
        color: theme.colorWhite,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: theme.colorGrey,
    },
    errorState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colorRed,
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: theme.colorNouraBlue,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: theme.colorWhite,
        fontSize: 16,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyListContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colorBlack,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
    },
});
