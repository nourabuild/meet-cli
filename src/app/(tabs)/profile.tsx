import { Text, View, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useReducer } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { useCameraPermissions } from 'expo-camera';

import { useReduxSelector } from "@/lib/hooks";
import { useThemeColor } from "@/lib/hooks/theme/useThemeColor";
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
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');

    const currentUser = useReduxSelector((state) => state.user?.user);

    const [permission, requestPermission] = useCameraPermissions();

    // State management using reducers (same pattern as login/register)
    const [profileData, dispatchProfileData] = useReducer(profileDataReducer, initialProfileData);
    const [profileState, setProfileState] = useReducer(
        (state: ProfileState, newState: ProfileState) => newState,
        { status: "idle" }
    );


    useEffect(() => {
        if (!currentUser?.account) return;

        const getFollowing = async () => {
            try {
                setProfileState({ status: "loading" });
                const token = await SecureStore.getItemAsync("access_token");
                if (!token) {
                    setProfileState({ status: "error", error: "No access token found" });
                    return;
                }

                const response = await FollowRepo.GetFollowing(currentUser.account, token);
                if (response.success) {
                    const followingCount = Array.isArray(response.data)
                        ? response.data.length
                        : (response.data as any).data?.length || 0;
                    dispatchProfileData({
                        type: "SET_FOLLOWING",
                        data: { followingCount },
                    });
                    setProfileState({
                        status: "success",
                        data: { followersCount: profileData.followersCount, followingCount },
                    });
                } else {
                    setProfileState({ status: "error", error: response.errors[0]?.error || "Unknown error" });
                }
            } catch (error) {
                console.error("Error fetching following data:", error);
                setProfileState({
                    status: "error",
                    error: error instanceof Error ? error.message : "Failed to load following data",
                });
            }
        };

        const getFollowers = async () => {
            try {
                setProfileState({ status: "loading" });
                const token = await SecureStore.getItemAsync("access_token");
                if (!token) {
                    setProfileState({ status: "error", error: "No access token found" });
                    return;
                }

                const response = await FollowRepo.GetFollowers(currentUser.account, token);
                if (response.success) {
                    const followersCount = Array.isArray(response.data)
                        ? response.data.length
                        : (response.data as any).data?.length || 0;
                    dispatchProfileData({
                        type: "SET_FOLLOWERS",
                        data: { followersCount },
                    });
                    setProfileState({
                        status: "success",
                        data: { followersCount, followingCount: profileData.followingCount },
                    });
                } else {
                    setProfileState({ status: "error", error: response.errors[0]?.error || "Unknown error" });
                }
            } catch (error) {
                console.error("Error fetching followers data:", error);
                setProfileState({
                    status: "error",
                    error: error instanceof Error ? error.message : "Failed to load followers data",
                });
            }
        };

        getFollowers();
        getFollowing();
    }, [currentUser?.account, profileData.followersCount, profileData.followingCount]);



    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleCameraPress = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission required', 'Camera permission is needed to take photos.');
                return;
            }
        }

        Alert.alert(
            'Add Photo',
            'Choose an option',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Camera', onPress: () => console.log('Opening camera...') },
                { text: 'Gallery', onPress: () => console.log('Opening gallery...') }
            ]
        );
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
        <View style={[styles.container, { backgroundColor }]}>

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
                                    <View style={[styles.avatarFallback, { backgroundColor: theme.colorNouraBlue }]}>
                                        <Text style={[styles.avatarInitials, { color: theme.colorWhite }]}>
                                            {getInitials(currentUser.name)}
                                        </Text>
                                    </View>
                                )}
                                {/* Add Photo Button */}
                                <TouchableOpacity
                                    style={[styles.addPhotoButton, { backgroundColor: theme.colorNouraBlue, borderColor: cardColor }]}
                                    onPress={handleCameraPress}
                                >
                                    <Feather name="plus" size={16} color={theme.colorWhite} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.nameAndStatsSection}>
                                <View style={styles.nameAndButtonRow}>
                                    <Text style={[styles.displayName, { color: textColor }]}>{currentUser.name}</Text>
                                </View>
                                {/* Stats Row */}
                                <View style={styles.statsRow}>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => router.push('/show-follow?tab=followers')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.statNumber, { color: textColor }]}>
                                            {profileState.status === "loading" ? '...' : formatFollowerCount(profileData.followersCount)}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: theme.colorGrey }]}>followers</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.statItem}
                                        onPress={() => router.push('/show-follow?tab=following')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.statNumber, { color: textColor }]}>
                                            {profileState.status === "loading" ? '...' : formatFollowerCount(profileData.followingCount)}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: theme.colorGrey }]}>following</Text>
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
                <TouchableOpacity style={[styles.editButton, { backgroundColor: cardColor }]}>
                    <Text style={[styles.editButtonText, { color: textColor }]}>Edit profile</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // header: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     alignItems: 'center',
    // },
    // title: {
    //     fontSize: 28,
    //     fontWeight: "bold",
    // },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    avatarAndNameSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    addPhotoButton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
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
    },
    editButton: {
        borderRadius: 6,
        paddingVertical: 8,
        marginHorizontal: 20,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 14,
        fontWeight: '400',
    },
    bio: {
        fontSize: 16,
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
