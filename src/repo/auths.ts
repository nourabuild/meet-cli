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

    export type SuccessResponse = {
        success: true;
        data?: Token;
    };

    export type FailureResponse = {
        success: false;
        errors: string | FieldError[];
    };

    export type Response = SuccessResponse | FailureResponse;
}

const API_ROUTE_DOMAIN = "api/v1/auth";

const NewAuthRepository = (host: string): AuthRepository => {
    return {
        AuthenticateUser: async (formData: FormData): Promise<Auths.Response> => {
            // // Prepare request
            const data = {
                email: formData.get("email"),
                password: formData.get("password"),
            };

            // Make API call
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                // body: formData,
                body: JSON.stringify(data),
            });

            // Parse response
            let response: any;
            try {
                response = await req.json();
            } catch {
                return {
                    success: false,
                    errors: req.status >= 500
                        ? "Server error. Please try again later."
                        : "Invalid response from server. Please try again.",
                } satisfies Auths.FailureResponse;
            }

            // Handle success
            if (req.ok && response.access_token && response.refresh_token) {
                return {
                    success: true,
                    data: {
                        access_token: response.access_token,
                        refresh_token: response.refresh_token,
                        token_type: response.token_type || "bearer",
                    },
                } satisfies Auths.SuccessResponse;
            }

            // Handle errors
            if (req.status >= 500) {
                return {
                    success: false,
                    errors: "Server error. Please try again later.",
                } satisfies Auths.FailureResponse;
            }

            // Map known error codes to user-friendly messages
            const errorMessages: Record<string, string> = {
                "INCORRECT_EMAIL_OR_PASSWORD": "Incorrect email or password",
                "VALIDATION_EMAIL_REQUIRED": "Email is required",
                "VALIDATION_PASSWORD_REQUIRED": "Password is required",
                "VALIDATION_EMAIL_INVALID_EMAIL": "Invalid email format",
                "USER_NOT_FOUND": "User not found",
                "USER_INACTIVE": "Account is inactive",
            };

            if (response.errors instanceof Array) {
                return {
                    success: false,
                    errors: response.errors as Auths.FieldError[],
                } satisfies Auths.FailureResponse;
            }

            // Handle string errors
            const errorMessage = errorMessages[response.errors]
                || response.detail
                || response.errors
                || "Authentication failed";

            return {
                success: false,
                errors: errorMessage,
            } satisfies Auths.FailureResponse;
        },

        CreateUser: async (formData: FormData): Promise<Auths.Response> => {
            const req = await fetch(`${host}/${API_ROUTE_DOMAIN}/register`, {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                },
                body: formData,
            });

            // Parse response, tbd: unknown
            let response: any;
            try {
                response = await req.json();
            } catch {
                return {
                    success: false,
                    errors: req.status >= 500
                        ? "Server error. Please try again later."
                        : "Invalid response from server. Please try again.",
                } satisfies Auths.FailureResponse;
            }

            if (req.ok && response.id && response.email) {
                return {
                    success: true,
                } satisfies Auths.SuccessResponse;
            }

            // Handle server errors
            if (req.status >= 500) {
                return {
                    success: false,
                    errors: "Server error. Please try again later.",
                } satisfies Auths.FailureResponse;
            }

            // Error message mappings
            const errorMessages: Record<string, string> = {
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

            // Handle field-specific errors
            if (response.errors && typeof response.errors === "object" && !(response.errors instanceof Array)) {
                const fieldErrors: Auths.FieldError[] = Object.entries(response.errors).map(
                    ([field, errorCode]) => ({
                        field,
                        error: errorMessages[errorCode as string] || (errorCode as string)
                    })
                );

                return {
                    success: false,
                    errors: fieldErrors,
                } satisfies Auths.FailureResponse;
            }


            // Handle string errors
            const errorMessage = errorMessages[response.errors]
                || response.detail
                || response.errors
                || "Registration failed";

            return {
                success: false,
                errors: errorMessage,
            } satisfies Auths.FailureResponse;
        },

    };
};

export default NewAuthRepository;


// AuthenticateUser: async (formData: FormData): Promise<Auths.Response> => {

//             const email = formData.get("email")?.toString().trim();
//             const password = formData.get("password")?.toString().trim();

//             if (!email || !password) {
//                 const errors: Auths.FieldError[] = [];
//                 if (!email) errors.push({ field: "email", error: "Email is required" });
//                 if (!password) errors.push({ field: "password", error: "Password is required" });

//                 return {
//                     success: false,
//                     errors: errors.length === 1 ? errors[0].error : errors,
//                 } satisfies Auths.FailureResponse;
//             }

//             const req = await fetch(`${host}/api/v1/auth/login`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Accept": "application/json"
//                 },
//                 body: JSON.stringify({ email, password }),
//             });

//             // Parse response
//             let response: any;
//             try {
//                 response = await req.json();
//             } catch {
//                 return {
//                     success: false,
//                     errors: req.status >= 500
//                         ? "Server error. Please try again later."
//                         : "Invalid response from server. Please try again.",
//                 } satisfies Auths.FailureResponse;
//             }

//             // Handle success
//             if (req.ok && response.access_token && response.refresh_token) {
//                 return {
//                     success: true,
//                     data: {
//                         access_token: response.access_token,
//                         refresh_token: response.refresh_token,
//                         token_type: response.token_type || "Bearer",
//                     },
//                 } satisfies Auths.SuccessResponse;
//             }

//             // Handle server errors
//             if (req.status >= 500) {
//                 return {
//                     success: false,
//                     errors: "Server error. Please try again later.",
//                 } satisfies Auths.FailureResponse;
//             }

//             // Map known error codes
//             const errorMessages: Record<string, string> = {
//                 "INCORRECT_EMAIL_OR_PASSWORD": "Incorrect email or password",
//                 "VALIDATION_EMAIL_REQUIRED": "Email is required",
//                 "VALIDATION_PASSWORD_REQUIRED": "Password is required",
//                 "VALIDATION_EMAIL_INVALID_EMAIL": "Invalid email format",
//                 "USER_NOT_FOUND": "User not found",
//                 "USER_INACTIVE": "Account is inactive",
//             };

//             // Handle errors
//             if (Array.isArray(response.errors)) {
//                 return {
//                     success: false,
//                     errors: response.errors as Auths.FieldError[],
//                 } satisfies Auths.FailureResponse;
//             }

//             const errorMessage = errorMessages[response.errors]
//                 || response.detail
//                 || response.errors
//                 || "Authentication failed";

//             return {
//                 success: false,
//                 errors: errorMessage,
//             } satisfies Auths.FailureResponse;



//         },