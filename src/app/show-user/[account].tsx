import { Text, View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useReducer } from 'react';

import { theme } from "@/styles/theme";
import { FollowRepo, UserRepo } from "@/repo";
import { Users } from "@/repo/users";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";

// -------------------------------
// State Management
// -------------------------------

type UserProfileState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: string }
    | {
        status: "success";
        data: {
            user: Users.User;
            followersCount: number;
            followingCount: number;
        };
    };

type ReducerState = {
    user: UserProfileState;
    isFollowing: boolean;
    followLoading: boolean;
};

type ReducerAction =
    | { type: 'SET_USER_STATE'; payload: UserProfileState }
    | { type: 'SET_IS_FOLLOWING'; payload: boolean }
    | { type: 'SET_FOLLOW_LOADING'; payload: boolean }
    | { type: 'UPDATE_FOLLOWERS_COUNT'; delta: number };

const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
    switch (action.type) {
        case 'SET_USER_STATE':
            return { ...state, user: action.payload };
        case 'SET_IS_FOLLOWING':
            return { ...state, isFollowing: action.payload };
        case 'SET_FOLLOW_LOADING':
            return { ...state, followLoading: action.payload };
        case 'UPDATE_FOLLOWERS_COUNT':
            if (state.user.status !== "success") {
                return state;
            }
            return {
                ...state,
                user: {
                    ...state.user,
                    data: {
                        ...state.user.data,
                        followersCount: Math.max(0, state.user.data.followersCount + action.delta),
                    },
                },
            };
        default:
            return state;
    }
};

const initialState: ReducerState = {
    user: { status: "idle" },
    isFollowing: false,
    followLoading: false,
};

const determineFollowingStatus = async (token: string, targetUserId: string): Promise<boolean> => {
    try {
        const response = await FollowRepo.GetFollowing("", token);
        if (!response.success) {
            console.error('Failed to fetch following list:', response.errors);
            return false;
        }

        const { data } = response;

        if (Array.isArray(data)) {
            return data.some((follow: any) => follow.following_id === targetUserId);
        }

        if (data && typeof data === 'object' && 'data' in data) {
            const followList = (data as any).data;
            if (Array.isArray(followList)) {
                return followList.some((follow: any) => follow.following_id === targetUserId);
            }
        }

        return false;
    } catch (error) {
        console.error('Error fetching following list:', error);
        return false;
    }
};

export default function ShowUserScreen() {
    const params = useLocalSearchParams<{ account: string }>();
    const [state, dispatch] = useReducer(reducer, initialState);

    const { user: userState, isFollowing, followLoading } = state;
    const headerTitle = userState.status === "success"
        ? userState.data.user.account
        : "Profile";

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    const fetchUserProfile = useCallback(async () => {
        if (!params.account) {
            dispatch({ type: 'SET_USER_STATE', payload: { status: "error", error: "No account provided" } });
            return;
        }

        dispatch({ type: 'SET_USER_STATE', payload: { status: "loading" } });

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                dispatch({
                    type: 'SET_USER_STATE',
                    payload: { status: "error", error: "Authentication required. Please log in again." },
                });
                return;
            }

            const userResponse = await UserRepo.GetByAccount(params.account, token);
            if (!userResponse.success) {
                console.error('Failed to fetch user data:', userResponse.errors);
                dispatch({
                    type: 'SET_USER_STATE',
                    payload: {
                        status: "error",
                        error: typeof userResponse.errors === "object" && userResponse.errors.length > 0
                            ? userResponse.errors[0].error
                            : "Failed to load user profile",
                    },
                });
                return;
            }

            const userData = userResponse.data;

            const followCountResponse = await FollowRepo.GetUsersFollowCount(userData.id, token);
            let followersCount = 0;
            let followingCount = 0;

            if (followCountResponse.success && followCountResponse.data) {
                const countData = followCountResponse.data as any;
                if (typeof countData === 'object') {
                    followersCount = countData.followers_count || countData.followersCount ||
                        countData.followers || countData.follower_count || 0;
                    followingCount = countData.following_count || countData.followingCount ||
                        countData.following || countData.follow_count || 0;
                }
            }

            const isCurrentlyFollowing = await determineFollowingStatus(token, userData.id);
            dispatch({ type: 'SET_IS_FOLLOWING', payload: isCurrentlyFollowing });

            dispatch({
                type: 'SET_USER_STATE',
                payload: {
                    status: "success",
                    data: {
                        user: userData,
                        followersCount,
                        followingCount,
                    },
                },
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            dispatch({
                type: 'SET_USER_STATE',
                payload: {
                    status: "error",
                    error: error instanceof Error
                        ? error.message
                        : "Network error. Please check your connection and try again.",
                },
            });
        }
    }, [params.account]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatJoinDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    };

    const formatFollowerCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    const handleRetry = () => {
        dispatch({ type: 'SET_USER_STATE', payload: { status: "idle" } });
        fetchUserProfile();
    };

    const handleMenuPress = () => {
        Alert.alert("Menu", "Menu functionality will be implemented later");
    };

    const handleFollowPress = async () => {
        if (userState.status !== "success") return;

        const { user } = userState.data;
        dispatch({ type: 'SET_FOLLOW_LOADING', payload: true });

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "Authentication required. Please log in again.");
                return;
            }

            if (isFollowing) {
                const response = await FollowRepo.UnfollowUser(user.id, token);
                if (response.success) {
                    dispatch({ type: 'SET_IS_FOLLOWING', payload: false });
                    dispatch({ type: 'UPDATE_FOLLOWERS_COUNT', delta: -1 });
                } else {
                    console.error('Unfollow error:', response.errors);
                    const errorMessage = response.errors && response.errors.length > 0
                        ? response.errors[0].error
                        : "Failed to unfollow user";
                    Alert.alert("Error", errorMessage);
                }
            } else {
                const response = await FollowRepo.FollowUser(user.id, token);
                if (response.success) {
                    dispatch({ type: 'SET_IS_FOLLOWING', payload: true });
                    dispatch({ type: 'UPDATE_FOLLOWERS_COUNT', delta: 1 });
                } else {
                    console.error('Follow error:', response.errors);
                    const errorMessage = response.errors && response.errors.length > 0
                        ? response.errors[0].error
                        : "Failed to follow user";
                    Alert.alert("Error", errorMessage);
                }
            }
        } catch (error) {
            console.error('Follow error:', error);
            Alert.alert("Error", "Network error. Please try again.");
        } finally {
            dispatch({ type: 'SET_FOLLOW_LOADING', payload: false });
        }
    };

    if (userState.status === "loading") {
        return (
            <>
                <Stack.Screen options={{ headerTitle }} />
                <View style={[styles.container, { backgroundColor }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>User Profile</Text>
                        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                            <Feather name="more-horizontal" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.centerContainer}>
                        <Text style={styles.loadingText}>Loading user profile...</Text>
                    </View>
                </View>
            </>
        );
    }

    if (userState.status === "error") {
        return (
            <>
                <Stack.Screen options={{ headerTitle }} />
                <View style={[styles.container, { backgroundColor }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>User Profile</Text>
                        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                            <Feather name="more-horizontal" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.centerContainer}>
                        <Feather name="alert-circle" size={48} color={theme.colorGrey} />
                        <Text style={[styles.errorTitle, { color: textColor }]}>Error</Text>
                        <Text style={styles.errorText}>{userState.error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleRetry}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </>
        );
    }

    if (userState.status !== "success") {
        return null;
    }

    const { user, followersCount, followingCount } = userState.data;

    return (
        <>
            <Stack.Screen options={{ headerTitle }} />
            <View style={[styles.container, { backgroundColor }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.profileContent}>
                        <View style={styles.avatarAndNameSection}>
                            <View style={styles.avatarContainer}>
                                {user.avatar_photo_id ? (
                                    <Image
                                        source={{ uri: `https://api.example.com/photos/${user.avatar_photo_id}` }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarInitials}>
                                            {getInitials(user.name)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.nameAndStatsSection}>
                                <View style={styles.nameAndButtonRow}>
                                    <Text style={[styles.displayName, { color: textColor }]}>{user.name}</Text>
                                </View>
                                <View style={styles.statsRow}>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => {/* TODO: Navigate to followers */ }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.statNumber, { color: textColor }]}>
                                            {formatFollowerCount(followersCount)}
                                        </Text>
                                        <Text style={styles.statLabel}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => {/* TODO: Navigate to following */ }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.statNumber, { color: textColor }]}>
                                            {formatFollowerCount(followingCount)}
                                        </Text>
                                        <Text style={styles.statLabel}>following</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {user.bio && (
                            <Text style={[styles.bio, { color: textColor }]}>{user.bio}</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.followButton, { backgroundColor: cardColor }]}
                            onPress={handleFollowPress}
                            disabled={followLoading}
                        >
                            <Text style={[styles.followButtonText, { color: textColor }]}>
                                {followLoading ? "Loading..." : isFollowing ? "Unfollow" : "Follow"}
                            </Text>
                        </TouchableOpacity>

                        <View style={[styles.section, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Details</Text>

                            <View style={styles.detailItem}>
                                <Feather name="mail" size={20} color={theme.colorNouraBlue} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Email</Text>
                                    <Text style={[styles.detailValue, { color: textColor }]}>{user.email}</Text>
                                </View>
                            </View>

                            {user.phone && (
                                <View style={styles.detailItem}>
                                    <Feather name="phone" size={20} color={theme.colorNouraBlue} />
                                    <View style={styles.detailText}>
                                        <Text style={styles.detailLabel}>Phone</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>{user.phone}</Text>
                                    </View>
                                </View>
                            )}

                            <View style={styles.detailItem}>
                                <Feather name="calendar" size={20} color={theme.colorNouraBlue} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Joined</Text>
                                    <Text style={[styles.detailValue, { color: textColor }]}>
                                        {formatJoinDate(user.created_at)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    menuButton: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: theme.colorNouraBlue,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorWhite,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    avatarAndNameSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colorLightGrey,
    },
    avatarFallback: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colorNouraBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colorWhite,
    },
    nameAndStatsSection: {
        flex: 1,
    },
    nameAndButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    displayName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    statItem: {
        alignItems: 'flex-start',
        marginRight: 24,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 14,
        color: theme.colorGrey,
        fontWeight: '400',
    },
    bio: {
        fontSize: 16,
        textAlign: 'left',
        lineHeight: 22,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    followButton: {
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 24,
    },
    followButtonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    section: {
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: theme.colorGrey,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '500',
    },
});
