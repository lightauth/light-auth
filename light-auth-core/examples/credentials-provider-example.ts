/**
 * Example: Creating a Credentials Provider
 * 
 * This example shows how to create a credentials-based authentication provider
 * that verifies email/password against a database.
 */

import { createCredentialsProvider } from "@light-auth/core";
import type { LightAuthUserClaims } from "../src/models/light-auth-provider";
// import bcrypt from "bcrypt"; // Install: npm install bcrypt @types/bcrypt

// Mock bcrypt for example purposes
const bcrypt = {
  hash: async (password: string, rounds: number) => `hashed_${password}`,
  compare: async (password: string, hash: string) => hash === `hashed_${password}`,
};

// Example database interface (replace with your actual database)
interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
}

// Mock database for example purposes
const database = {
  users: {
    findByEmail: async (email: string): Promise<User | null> => {
      // Replace with actual database query
      // Example: return await db.query("SELECT * FROM users WHERE email = ?", [email]);
      return null;
    },
    create: async (data: { email: string; passwordHash: string; fullName: string }): Promise<User> => {
      // Replace with actual database insert
      // Example: return await db.query("INSERT INTO users ...", data);
      return {
        id: "user-id",
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
      };
    },
  },
};

/**
 * Create a credentials provider for email/password authentication
 */
export const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",

  /**
   * Verify user credentials against your database
   */
  verifyCredentials: async (email: string, password: string, metadata?: Record<string, unknown>): Promise<LightAuthUserClaims | null> => {
    try {
      // 1. Find user by email
      const user = await database.users.findByEmail(email);
      if (!user) {
        return null; // User not found
      }

      // 2. Compare password with stored hash
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return null; // Invalid password
      }

      // 3. Return user claims if authentication successful
      return {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        picture: user.avatarUrl,
      };
    } catch (error) {
      console.error("Error verifying credentials:", error);
      return null;
    }
  },

  /**
   * Hash passwords before storing (optional but recommended)
   */
  hashPassword: async (password: string): Promise<string> => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  },

  /**
   * Compare plaintext password with hash (optional)
   */
  comparePassword: async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
  },

  /**
   * Register a new user (optional)
   */
  registerUser: async (email: string, password: string, additionalData?: { name?: string; [key: string]: unknown }): Promise<LightAuthUserClaims | null> => {
    try {
      // 1. Check if user already exists
      const existingUser = await database.users.findByEmail(email);
      if (existingUser) {
        return null; // User already exists
      }

      // 2. Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // 3. Create user in database
      const user = await database.users.create({
        email,
        passwordHash,
        fullName: additionalData?.name || email.split("@")[0],
      });

      // 4. Return user claims
      return {
        sub: user.id,
        email: user.email,
        name: user.fullName,
      };
    } catch (error) {
      console.error("Error registering user:", error);
      return null;
    }
  },

  /**
   * Request password reset (optional)
   * This should send a reset email with a token
   */
  requestPasswordReset: async (email: string): Promise<boolean> => {
    try {
      const user = await database.users.findByEmail(email);
      if (!user) {
        return false; // User not found
      }

      // Generate reset token and send email
      // Implementation depends on your email service
      // const resetToken = generateSecureToken();
      // await sendResetEmail(email, resetToken);

      return true;
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return false;
    }
  },

  /**
   * Reset password with token (optional)
   */
  resetPassword: async (token: string, newPassword: string): Promise<boolean> => {
    try {
      // 1. Validate reset token
      // 2. Find user by token
      // 3. Hash new password
      // 4. Update user password
      // Implementation depends on your token storage strategy

      return true;
    } catch (error) {
      console.error("Error resetting password:", error);
      return false;
    }
  },
});

/**
 * Usage in Light Auth configuration:
 * 
 * import { CreateLightAuth } from "@light-auth/nextjs";
 * import { credentialsProvider } from "./credentials-provider";
 * 
 * export const { handlers, signIn, signOut, getAuthSession } = CreateLightAuth({
 *   providers: [
 *     credentialsProvider,
 *     // ... other OAuth providers
 *   ],
 * });
 */
