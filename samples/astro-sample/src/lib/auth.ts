import { createGoogleProvider } from "@light-auth/core";
import { CreateLightAuth } from "@light-auth/astro";

const googleProvider = createGoogleProvider({
  clientId: import.meta.env.GOOGLE_CLIENT_ID || "",
  clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri: "http://localhost:4321/api/auth/callback/google",
  accessType: "offline",
});

export const { providers, handlers, getAuthSession, getUser, signIn, signOut } = CreateLightAuth({
  providers: [googleProvider],
});
