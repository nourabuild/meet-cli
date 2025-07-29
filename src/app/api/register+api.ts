/* eslint-disable @typescript-eslint/no-unused-vars */
export async function POST(request: Request): Promise<Response> {
    try {
        const { firstName, lastName, email, password } = await request.json();

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return new Response(
                JSON.stringify({ error: "All fields are required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(
                JSON.stringify({ error: "Invalid email format" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Password validation
        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // TODO: Check if user already exists in database
        // TODO: Hash password before storing

        // Simulate user creation
        const newUser = {
            id: "user-" + Date.now(),
            firstName,
            lastName,
            email,
            createdAt: new Date().toISOString(),
        };

        // TODO: Generate actual JWT token with proper secret
        const token = "demo-jwt-token-" + Date.now();

        return new Response(
            JSON.stringify({
                success: true,
                user: newUser,
                token,
                message: "Account created successfully",
            }),
            {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
