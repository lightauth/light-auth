import { Google, MicrosoftEntraId } from "arctic";
import { CreateLightAuth } from "@light-auth/nextjs";
import { createLightAuthRateLimiter, LightAuthProvider } from "@light-auth/core";
import { MyLightAuthSession, MyLightAuthUser } from "./auth-session-user";
import { lightAuthSupabaseUserAdapter } from "./light-auth-supabase-user-adapter";
const googleProvider: LightAuthProvider = {
  providerName: "google",
  arctic: new Google(process.env.GOOGLE_CLIENT_ID || "", process.env.GOOGLE_CLIENT_SECRET || "", "http://localhost:3000/api/auth/callback/google"),
  searchParams: new Map([["access_type", "offline"]]),
};

const microsoftProvider: LightAuthProvider = {
  providerName: "microsoft",
  arctic: new MicrosoftEntraId(
    process.env.MICROSOFT_ENTRA_ID_TENANT_ID || "",
    process.env.MICROSOFT_ENTRA_ID_CLIENT_ID || "",
    process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || "",
    "http://localhost:3000/api/auth/callback/microsoft"
  ),
  scopes: ["offline_access"],
};

export const { providers, handlers, signIn, signOut, getAuthSession, getUser } = CreateLightAuth<MyLightAuthSession, MyLightAuthUser>({
  providers: [googleProvider, microsoftProvider],

  rateLimiter: createLightAuthRateLimiter({
    maxRequestsPerTimeWindowsMs: 100,
    timeWindowMs: 1000, // 1 second,
    errorMessage: "Too many requests, please try again later.",
    statusCode: 429,
  }),

  // userAdapter: lightAuthSupabaseUserAdapter,

  onSessionSaving: async (session, tokens) => {
    if (!tokens) return session;
    if (!tokens.idToken()) return session;

    // optional: Add custom claims to the user
    // This example adds the first and last name from the idToken to the user
    const idToken = JSON.parse(Buffer.from(tokens.idToken().split(".")[1], "base64").toString());

    if ("given_name" in idToken && typeof idToken.given_name === "string") session.firstName = idToken.given_name;
    if ("family_name" in idToken && typeof idToken.family_name === "string") session.lastName = idToken.family_name;

    return session;
  },

  onUserSaving: async (user, tokens) => {
    if (!tokens) return user;
    if (!tokens.idToken()) return user;

    // optional: Add custom claims to the user
    // This example adds the first and last name from the idToken to the user
    const idToken = JSON.parse(Buffer.from(tokens.idToken().split(".")[1], "base64").toString());

    if ("iss" in idToken && typeof idToken.iss === "string") user.iss = idToken.iss;
    if ("email_verified" in idToken && typeof idToken.email_verified === "boolean") user.email_verified = idToken.email_verified;
    if ("sub" in idToken && typeof idToken.sub === "string") user.sub = idToken.sub;

    return user;
  },
});
