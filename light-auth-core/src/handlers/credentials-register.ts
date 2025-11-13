import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge } from "../services/utils";

/**
 * Handles user registration for credential-based authentication.
 * This handler creates a new user account and optionally logs them in.
 */
export async function credentialsRegisterHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  email: string;
  password: string;
  name?: string;
  autoLogin?: boolean;
  additionalData?: { [key: string]: unknown };
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, email, password, name, autoLogin = true, additionalData = {} } = args;

  const { router, userAdapter, provider, sessionStore, env, basePath } = checkConfig(config, "credentials");

  try {
    // Verify this is a credentials provider
    if (provider.type !== "credentials") {
      throw new Error("light-auth: Provider must be a credentials provider for registration");
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

    // Check if provider supports registration
    if (!provider.registerUser) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "User registration is not supported by this provider" },
        init: { status: 501 },
        ...args,
      });
    }

    // Attempt to register the user
    const claims = await provider.registerUser(email, password, { name, ...additionalData });

    if (!claims) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Registration failed. User may already exist." },
        init: { status: 409 },
        ...args,
      });
    }

    // If autoLogin is disabled, just return success
    if (!autoLogin) {
      return await router.returnJson({
        env,
        basePath,
        data: {
          success: true,
          message: "User registered successfully",
          user: {
            email: claims.email,
            name: claims.name,
          },
        },
        init: { status: 201 },
        ...args,
      });
    }

    // Auto-login: Create session for the new user
    const sessionId = sessionStore.generateSessionId();
    const maxAge = getSessionExpirationMaxAge();
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    // Create session from claims
    const { sub, email: claimsEmail, name: claimsName, picture, ...additionalClaims } = claims;
    
    let session = {
      id: sessionId,
      providerUserId: sub,
      email: claimsEmail,
      name: claimsName,
      expiresAt: expiresAt,
      providerName: provider.providerName,
      ...additionalClaims,
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

    // Persist user data if adapter is available
    if (userAdapter) {
      const { expiresAt: sessionExpiresAt, id: sessionIdField, ...sessionWithoutExpiresAt } = session;

      let user = {
        ...sessionWithoutExpiresAt,
        picture: claims.picture,
      } as User;

      if (config.onUserSaving) {
        const userSaving = await config.onUserSaving(user, undefined, args);
        user = userSaving ?? user;
      }

      user = await userAdapter.setUser({ user, env, basePath, ...args });

      if (config.onUserSaved) {
        await config.onUserSaved(user, args);
      }
    }

    // Return success with session
    return await router.returnJson({
      env,
      basePath,
      data: {
        success: true,
        message: "User registered and logged in successfully",
        session: {
          email: session.email,
          name: session.name,
          providerName: session.providerName,
        },
      },
      init: { status: 201 },
      ...args,
    });
  } catch (error) {
    console.error("Error in credentialsRegisterHandler:", error);
    return await router.returnJson({
      env,
      basePath,
      data: { error: "Registration failed" },
      init: { status: 500 },
      ...args,
    });
  }
}
