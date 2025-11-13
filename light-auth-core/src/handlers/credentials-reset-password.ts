import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig } from "../services/utils";

/**
 * Handles password reset requests.
 * This handler initiates the password reset process by sending a reset email.
 */
export async function credentialsResetPasswordRequestHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  email: string;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, email } = args;

  const { router, provider, env, basePath } = checkConfig(config, "credentials");

  try {
    // Verify this is a credentials provider
    if (provider.type !== "credentials") {
      throw new Error("light-auth: Provider must be a credentials provider for password reset");
    }

    // Validate email is provided
    if (!email) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Email is required" },
        init: { status: 400 },
        ...args,
      });
    }

    // Check if provider supports password reset
    if (!provider.requestPasswordReset) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Password reset is not supported by this provider" },
        init: { status: 501 },
        ...args,
      });
    }

    // Request password reset
    const success = await provider.requestPasswordReset(email);

    // Always return success for security reasons (don't reveal if email exists)
    // The provider should handle sending the email internally
    return await router.returnJson({
      env,
      basePath,
      data: {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      },
      init: { status: 200 },
      ...args,
    });
  } catch (error) {
    console.error("Error in credentialsResetPasswordRequestHandler:", error);
    // Still return success to avoid revealing if email exists
    return await router.returnJson({
      env,
      basePath,
      data: {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      },
      init: { status: 200 },
      ...args,
    });
  }
}

/**
 * Handles password reset confirmation with token.
 * This handler completes the password reset process by setting a new password.
 */
export async function credentialsResetPasswordConfirmHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  token: string;
  newPassword: string;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, token, newPassword } = args;

  const { router, provider, env, basePath } = checkConfig(config, "credentials");

  try {
    // Verify this is a credentials provider
    if (provider.type !== "credentials") {
      throw new Error("light-auth: Provider must be a credentials provider for password reset");
    }

    // Validate token and password are provided
    if (!token || !newPassword) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Token and new password are required" },
        init: { status: 400 },
        ...args,
      });
    }

    // Check if provider supports password reset
    if (!provider.resetPassword) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Password reset is not supported by this provider" },
        init: { status: 501 },
        ...args,
      });
    }

    // Attempt to reset password with token
    const success = await provider.resetPassword(token, newPassword);

    if (!success) {
      return await router.returnJson({
        env,
        basePath,
        data: { error: "Invalid or expired reset token" },
        init: { status: 400 },
        ...args,
      });
    }

    return await router.returnJson({
      env,
      basePath,
      data: {
        success: true,
        message: "Password has been reset successfully. You can now login with your new password.",
      },
      init: { status: 200 },
      ...args,
    });
  } catch (error) {
    console.error("Error in credentialsResetPasswordConfirmHandler:", error);
    return await router.returnJson({
      env,
      basePath,
      data: { error: "Password reset failed" },
      init: { status: 500 },
      ...args,
    });
  }
}
