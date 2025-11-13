import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge } from "../services/utils";

/**
 * Handles credential-based login (email/password).
 * This handler validates user credentials and creates a session.
 */
export async function credentialsLoginHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  email: string;
  password: string;
  callbackUrl?: string;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, email, password, callbackUrl = "/" } = args;

  const { router, userAdapter, provider, sessionStore, env, basePath } = checkConfig(config, "credentials");

  try {
    // Verify this is a credentials provider
    if (provider.type !== "credentials") {
      throw new Error("light-auth: Provider must be a credentials provider for login");
    }

    // Validate email and password are provided
    if (!email || !password) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Email and password are required" },
        init: { status: 400 },
        ...args,
      });
    }

    // Verify credentials using the provider's verification function
    const claims = await provider.verifyCredentials(email, password, args);

    if (!claims) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Invalid email or password" },
        init: { status: 401 },
        ...args,
      });
    }

    // Generate session ID and expiration
    const id = sessionStore.generateSessionId();
    const maxAge = getSessionExpirationMaxAge();
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    // Create session from claims
    const { sub, email: claimsEmail, name: claimsName, picture, ...additionalClaims } = claims;
    
    let session = {
      id: id,
      providerUserId: sub,
      email: claimsEmail,
      name: claimsName,
      expiresAt: expiresAt,
      providerName: provider.providerName,
      ...additionalClaims, // Include any additional custom claims
    } as Session;

    // Allow custom session modification before saving
    if (config.onSessionSaving) {
      const sessionSaving = await config.onSessionSaving(session, undefined, args);
      session = sessionSaving ?? session;
    }

    // Save session to store
    session = await sessionStore.setSession({ env, basePath, session, ...args });

    // Trigger post-save hook
    if (config.onSessionSaved) {
      await config.onSessionSaved(session, args);
    }

    // Optionally persist user data
    if (userAdapter) {
      // Omit expiresAt and id from session when creating user
      const { expiresAt: sessionExpiresAt, id: sessionId, ...sessionWithoutExpiresAt } = session;

      let user = {
        ...sessionWithoutExpiresAt,
        picture: claims.picture,
      } as User;

      // Allow custom user modification before saving
      if (config.onUserSaving) {
        const userSaving = await config.onUserSaving(user, undefined, args);
        user = userSaving ?? user;
      }

      // Save user to adapter
      user = await userAdapter.setUser({ user, env, basePath, ...args });

      // Trigger post-save hook
      if (config.onUserSaved) {
        await config.onUserSaved(user, args);
      }
    }

    // Return success response with session data
    return await router.returnJson({
      env,
      basePath,
      data: {
        success: true,
        session: {
          email: session.email,
          name: session.name,
          providerName: session.providerName,
        },
        callbackUrl,
      },
      init: { status: 200 },
      ...args,
    });
  } catch (error) {
    console.error("Error in credentialsLoginHandler:", error);
    return await router.returnJson({
      env,
      basePath,
      data: { error: "Authentication failed" },
      init: { status: 500 },
      ...args,
    });
  }
}
