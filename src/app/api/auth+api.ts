/* eslint-disable @typescript-eslint/no-unused-vars */
export async function POST(request: Request): Promise<Response> {
    try {
        const { email, password } = await request.json();

        // TODO: Implement actual authentication logic
        // This would typically validate against a database
        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: "Email and password are required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Simulate authentication check
        if (email === "demo@wall.com" && password === "password123") {
            // TODO: Generate actual JWT token with proper secret
            const token = "demo-jwt-token-" + Date.now();

            return new Response(
                JSON.stringify({
                    success: true,
                    user: {
                        id: "1",
                        email,
                        firstName: "Demo",
                        lastName: "User",
                    },
                    token,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid credentials" }),
            {
                status: 401,
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
