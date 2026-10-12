// Test/demo-only service transport. These credentials and JWTs are synthetic and never valid on Supabase.
export function mockAuthTransport() {
  const realFetch = globalThis.fetch;
  const users = {
    "alice@example.test": "11111111-1111-4111-8111-111111111111",
    "bob@example.test": "22222222-2222-4222-8222-222222222222",
  };
  const make = (email) => {
    const user = {
      id: users[email],
      email,
      email_confirmed_at: new Date().toISOString(),
      created_at: "2026-01-01T00:00:00Z",
      user_metadata: { full_name: email.startsWith("alice") ? "Alice" : "Bob" },
    };
    const payload = btoa(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "authenticated",
        role: "authenticated",
      }),
    );
    return {
      access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`,
      refresh_token: `refresh-${user.id}`,
      token_type: "bearer",
      expires_in: 3600,
      user,
    };
  };
  globalThis.fetch = async (input, options = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.includes("supabase.co")) return realFetch(input, options);
    const body = options.body ? JSON.parse(options.body) : {};
    let data = {},
      status = 200;
    if (url.includes("/token")) {
      if (!users[body.email] || body.password !== "correct-password") {
        status = 400;
        data = { error_description: "Invalid login credentials", code: "invalid_credentials" };
      } else data = make(body.email);
    } else if (url.includes("/logout")) return new Response(null, { status: 204 });
    else if (url.includes("/signup")) data = { user: make("alice@example.test").user };
    else if (url.includes("/user")) data = make("alice@example.test").user;
    else if (url.includes("/rest/")) data = [];
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}
