import { createCredentialsProvider } from "@light-auth/core";
import bcrypt from "bcrypt";

// In-memory user store for demo purposes
// In production, replace this with your database (Prisma, Drizzle, Supabase, etc.)
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

const users: Map<string, User> = new Map();

// Demo user: email@example.com / password123
const demoUser: User = {
  id: "demo-user-1",
  email: "email@example.com",
  passwordHash: "$2b$10$Xh8Q0YN5VLV5VN5VN5VN5uelNX5qH.5YN5VN5VN5VN5VN5VN5VN5K", // password123
  name: "Demo User",
  createdAt: new Date(),
};
users.set(demoUser.email, demoUser);

export const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",

  // Required: Verify user credentials
  verifyCredentials: async (email, password) => {
    try {
      const user = users.get(email);
      if (!user) {
        console.log("User not found:", email);
        return null;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        console.log("Invalid password for:", email);
        return null;
      }

      console.log("User authenticated:", email);
      return {
        sub: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      console.error("Error verifying credentials:", error);
      return null;
    }
  },

  // Optional: Register new users
  registerUser: async (email, password, additionalData) => {
    try {
      // Check if user already exists
      if (users.has(email)) {
        console.log("User already exists:", email);
        return null;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new user
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        passwordHash,
        name: (additionalData?.name as string) || email.split("@")[0],
        createdAt: new Date(),
      };

      users.set(email, newUser);
      console.log("User registered:", email);

      return {
        sub: newUser.id,
        email: newUser.email,
        name: newUser.name,
      };
    } catch (error) {
      console.error("Error registering user:", error);
      return null;
    }
  },

  // Optional: Password reset request
  requestPasswordReset: async (email) => {
    try {
      const user = users.get(email);
      if (!user) {
        // Don't reveal if user exists
        console.log("Password reset requested for non-existent user:", email);
        return true;
      }

      // In production, generate token and send email
      console.log("Password reset requested for:", email);
      console.log("Reset token would be sent to email");

      return true;
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return false;
    }
  },

  // Optional: Complete password reset
  resetPassword: async (token, newPassword) => {
    try {
      // In production, validate token from database
      console.log("Password reset with token:", token);

      // For demo purposes, this would work if you had a valid token
      // In production, look up the token in your database
      return false; // Return false since we don't have a real token system
    } catch (error) {
      console.error("Error resetting password:", error);
      return false;
    }
  },
});

// Helper function to list all users (for development/debugging)
export function listUsers() {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }));
}
