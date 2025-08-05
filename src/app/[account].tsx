import { Text, View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';

import { theme } from "@/styles/theme";
import { FollowRepo, UserRepo } from "@/repo";
import { Users } from "@/repo/users";

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
                    console.log('No access token found');
                    setUserState({ status: "error", error: "Authentication required. Please log in again." });
                    return;
                }

                // Fetch user data
                const userResponse = await UserRepo.GetByAccount(params.account, token);
                console.log('GetByAccount response:', JSON.stringify(userResponse, null, 2));

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

                // Fetch following count for the profile user
                const followingResponse = await FollowRepo.GetFollowing(userData.id, token);
                console.log('Following response:', JSON.stringify(followingResponse, null, 2));

                let followingCount = 0;
                if (followingResponse.success) {
                    if (typeof followingResponse.data === 'object' && followingResponse.data && 'count' in followingResponse.data) {
                        const count = (followingResponse.data as any).count;
                        if (typeof count === 'number') {
                            followingCount = count;
                        }
                    } else if (Array.isArray(followingResponse.data)) {
                        followingCount = followingResponse.data.length;
                    } else {
                        followingCount = 0;
                    }
                }

                // Fetch followers count for the profile user
                const followersResponse = await FollowRepo.GetFollowers(userData.id, token);
                console.log('Followers response:', JSON.stringify(followersResponse, null, 2));

                let followersCount = 0;
                if (followersResponse.success) {
                    if (typeof followersResponse.data === 'object' && followersResponse.data && 'count' in followersResponse.data) {
                        const count = (followersResponse.data as any).count;
                        if (typeof count === 'number') {
                            followersCount = count;
                        }
                    } else if (Array.isArray(followersResponse.data)) {
                        followersCount = followersResponse.data.length;
                    } else {
                        followersCount = 0;
                    }
                }

                // Check if current user is following this user
                const myFollowingResponse = await FollowRepo.GetFollowing("", token); // Get my following list
                console.log('My following response:', JSON.stringify(myFollowingResponse, null, 2));

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
                <SafeAreaView style={styles.container} edges={['top']}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                                <Feather name="arrow-left" size={24} color={theme.colorBlack} />
                            </TouchableOpacity>
                            <Text style={styles.title}>User Profile</Text>
                        </View>
                        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                            <Feather name="more-horizontal" size={24} color={theme.colorBlack} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.centerContainer}>
                        <Text style={styles.loadingText}>Loading user profile...</Text>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    if (userState.status === "error") {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={styles.container} edges={['top']}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                                <Feather name="arrow-left" size={24} color={theme.colorBlack} />
                            </TouchableOpacity>
                            <Text style={styles.title}>User Profile</Text>
                        </View>
                        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                            <Feather name="more-horizontal" size={24} color={theme.colorBlack} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.centerContainer}>
                        <Feather name="alert-circle" size={48} color={theme.colorGrey} />
                        <Text style={styles.errorTitle}>Error</Text>
                        <Text style={styles.errorText}>{userState.error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleRetry}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    if (userState.status !== "success") {
        return null;
    }

    const { user, followersCount, followingCount } = userState.data;

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                            <Feather name="arrow-left" size={24} color={theme.colorBlack} />
                        </TouchableOpacity>
                        <Text style={styles.title}>{user.account}</Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                        <Feather name="more-horizontal" size={24} color={theme.colorBlack} />
                    </TouchableOpacity>
                </View>

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
                                    <Text style={styles.displayName}>{user.name}</Text>
                                </View>
                                {/* Stats Row */}
                                <View style={styles.statsRow}>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => {/* TODO: Navigate to followers */ }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.statNumber}>
                                            {formatFollowerCount(followersCount)}
                                        </Text>
                                        <Text style={styles.statLabel}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => {/* TODO: Navigate to following */ }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.statNumber}>
                                            {formatFollowerCount(followingCount)}
                                        </Text>
                                        <Text style={styles.statLabel}>following</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Bio - only show if exists */}
                        {user.bio && (
                            <Text style={styles.bio}>{user.bio}</Text>
                        )}

                        {/* Follow/Unfollow Button */}
                        <TouchableOpacity
                            style={styles.followButton}
                            onPress={handleFollowPress}
                            disabled={followLoading}
                        >
                            <Text style={styles.followButtonText}>
                                {followLoading ? "Loading..." : isFollowing ? "Unfollow" : "Follow"}
                            </Text>
                        </TouchableOpacity>

                        {/* User Info Details */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Details</Text>

                            <View style={styles.detailItem}>
                                <Feather name="mail" size={20} color={theme.colorNouraBlue} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Email</Text>
                                    <Text style={styles.detailValue}>{user.email}</Text>
                                </View>
                            </View>

                            {user.phone && (
                                <View style={styles.detailItem}>
                                    <Feather name="phone" size={20} color={theme.colorNouraBlue} />
                                    <View style={styles.detailText}>
                                        <Text style={styles.detailLabel}>Phone</Text>
                                        <Text style={styles.detailValue}>{user.phone}</Text>
                                    </View>
                                </View>
                            )}

                            <View style={styles.detailItem}>
                                <Feather name="calendar" size={20} color={theme.colorNouraBlue} />
                                <View style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Joined</Text>
                                    <Text style={styles.detailValue}>
                                        {formatJoinDate(user.created_at)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
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
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        fontSize: 16,
        color: theme.colorGrey,
        textAlign: 'center',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colorBlack,
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
        paddingHorizontal: 24,
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
        color: theme.colorBlack,
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
        color: theme.colorBlack,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 14,
        color: theme.colorGrey,
        fontWeight: '400',
    },
    bio: {
        fontSize: 16,
        color: theme.colorBlack,
        textAlign: 'left',
        lineHeight: 22,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    followButton: {
        backgroundColor: theme.colorLightGrey,
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 24,
    },
    followButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        textAlign: 'center',
    },
    section: {
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colorLightGrey,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colorBlack,
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
        color: theme.colorBlack,
    },
});
