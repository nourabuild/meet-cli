import { fetch } from "expo/fetch";
import { UserRepository } from "./repository";


export namespace Users {
    export type User = {
        id: string;
        name: string;
        email: string;
        account: string;
        roles: string;
        is_active: boolean;
        is_verified: boolean;
        is_superuser: boolean;
        bio: string | null;
        dob: string | null;
        phone: string | null;
        avatar_photo_id: string | null;
        deleted_at: string | null;
        created_at: string;
        updated_at: string;
    };

    type FieldError = {
        field: string;
        error: string;
    };

    type SuccessResponse = {
        success: true;
        data: User;
    };

    type FailureResponse = {
        success: false;
        errors: FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;

    // Separate type for search results that includes count and data array
    export type SearchResponse = {
        success: true;
        data: {
            count: number;
            data: User[];
        };
    } | {
        success: false;
        errors: FieldError[];
    };
}

const NewUserRepository = (host: string): UserRepository => {
    return {
        GetByAccount: async (account: string, token: string) => {
            try {
                console.log("GetByAccount: Making request to:", `${host}/api/v1/user/${account}`);
                console.log("GetByAccount: Using token:", token.substring(0, 50) + "...");

                const req = await fetch(`${host}/api/v1/user/${account}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                });

                console.log("GetByAccount: Response status:", req.status);

                let response;
                try {
                    response = await req.json();
                    console.log("GetByAccount: Response data:", response);
                } catch (jsonError) {
                    console.error("GetByAccount: Failed to parse JSON response:", jsonError);

                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: [{ field: "account", error: "Server error. Please try again later." }],
                        } satisfies Users.Response;
                    }

                    return {
                        success: false,
                        errors: [{ field: "account", error: "Invalid response from server." }],
                    } satisfies Users.Response;
                }

                if (!req.ok) {
                    console.log("GetByAccount failure response:", response);

                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: [{ field: "account", error: "Server error. Please try again later." }],
                        } satisfies Users.Response;
                    }

                    const errorMessage =
                        typeof response?.errors === "object"
                            ? Object.values(response.errors).join(", ")
                            : response?.detail ?? "Failed to fetch user";

                    return {
                        success: false,
                        errors: [{ field: "account", error: errorMessage }],
                    } satisfies Users.Response;
                }

                return {
                    success: true,
                    data: response,
                } satisfies Users.Response;
            } catch (error: any) {
                console.error("GetByAccount error:", error);

                // Handle network errors inline
                let errorMessage = "An unexpected error occurred. Please try again.";

                if (error?.message?.includes('ECONNREFUSED') || error?.code === 'ECONNREFUSED') {
                    errorMessage = "Unable to connect to server. Please check your internet connection or try again later.";
                } else if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
                    errorMessage = "Request timed out. Please check your internet connection and try again.";
                } else if (error?.message?.includes('ENETUNREACH') || error?.code === 'ENETUNREACH') {
                    errorMessage = "Network unreachable. Please check your internet connection.";
                } else if (error?.message?.includes('ENOTFOUND') || error?.code === 'ENOTFOUND') {
                    errorMessage = "Cannot reach server. Please check your internet connection.";
                } else if (error instanceof TypeError && error?.message?.includes('fetch')) {
                    errorMessage = "Network error. Please check your internet connection and try again.";
                } else if (error?.name === 'AbortError') {
                    errorMessage = "Request was cancelled.";
                }

                return {
                    success: false,
                    errors: [{ field: "account", error: errorMessage }],
                } satisfies Users.Response;
            }
        },
        WhoAmI: async (token: string) => {
            try {
                console.log("WhoAmI: Making request to:", `${host}/api/v1/user/me`);
                console.log("WhoAmI: Using token:", token.substring(0, 50) + "...");

                const req = await fetch(`${host}/api/v1/user/me`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                });

                console.log("WhoAmI: Response status:", req.status);

                let response;
                try {
                    response = await req.json();
                    console.log("WhoAmI: Response data:", response);
                } catch (jsonError) {
                    console.error("WhoAmI: Failed to parse JSON response:", jsonError);

                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: [{ field: "whoami", error: "Server error. Please try again later." }],
                        } satisfies Users.Response;
                    }

                    return {
                        success: false,
                        errors: [{ field: "whoami", error: "Invalid response from server." }],
                    } satisfies Users.Response;
                }

                if (!req.ok) {
                    console.log("WhoAmI failure response:", response);

                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: [{ field: "whoami", error: "Server error. Please try again later." }],
                        } satisfies Users.Response;
                    }

                    const errorMessage =
                        typeof response?.errors === "object"
                            ? Object.values(response.errors).join(", ")
                            : response?.detail ?? "Failed to fetch user";

                    return {
                        success: false,
                        errors: [{ field: "whoami", error: errorMessage }],
                    } satisfies Users.Response;
                }

                return {
                    success: true,
                    data: response,
                } satisfies Users.Response;
            } catch (error: any) {
                console.error("WhoAmI error:", error);

                // Handle network errors inline
                let errorMessage = "An unexpected error occurred. Please try again.";

                if (error?.message?.includes('ECONNREFUSED') || error?.code === 'ECONNREFUSED') {
                    errorMessage = "Unable to connect to server. Please check your internet connection or try again later.";
                } else if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
                    errorMessage = "Request timed out. Please check your internet connection and try again.";
                } else if (error?.message?.includes('ENETUNREACH') || error?.code === 'ENETUNREACH') {
                    errorMessage = "Network unreachable. Please check your internet connection.";
                } else if (error?.message?.includes('ENOTFOUND') || error?.code === 'ENOTFOUND') {
                    errorMessage = "Cannot reach server. Please check your internet connection.";
                } else if (error instanceof TypeError && error?.message?.includes('fetch')) {
                    errorMessage = "Network error. Please check your internet connection and try again.";
                } else if (error?.name === 'AbortError') {
                    errorMessage = "Request was cancelled.";
                }

                return {
                    success: false,
                    errors: [{ field: "whoami", error: errorMessage }],
                } satisfies Users.Response;
            }
        },
        SearchUsers: async (query: string, token: string, signal: AbortSignal) => {
            try {
                const searchUrl = `${host}/api/v1/user/search?q=${encodeURIComponent(query)}`;
                // console.log("SearchUsers: Making request to:", searchUrl);
                // console.log("SearchUsers: Using token:", token.substring(0, 50) + "...");

                const req = await fetch(searchUrl, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                    signal,
                });

                // console.log("SearchUsers: Response status:", req.status);

                let response;
                try {
                    response = await req.json();
                    // console.log("SearchUsers: Response data:", response);
                } catch (jsonError) {
                    console.error("SearchUsers: Failed to parse JSON response:", jsonError);

                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: [{ field: "searchusers", error: "Server error. Please try again later." }],
                        } satisfies Users.SearchResponse;
                    }

                    return {
                        success: false,
                        errors: [{ field: "searchusers", error: "Invalid response from server." }],
                    } satisfies Users.SearchResponse;
                }

                if (!req.ok) {
                    console.log("SearchUsers failure response:", response);

                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: [{ field: "searchusers", error: "Server error. Please try again later." }],
                        } satisfies Users.SearchResponse;
                    }

                    const errorMessage =
                        typeof response?.errors === "object"
                            ? Object.values(response.errors).join(", ")
                            : response?.detail ?? "Failed to search users";

                    return {
                        success: false,
                        errors: [{ field: "searchusers", error: errorMessage }],
                    } satisfies Users.SearchResponse;
                }

                return {
                    success: true,
                    data: response,
                } satisfies Users.SearchResponse;
            } catch (error: any) {
                console.error("SearchUsers error:", error);

                // Handle network errors inline
                let errorMessage = "An unexpected error occurred. Please try again.";

                if (error?.message?.includes('ECONNREFUSED') || error?.code === 'ECONNREFUSED') {
                    errorMessage = "Unable to connect to server. Please check your internet connection or try again later.";
                } else if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
                    errorMessage = "Request timed out. Please check your internet connection and try again.";
                } else if (error?.message?.includes('ENETUNREACH') || error?.code === 'ENETUNREACH') {
                    errorMessage = "Network unreachable. Please check your internet connection.";
                } else if (error?.message?.includes('ENOTFOUND') || error?.code === 'ENOTFOUND') {
                    errorMessage = "Cannot reach server. Please check your internet connection.";
                } else if (error instanceof TypeError && error?.message?.includes('fetch')) {
                    errorMessage = "Network error. Please check your internet connection and try again.";
                } else if (error?.name === 'AbortError') {
                    errorMessage = "Request was cancelled.";
                }

                return {
                    success: false,
                    errors: [{ field: "searchusers", error: errorMessage }],
                } satisfies Users.SearchResponse;
            }
        },
        UpdateUser: async (formData: FormData, token: string) => {
            console.log("UpdateUser: Making request to:", `${host}/api/v1/user/update`);
            console.log("UpdateUser: Using token:", token.substring(0, 50) + "...");

            const data = {
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                bio: formData.get("bio") as string | null,
                dob: formData.get("dob") as string | null,
                phone: formData.get("phone") as string | null,
            }

            const req = await fetch(`${host}/api/v1/user/update`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            console.log("UpdateUser: Response status:", req.status);
            const response = await req.json();
            console.log("UpdateUser: Response data:", response);

            if (!req.ok) {
                console.log("UpdateUser failure response:", response);

                const errorMessage =
                    typeof response?.errors === "object"
                        ? Object.values(response.errors).join(", ")
                        : response?.detail ?? "Failed to update user";

                return {
                    success: false,
                    errors: [{ field: "updateuser", error: errorMessage }],
                } satisfies Users.Response;
            }

            return {
                success: true,
                data: response,
            } satisfies Users.Response;
        },
    };
};


export default NewUserRepository;
