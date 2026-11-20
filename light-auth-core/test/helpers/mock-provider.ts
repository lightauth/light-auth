import { createHash, randomBytes } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

export type MockUser = { sub: string; email: string; name: string; tid?: string };

export type AuthorizeOptions = {
  user: MockUser;
  /** Issue an id_token (OpenID Connect token endpoint) */
  oidc?: boolean;
  /** iss claim of the id_token, the mock origin by default */
  issuer?: string;
  /** Claims overriding the id_token ones (aud included) */
  idTokenOverrides?: Record<string, unknown>;
  /** Sign the id_token with a key that is not published in the JWKS */
  badSignature?: boolean;
};

type CodeEntry = AuthorizeOptions & {
  clientId: string;
  redirectUri: string;
  codeChallenge: string | null;
  nonce: string | null;
  scope: string;
};

export type MockProvider = Awaited<ReturnType<typeof createMockProvider>>;

/**
 * In-memory OAuth 2.0 / OpenID Connect provider, used as the global fetch.
 * OpenID Connect endpoints: discovery, /jwks, /token (id_token), /userinfo, /revoke.
 * OAuth 2.0 endpoints (GitHub like, no id_token): /oauth2/token, /oauth2/user, /oauth2/emails.
 * Clients authenticate with the secret `secret:<client_id>`.
 */
export async function createMockProvider(origin: string) {
  const signingKey = await generateKeyPair("RS256");
  const rogueKey = await generateKeyPair("RS256");
  const publicJwk = { ...(await exportJWK(signingKey.publicKey)), kid: "k1", alg: "RS256", use: "sig" };

  const codes = new Map<string, CodeEntry>();
  const refreshTokens = new Map<string, CodeEntry>();
  const accessTokens = new Map<string, MockUser>();
  const revocations: { token: string | null; hint: string | null; clientId: string | null }[] = [];
  const tokenRequests: { grantType: string | null; method: string; clientId: string | null }[] = [];
  const options: { refreshError: boolean; userInfoOverrides: Record<string, unknown> } = { refreshError: false, userInfoOverrides: {} };

  const clientAuthentication = (request: Request, params: URLSearchParams) => {
    const authorization = request.headers.get("authorization");
    if (authorization?.startsWith("Basic ")) {
      const [id, secret] = Buffer.from(authorization.slice(6), "base64")
        .toString()
        .split(":")
        .map((value) => decodeURIComponent(value.replace(/\+/g, " ")));
      return { id, secret, method: "client_secret_basic" };
    }
    return { id: params.get("client_id"), secret: params.get("client_secret"), method: params.get("client_secret") ? "client_secret_post" : "none" };
  };

  async function issueTokens(entry: CodeEntry, withIdToken: boolean) {
    const accessToken = randomBytes(16).toString("hex");
    const refreshToken = randomBytes(16).toString("hex");
    accessTokens.set(accessToken, entry.user);
    refreshTokens.set(refreshToken, entry);

    const response: Record<string, unknown> = { access_token: accessToken, token_type: "Bearer", expires_in: 3600, refresh_token: refreshToken, scope: entry.scope };
    if (withIdToken && entry.oidc !== false) {
      const { aud, ...overrides } = entry.idTokenOverrides ?? {};
      const claims = {
        sub: entry.user.sub,
        email: entry.user.email,
        name: entry.user.name,
        given_name: entry.user.name.split(" ")[0],
        ...(entry.nonce ? { nonce: entry.nonce } : {}),
        ...(entry.user.tid ? { tid: entry.user.tid } : {}),
        ...overrides,
      };
      response.id_token = await new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer(entry.issuer ?? origin)
        .setAudience((aud as string | undefined) ?? entry.clientId)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(entry.badSignature ? rogueKey.privateKey : signingKey.privateKey);
    }
    return response;
  }

  async function tokenEndpoint(request: Request, withIdToken: boolean): Promise<Response> {
    const params = new URLSearchParams(await request.text());
    const client = clientAuthentication(request, params);
    tokenRequests.push({ grantType: params.get("grant_type"), method: client.method, clientId: client.id });
    if (client.secret !== `secret:${client.id}`) return Response.json({ error: "invalid_client" }, { status: 401 });

    if (params.get("grant_type") === "authorization_code") {
      const code = params.get("code") ?? "";
      const entry = codes.get(code);
      codes.delete(code);
      if (!entry || entry.clientId !== client.id) return Response.json({ error: "invalid_grant", error_description: "unknown or used code" }, { status: 400 });
      if (params.get("redirect_uri") !== entry.redirectUri) return Response.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
      const challenge = createHash("sha256").update(params.get("code_verifier") ?? "").digest("base64url");
      if (entry.codeChallenge && challenge !== entry.codeChallenge) return Response.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400 });
      return Response.json(await issueTokens(entry, withIdToken));
    }

    if (params.get("grant_type") === "refresh_token") {
      const refreshToken = params.get("refresh_token") ?? "";
      const entry = refreshTokens.get(refreshToken);
      if (options.refreshError || !entry) return Response.json({ error: "invalid_grant", error_description: "refresh token revoked" }, { status: 400 });
      refreshTokens.delete(refreshToken);
      return Response.json(await issueTokens({ ...entry, nonce: null, idTokenOverrides: {}, badSignature: false }, withIdToken));
    }

    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin !== origin) throw new Error(`mock provider: unexpected request to ${request.url}`);

    switch (url.pathname) {
      case "/.well-known/openid-configuration":
        return Response.json({
          issuer: origin,
          authorization_endpoint: `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
          userinfo_endpoint: `${origin}/userinfo`,
          jwks_uri: `${origin}/jwks`,
          revocation_endpoint: `${origin}/revoke`,
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
        });
      case "/jwks":
        return Response.json({ keys: [publicJwk] });
      case "/token":
        return await tokenEndpoint(request, true);
      case "/oauth2/token":
        return await tokenEndpoint(request, false);
      case "/revoke": {
        const params = new URLSearchParams(await request.text());
        revocations.push({ token: params.get("token"), hint: params.get("token_type_hint"), clientId: clientAuthentication(request, params).id });
        return new Response(null, { status: 200 });
      }
    }

    const user = accessTokens.get((request.headers.get("authorization") ?? "").replace(/^Bearer /i, ""));
    if (!user) return Response.json({ error: "invalid_token" }, { status: 401, headers: { "www-authenticate": 'Bearer error="invalid_token"' } });

    switch (url.pathname) {
      case "/userinfo":
        return Response.json({ sub: user.sub, email: user.email, name: user.name, ...options.userInfoOverrides });
      case "/oauth2/user":
        return Response.json({ id: Number(user.sub), login: "octocat", username: "octocat", global_name: user.name, name: null, email: null, avatar: "a1b2" });
      case "/oauth2/emails":
        return Response.json([
          { email: "secondary@example.com", primary: false, verified: true },
          { email: user.email, primary: true, verified: true },
        ]);
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  }

  /** Plays the user agent: reads the authorization request and returns an authorization code */
  function authorize(authorizationUrl: string | URL, authorizeOptions: AuthorizeOptions) {
    const url = new URL(authorizationUrl);
    const code = randomBytes(12).toString("hex");
    codes.set(code, {
      ...authorizeOptions,
      clientId: url.searchParams.get("client_id") ?? "",
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
      codeChallenge: url.searchParams.get("code_challenge"),
      nonce: url.searchParams.get("nonce"),
      scope: url.searchParams.get("scope") ?? "",
    });
    return { code, state: url.searchParams.get("state") ?? "" };
  }

  function reset() {
    codes.clear();
    refreshTokens.clear();
    accessTokens.clear();
    revocations.length = 0;
    tokenRequests.length = 0;
    options.refreshError = false;
    options.userInfoOverrides = {};
  }

  return {
    origin,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => handle(new Request(input, init)),
    authorize,
    reset,
    revocations,
    tokenRequests,
    options,
  };
}
