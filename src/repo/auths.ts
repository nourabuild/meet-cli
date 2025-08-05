import { fetch } from "expo/fetch";
import { AuthRepository } from "./repository";


export namespace Auths {
    export type Token = {
        access_token: string;
        refresh_token: string;
        token_type: string;
    };

    export type FieldError = {
        field: string;
        error: string;
    };

    type SuccessResponse = {
        success: true;
        data: Token;
    };

    type FailureResponse = {
        success: false;
        errors: string | FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;
}


const NewAuthRepository = (host: string): AuthRepository => {
    return {
        AuthenticateUser: async (formData: FormData): Promise<Auths.Response> => {
            try {
                const data = {
                    email: formData.get("email"),
                    password: formData.get("password"),
                };

                console.log("Login request data:", { email: data.email, password: "***" });
                console.log("Attempting to authenticate user...");

                const req = await fetch(`${host}/api/v1/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(data),
                });

                console.log("Request completed, status:", req.status);

                let response;
                try {
                    response = await req.json();
                    console.log("Raw backend response:", response);
                } catch (jsonError) {
                    console.error("Failed to parse JSON response:", jsonError);

                    // Handle cases where server returns non-JSON response (like 500 HTML error pages)
                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: "Server error. Please try again later.",
                        } satisfies Auths.Response;
                    }

                    return {
                        success: false,
                        errors: "Invalid response from server. Please try again.",
                    } satisfies Auths.Response;
                }

                if (!req.ok) {
                    // Handle different HTTP status codes
                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: "Server error. Please try again later.",
                        } satisfies Auths.Response;
                    }

                    // Handle authentication errors (401, 422, etc.)
                    const err: Record<string, string> = {
                        "INCORRECT_EMAIL_OR_PASSWORD": "Incorrect email or password",
                        "VALIDATION_EMAIL_REQUIRED": "Email is required",
                        "VALIDATION_PASSWORD_REQUIRED": "Password is required",
                        "VALIDATION_EMAIL_INVALID_EMAIL": "Invalid email format",
                        "USER_NOT_FOUND": "User not found",
                        "USER_INACTIVE": "Account is inactive",
                    };

                    const error = err[response.errors] || response.detail || response.errors || "Authentication failed";

                    return {
                        success: false,
                        errors: error,
                    } satisfies Auths.Response;
                }

                // Validate response structure
                if (!response.access_token || !response.refresh_token) {
                    console.error("Invalid response structure:", response);
                    return {
                        success: false,
                        errors: "Invalid response from server. Please try again.",
                    } satisfies Auths.Response;
                }

                return {
                    success: true,
                    data: {
                        access_token: response.access_token,
                        refresh_token: response.refresh_token,
                        token_type: response.token_type || "Bearer",
                    },
                } satisfies Auths.Response;
            } catch (error: any) {
                console.error("Authentication error:", error);

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
                    errors: errorMessage,
                } satisfies Auths.Response;
            }
        },
        CreateUser: async (formData: FormData): Promise<Auths.Response> => {
            try {
                console.log("Attempting to create user...");

                const req = await fetch(`${host}/api/v1/auth/register`, {
                    method: "POST",
                    // Don't set Content-Type header - let browser set it automatically for FormData
                    headers: {
                        "Accept": "application/json"
                    },
                    body: formData, // Send FormData directly, not JSON
                });

                console.log("Request completed, status:", req.status);

                let response;
                try {
                    response = await req.json();
                    console.log("Raw register backend response:", response);
                } catch (jsonError) {
                    console.error("Failed to parse JSON response:", jsonError);

                    // Handle cases where server returns non-JSON response (like 500 HTML error pages)
                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: "Server error. Please try again later.",
                        } satisfies Auths.Response;
                    }

                    return {
                        success: false,
                        errors: "Invalid response from server. Please try again.",
                    } satisfies Auths.Response;
                }

                if (!req.ok) {
                    // Handle different HTTP status codes
                    if (req.status >= 500) {
                        return {
                            success: false,
                            errors: "Server error. Please try again later.",
                        } satisfies Auths.Response;
                    }

                    const err: Record<string, string> = {
                        "EMAIL_ALREADY_REGISTERED": "Email already exists",
                        "ACCOUNT_NAME_ALREADY_TAKEN": "Account is taken",
                        "VALIDATION_PASSWORD_TOO_SHORT": "Password is too weak",
                        "VALIDATION_PASSWORD_TOO_LONG": "Password is too long",
                        "PASSWORDS_DO_NOT_MATCH": "Passwords do not match",
                        "VALIDATION_EMAIL_INVALID_EMAIL": "Invalid email format",
                        "REQUIRED_FIELD_MISSING": "Required field missing",
                        "VALIDATION_BODY_REQUIRED": "Required field missing",
                        "VALIDATION_NAME_REQUIRED": "Name is required",
                        "VALIDATION_ACCOUNT_REQUIRED": "Account name is required",
                        "VALIDATION_EMAIL_REQUIRED": "Email is required",
                        "VALIDATION_PASSWORD_REQUIRED": "Password is required",
                    };

                    if (response.errors && typeof response.errors === "object") {
                        const fieldErrors: Auths.FieldError[] = [];

                        for (const [field, errorCode] of Object.entries(response.errors)) {
                            const errorMessage = err[errorCode as string] || (errorCode as string);
                            fieldErrors.push({
                                field: field,
                                error: errorMessage
                            });
                        }

                        return {
                            success: false,
                            errors: fieldErrors,
                        } satisfies Auths.Response;
                    }

                    // Fallback for simple string errors
                    const error = err[response.errors] || response.detail || response.errors || "Registration failed";

                    return {
                        success: false,
                        errors: error,
                    } satisfies Auths.Response;
                }

                // Validate response structure - for registration, backend returns user object
                // Registration doesn't return tokens, just user data
                if (!response.id || !response.email) {
                    console.error("Invalid response structure:", response);
                    return {
                        success: false,
                        errors: "Invalid response from server. Please try again.",
                    } satisfies Auths.Response;
                }

                // Registration successful - return success without token data
                // The frontend will handle redirect to login page
                return {
                    success: true,
                    data: {
                        access_token: "", // Not provided by registration endpoint
                        refresh_token: "", // Not provided by registration endpoint
                        token_type: "Bearer",
                    },
                } satisfies Auths.Response;
            } catch (error: any) {
                console.error("Registration error:", error);

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
                    errors: errorMessage,
                } satisfies Auths.Response;
            }
        },
    };
};

export default NewAuthRepository;
