import { Text, View, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useReducer, useRef } from 'react';
import Feather from '@expo/vector-icons/Feather';

import { useReduxSelector } from "@/lib/hooks";
import { theme } from "@/styles/theme";

import { FollowRepo } from "@/repo";

// -------------------------------
// State Management
// -------------------------------

type ProfileState =
    | { status: "idle" }
    | { status: "loading" }
    | {
        status: "error";
        error: string
    }
    | {
        status: "success";
        data: {
            followersCount: number;
            followingCount: number;
        };
    };

type ProfileData = {
    followersCount: number;
    followingCount: number;
};

const initialProfileData: ProfileData = {
    followersCount: 0,
    followingCount: 0,
};

function profileDataReducer(state: ProfileData, action: { type: string; data: Partial<ProfileData> }) {
    switch (action.type) {
        case 'SET_FOLLOWERS':
            return { ...state, followersCount: action.data.followersCount || 0 };
        case 'SET_FOLLOWING':
            return { ...state, followingCount: action.data.followingCount || 0 };
        case 'SET_ALL':
            return { ...state, ...action.data };
        case 'RESET':
            return initialProfileData;
        default:
            return state;
    }
}

export default function ProfileScreen() {
    const currentUser = useReduxSelector((state) => state.user);

    // State management using reducers (same pattern as login/register)
    const [profileData, dispatchProfileData] = useReducer(profileDataReducer, initialProfileData);
    const [profileState, setProfileState] = useReducer(
        (state: ProfileState, newState: ProfileState) => newState,
        { status: "idle" }
    );

    // Ref to track if we've already fetched follow data to prevent re-fetches
    const hasLoadedFollowData = useRef<boolean>(false);

    useEffect(() => {
        const fetchFollowData = async () => {
            if (!currentUser?.account || hasLoadedFollowData.current) return;

            hasLoadedFollowData.current = true;

            try {
                setProfileState({ status: "loading" });

                // Get access token
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) {
                    console.log('No access token found');
                    setProfileState({ status: "error", error: "No access token found" });
                    return;
                }

                // Fetch following count
                const followingResponse = await FollowRepo.GetFollowing(currentUser.account, token);
                console.log('Following response:', JSON.stringify(followingResponse, null, 2));

                let followingCount = 0;
                if (followingResponse.success) {
                    // Check if response has count property, otherwise use data array length
                    if (typeof followingResponse.data === 'object' && followingResponse.data && 'count' in followingResponse.data) {
                        const count = (followingResponse.data as any).count;
                        console.log('Using count from response:', count);
                        if (typeof count === 'number') {
                            followingCount = count;
                        }
                    } else if (Array.isArray(followingResponse.data)) {
                        console.log('Using array length:', followingResponse.data.length);
                        followingCount = followingResponse.data.length;
                    } else {
                        console.log('Using fallback count: 1');
                        followingCount = 1;
                    }
                }

                // Fetch followers count
                const followersResponse = await FollowRepo.GetFollowers(currentUser.account, token);
                console.log('Followers response:', JSON.stringify(followersResponse, null, 2));

                let followersCount = 0;
                if (followersResponse.success) {
                    // Check if response has count property, otherwise use data array length
                    if (typeof followersResponse.data === 'object' && followersResponse.data && 'count' in followersResponse.data) {
                        const count = (followersResponse.data as any).count;
                        console.log('Using count from response:', count);
                        if (typeof count === 'number') {
                            followersCount = count;
                        }
                    } else if (Array.isArray(followersResponse.data)) {
                        console.log('Using array length:', followersResponse.data.length);
                        followersCount = followersResponse.data.length;
                    } else {
                        console.log('Using fallback count: 1');
                        followersCount = 1;
                    }
                }

                // Update state with both counts
                dispatchProfileData({
                    type: 'SET_ALL',
                    data: { followersCount, followingCount }
                });

                setProfileState({
                    status: "success",
                    data: { followersCount, followingCount }
                });

            } catch (error) {
                console.error('Error fetching follow data:', error);
                setProfileState({
                    status: "error",
                    error: error instanceof Error ? error.message : "Failed to load profile data"
                });
            }
        };

        fetchFollowData();
    }, [currentUser?.account]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };



    const formatFollowerCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>{currentUser?.account || 'Profile'}</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => router.push('/profile-settings')}
                >
                    <Feather name="settings" size={24} color={theme.colorBlack} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {currentUser && (
                    <View style={styles.profileContent}>
                        {/* Avatar Section */}
                        <View style={styles.avatarAndNameSection}>
                            <View style={styles.avatarContainer}>
                                {currentUser.avatar_photo_id ? (
                                    <Image
                                        source={{ uri: `https://api.example.com/photos/${currentUser.avatar_photo_id}` }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarInitials}>
                                            {getInitials(currentUser.name)}
                                        </Text>
                                    </View>
                                )}
                                {/* Add Photo Button */}
                                <TouchableOpacity style={styles.addPhotoButton}>
                                    <Feather name="plus" size={16} color={theme.colorWhite} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.nameAndStatsSection}>
                                <View style={styles.nameAndButtonRow}>
                                    <Text style={styles.displayName}>{currentUser.name}</Text>
                                </View>
                                {/* Stats Row */}
                                <View style={styles.statsRow}>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => router.push('/follow-details?tab=followers')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.statNumber}>
                                            {profileState.status === "loading" ? '...' : formatFollowerCount(profileData.followersCount)}
                                        </Text>
                                        <Text style={styles.statLabel}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => router.push('/follow-details?tab=following')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.statNumber}>
                                            {profileState.status === "loading" ? '...' : formatFollowerCount(profileData.followingCount)}
                                        </Text>
                                        <Text style={styles.statLabel}>following</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Bio - only show if exists */}
                        {currentUser.bio && (
                            <Text style={styles.bio}>{currentUser.bio}</Text>
                        )}

                        {/* Error Display */}
                        {profileState.status === "error" && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{profileState.error}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Edit Profile Button */}
                <TouchableOpacity style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit profile</Text>
                </TouchableOpacity>


            </ScrollView>
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
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colorBlack,
    },
    settingsButton: {
        padding: 8,
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
        position: 'relative',
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
    addPhotoButton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colorNouraBlue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colorWhite,
    },
    nameAndStatsSection: {
        flex: 1,
    },
    nameAndButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    displayName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colorBlack,
    },
    editButton: {
        backgroundColor: theme.colorLightGrey,
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 24,
        marginTop: 8,
        marginBottom: 8,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colorBlack,
        textAlign: 'center',
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
    errorContainer: {
        marginVertical: 16,
        backgroundColor: '#ffebee',
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '500',
    },
});
