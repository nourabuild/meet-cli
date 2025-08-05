import { fetch } from "expo/fetch";
import { FollowRepository } from "./repository";
import { Users } from "./users";

export namespace Follows {
    export type Follow = {
        id: string;
        follower_id: string;
        following_id: string;
        created_at: string;
    };

    // Updated type to match the new API response with user objects
    export type FollowRelation = {
        id: string;
        following_id: string;
        user: Users.User;
        created_at: string;
        updated_at: string;
    };

    export type FollowListResponse = {
        data: Follow[];
        count: number;
    };

    // New type for the enhanced API response with user objects
    export type FollowingListResponse = {
        data: FollowRelation[];
        count: number;
    };

    type FieldError = {
        field: string;
        error: string;
    };

    type SuccessResponse = {
        success: true;
        data: Follow | Follow[] | FollowListResponse | FollowingListResponse;
    };

    type FailureResponse = {
        success: false;
        errors: FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;
}


const NewFollowRepository = (host: string): FollowRepository => {
    return {
        FollowUser: async (id: string, token: string): Promise<Follows.Response> => {
            const req = await fetch(`${host}/api/v1/follow/${id}/add`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to follow user" }],
                } satisfies Follows.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Follows.Response;
        },

        UnfollowUser: async (id: string, token: string): Promise<Follows.Response> => {
            const req = await fetch(`${host}/api/v1/follow/${id}/remove`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to unfollow user" }],
                } satisfies Follows.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Follows.Response;
        },

        GetFollowers: async (id: string, token: string): Promise<Follows.Response> => {
            const req = await fetch(`${host}/api/v1/follow/me/followers`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to get followers" }],
                } satisfies Follows.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Follows.Response;
        },

        GetFollowing: async (id: string, token: string): Promise<Follows.Response> => {
            const req = await fetch(`${host}/api/v1/follow/me/following`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                },
            });

            const response = await req.json();

            if (!req.ok) {
                return {
                    success: false,
                    errors: response.errors || [{ field: "general", error: "Failed to get following" }],
                } satisfies Follows.Response;
            }

            return {
                success: true,
                data: response.data,
            } satisfies Follows.Response;
        },
    }
}

export default NewFollowRepository;