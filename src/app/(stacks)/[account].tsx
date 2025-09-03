import { Text, View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';

import { theme } from "@/styles/theme";
import { FollowRepo, UserRepo } from "@/repo";
import { Users } from "@/repo/users";
import Navbar from "@/lib/utils/navigation-bar";
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



export default function ShowUserScreen() {
    const params = useLocalSearchParams<{ account: string }>();
    const [userState, setUserState] = useState<UserProfileState>({ status: "idle" });
    const [isFollowing, setIsFollowing] = useState<boolean>(false);
    const [followLoading, setFollowLoading] = useState<boolean>(false);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!params.account) {
                setUserState({ status: "error", error: "No account provided" });
                return;
            }

            setUserState({ status: "loading" });

            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) {
                    setUserState({ status: "error", error: "Authentication required. Please log in again." });
                    return;
                }

                // Fetch user data
                const userResponse = await UserRepo.GetByAccount(params.account, token);
                if (!userResponse.success) {
                    console.error('Failed to fetch user data:', userResponse.errors);
                    setUserState({
                        status: "error",
                        error: typeof userResponse.errors === "object" && userResponse.errors.length > 0
                            ? userResponse.errors[0].error
                            : "Failed to load user profile"
                    });
                    return;
                }

                const userData = userResponse.data;

                // Get follow counts for the user using GetUsersFollowCount
                const followCountResponse = await FollowRepo.GetUsersFollowCount(userData.id, token);
                let followersCount = 0;
                let followingCount = 0;

                if (followCountResponse.success && followCountResponse.data) {
                    const countData = followCountResponse.data as any;
                    // Try different possible response formats
                    if (typeof countData === 'object') {
                        // Check for various possible field names
                        followersCount = countData.followers_count || countData.followersCount ||
                            countData.followers || countData.follower_count || 0;
                        followingCount = countData.following_count || countData.followingCount ||
                            countData.following || countData.follow_count || 0;
                    }
                } else {
                }

                // Check if current user is following this user
                const myFollowingResponse = await FollowRepo.GetFollowing("", token); // Get my following list
                let isCurrentlyFollowing = false;
                if (myFollowingResponse.success && Array.isArray(myFollowingResponse.data)) {
                    // Check if the target user's ID is in my following list
                    isCurrentlyFollowing = myFollowingResponse.data.some((follow: any) =>
                        follow.following_id === userData.id
                    );
                } else if (myFollowingResponse.success && typeof myFollowingResponse.data === 'object' && myFollowingResponse.data && 'data' in myFollowingResponse.data) {
                    // Handle if the response is wrapped in a data object
                    const followList = (myFollowingResponse.data as any).data;
                    if (Array.isArray(followList)) {
                        isCurrentlyFollowing = followList.some((follow: any) =>
                            follow.following_id === userData.id
                        );
                    }
                }

                setIsFollowing(isCurrentlyFollowing);

                setUserState({
                    status: "success",
                    data: {
                        user: userData,
                        followersCount,
                        followingCount
                    }
                });

            } catch (error) {
                console.error('Error fetching user profile:', error);
                setUserState({
                    status: "error",
                    error: error instanceof Error ? error.message : "Network error. Please check your connection and try again.",
                });
            }
        };

        fetchUserProfile();
    }, [params.account]);

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
            year: 'numeric'
        });
    };

    const formatFollowerCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    const handleGoBack = () => {
        router.back();
    };

    const handleRetry = () => {
        setUserState({ status: "idle" });
        // Re-trigger the useEffect
        if (params.account) {
            const fetchUserProfile = async () => {
                setUserState({ status: "loading" });
                // ... (same logic as in useEffect)
            };
            fetchUserProfile();
        }
    };

    const handleMenuPress = () => {
        Alert.alert("Menu", "Menu functionality will be implemented later");
    };

    const handleFollowPress = async () => {
        if (userState.status !== "success") return;

        const { user } = userState.data;
        setFollowLoading(true);

        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (!token) {
                Alert.alert("Error", "Authentication required. Please log in again.");
                return;
            }

            if (isFollowing) {
                // Unfollow user
                const response = await FollowRepo.UnfollowUser(user.id, token);
                if (response.success) {
                    setIsFollowing(false);
                    // Update follower count - when you unfollow, their follower count decreases
                    setUserState(prev => {
                        if (prev.status === "success") {
                            return {
                                ...prev,
                                data: {
                                    ...prev.data,
                                    followersCount: prev.data.followersCount - 1
                                }
                            };
                        }
                        return prev;
                    });
                } else {
                    console.error('Unfollow error:', response.errors);
                    const errorMessage = response.errors && response.errors.length > 0
                        ? response.errors[0].error
                        : "Failed to unfollow user";
                    Alert.alert("Error", errorMessage);
                }
            } else {
                // Follow user
                const response = await FollowRepo.FollowUser(user.id, token);
                if (response.success) {
                    setIsFollowing(true);
                    // Update follower count - when you follow, their follower count increases
                    setUserState(prev => {
                        if (prev.status === "success") {
                            return {
                                ...prev,
                                data: {
                                    ...prev.data,
                                    followersCount: prev.data.followersCount + 1
                                }
                            };
                        }
                        return prev;
                    });
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
            setFollowLoading(false);
        }
    };

    if (userState.status === "loading") {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.container, { backgroundColor }]}>
                    <Navbar
                        backgroundColor={backgroundColor}
                    >
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                                <Feather name="arrow-left" size={24} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.title, { color: textColor }]}>User Profile</Text>
                            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                                <Feather name="more-horizontal" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>
                    </Navbar>
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
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.container, { backgroundColor }]}>
                    <Navbar
                        backgroundColor={backgroundColor}
                    >
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                                <Feather name="arrow-left" size={24} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.title, { color: textColor }]}>User Profile</Text>
                            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                                <Feather name="more-horizontal" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>
                    </Navbar>
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
        <View style={[styles.container, { backgroundColor }]}>
            <Navbar
                backgroundColor={backgroundColor}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <Feather name="arrow-left" size={20} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>{user.account}</Text>
                    <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                        <Feather name="more-horizontal" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>
            </Navbar>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.profileContent}>
                    {/* Avatar Section */}
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
                            {/* Stats Row */}
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

                    {/* Bio - only show if exists */}
                    {user.bio && (
                        <Text style={[styles.bio, { color: textColor }]}>{user.bio}</Text>
                    )}

                    {/* Follow/Unfollow Button */}
                    <TouchableOpacity
                        style={[styles.followButton, { backgroundColor: cardColor }]}
                        onPress={handleFollowPress}
                        disabled={followLoading}
                    >
                        <Text style={[styles.followButtonText, { color: textColor }]}>
                            {followLoading ? "Loading..." : isFollowing ? "Unfollow" : "Follow"}
                        </Text>
                    </TouchableOpacity>

                    {/* User Info Details */}
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
    backButton: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
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
