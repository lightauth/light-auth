import { internalFetch } from "../services/internal-fetch";
import { getCsrfToken } from "../services/csrf";
import type { LightAuthConfig, LightAuthSession, LightAuthUser } from "../models";

/**
 * Client-side function to login with email and password.
 * This function should be called from the browser/client-side only.
 *
 * @param args - Login parameters
 * @returns Response with session data or error
 */
export async function credentialsLogin<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  email: string;
  password: string;
  callbackUrl?: string;
}): Promise<{ success: boolean; session?: Partial<Session>; error?: string }> {
  const { config, email, password, callbackUrl = "/" } = args;

  try {
    const isServerSide = typeof window === "undefined";
    if (isServerSide) {
      throw new Error("light-auth: credentialsLogin should not be called on the server side");
    }

    // Get CSRF token first
    await getCsrfToken({ config });

    // Make login request
    const endpoint = `${config.basePath}/credentials/login`;
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    
    const response = await internalFetch<{
      success: boolean;
      session?: Partial<Session>;
      error?: string;
      callbackUrl?: string;
    }>({
      config,
      method: "POST",
      endpoint,
      body: JSON.stringify({ email, password, callbackUrl }),
      headers,
    });

    if (response?.success) {
      return {
        success: true,
        session: response.session,
      };
    }

    return {
      success: false,
      error: response?.error || "Login failed",
    };
  } catch (error) {
    console.error("Error in credentialsLogin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}

/**
 * Client-side function to register a new user with email and password.
 * This function should be called from the browser/client-side only.
 *
 * @param args - Registration parameters
 * @returns Response with session data or error
 */
export async function credentialsRegister<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  email: string;
  password: string;
  name?: string;
  autoLogin?: boolean;
  additionalData?: { [key: string]: unknown };
}): Promise<{ success: boolean; session?: Partial<Session>; user?: Partial<User>; error?: string; message?: string }> {
  const { config, email, password, name, autoLogin = true, additionalData = {} } = args;

  try {
    const isServerSide = typeof window === "undefined";
    if (isServerSide) {
      throw new Error("light-auth: credentialsRegister should not be called on the server side");
    }

    // Get CSRF token first
    await getCsrfToken({ config });

    // Make registration request
    const endpoint = `${config.basePath}/credentials/register`;
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    
    const response = await internalFetch<{
      success: boolean;
      session?: Partial<Session>;
      user?: Partial<User>;
      error?: string;
      message?: string;
    }>({
      config,
      method: "POST",
      endpoint,
      body: JSON.stringify({ email, password, name, autoLogin, additionalData }),
      headers,
    });

    if (response?.success) {
      return {
        success: true,
        session: response.session,
        user: response.user,
        message: response.message,
      };
    }

    return {
      success: false,
      error: response?.error || "Registration failed",
    };
  } catch (error) {
    console.error("Error in credentialsRegister:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}

/**
 * Client-side function to request a password reset.
 * This function should be called from the browser/client-side only.
 *
 * @param args - Password reset request parameters
 * @returns Response indicating if reset email was sent
 */
export async function credentialsResetPasswordRequest<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: { config: LightAuthConfig<Session, User>; email: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  const { config, email } = args;

  try {
    const isServerSide = typeof window === "undefined";
    if (isServerSide) {
      throw new Error("light-auth: credentialsResetPasswordRequest should not be called on the server side");
    }

    // Get CSRF token first
    await getCsrfToken({ config });

    // Make password reset request
    const endpoint = `${config.basePath}/credentials/reset-password/request`;
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    
    const response = await internalFetch<{
      success: boolean;
      message?: string;
      error?: string;
    }>({
      config,
      method: "POST",
      endpoint,
      body: JSON.stringify({ email }),
      headers,
    });

    return {
      success: response?.success || false,
      message: response?.message || "If an account with that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    console.error("Error in credentialsResetPasswordRequest:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Password reset request failed",
    };
  }
}

/**
 * Client-side function to confirm password reset with token.
 * This function should be called from the browser/client-side only.
 *
 * @param args - Password reset confirmation parameters
 * @returns Response indicating if password was reset successfully
 */
export async function credentialsResetPasswordConfirm<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: { config: LightAuthConfig<Session, User>; token: string; newPassword: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  const { config, token, newPassword } = args;

  try {
    const isServerSide = typeof window === "undefined";
    if (isServerSide) {
      throw new Error("light-auth: credentialsResetPasswordConfirm should not be called on the server side");
    }

    // Get CSRF token first
    await getCsrfToken({ config });

    // Make password reset confirmation request
    const endpoint = `${config.basePath}/credentials/reset-password/confirm`;
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    
    const response = await internalFetch<{
      success: boolean;
      message?: string;
      error?: string;
    }>({
      config,
      method: "POST",
      endpoint,
      body: JSON.stringify({ token, newPassword }),
      headers,
    });

    if (response?.success) {
      return {
        success: true,
        message: response.message || "Password has been reset successfully.",
      };
    }

    return {
      success: false,
      error: response?.error || "Password reset failed",
    };
  } catch (error) {
    console.error("Error in credentialsResetPasswordConfirm:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Password reset confirmation failed",
    };
  }
}
