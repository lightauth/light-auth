// Example: Using Prisma with Credentials Provider
// This shows how to replace the in-memory user store with Prisma

import { createCredentialsProvider } from "@light-auth/core";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const credentialsProviderWithPrisma = createCredentialsProvider({
  providerName: "credentials",

  verifyCredentials: async (email, password) => {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        console.log("Account locked:", email);
        return null;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        // Increment failed attempts
        const newFailedAttempts = user.failedAttempts + 1;
        const updates: any = { failedAttempts: newFailedAttempts };

        // Lock account after 5 failed attempts for 15 minutes
        if (newFailedAttempts >= 5) {
          updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        }

        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });

        return null;
      }

      // Reset failed attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });

      return {
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      };
    } catch (error) {
      console.error("Error verifying credentials:", error);
      return null;
    }
  },

  registerUser: async (email, password, additionalData) => {
    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: (additionalData?.name as string) || email.split("@")[0],
        },
      });

      return {
        sub: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      console.error("Error registering user:", error);
      return null;
    }
  },

  requestPasswordReset: async (email) => {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return true; // Don't reveal if user exists

      // Generate token
      const token = crypto.randomUUID();

      // Create password reset record
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      });

      // TODO: Send email with token
      console.log("Password reset token:", token);

      return true;
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return false;
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const reset = await prisma.passwordReset.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
        },
      });

      if (!reset) return false;

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      });

      // Delete used token
      await prisma.passwordReset.delete({
        where: { id: reset.id },
      });

      return true;
    } catch (error) {
      console.error("Error resetting password:", error);
      return false;
    }
  },
});
