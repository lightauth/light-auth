import { createGoogleProvider, createMicrosoftEntraIdProvider } from "@light-auth/core";
import { CreateLightAuth } from "@light-auth/express";

const googleProvider = createGoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
  accessType: "offline",
});

const microsoftProvider = createMicrosoftEntraIdProvider({
  tenant: process.env.MICROSOFT_ENTRA_ID_TENANT_ID || undefined,
  clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID || "",
  clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || "",
  redirectUri: "http://localhost:3000/api/auth/callback/microsoft",
  scopes: ["offline_access"],
});

export const { providers, handlers, middleware, signIn, signOut, getAuthSession, getUser } = CreateLightAuth({
  providers: [googleProvider, microsoftProvider],
  basePath: "/api/auth", // Optional: specify a custom base path for the handlers
});
