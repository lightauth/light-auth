import { Google, MicrosoftEntraId } from "arctic";
import { CreateLightAuth } from "@light-auth/nextjs";
import { LightAuthProvider } from "@light-auth/core";
const googleProvider: LightAuthProvider = {
  providerName: "google",
  artic: new Google(
    process.env.GOOGLE_CLIENT_ID || "",
    process.env.GOOGLE_CLIENT_SECRET || "",
    "http://localhost:3000/api/auth/callback/google"
  ),
  searchParams: new Map([["access_type", "offline"]]),
};

const microsoftProvider: LightAuthProvider = {
  providerName: "microsoft",
  artic: new MicrosoftEntraId(
    process.env.MICROSOFT_ENTRA_ID_TENANT_ID || "",
    process.env.MICROSOFT_ENTRA_ID_CLIENT_ID || "",
    process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || "",
    "http://localhost:3000/api/auth/callback/microsoft"
  ),
  scopes: ["offline_access"],
};

export const { providers, handlers, signIn, signOut, getSession, getUser } =
  CreateLightAuth({
    
    providers: [googleProvider, microsoftProvider],
    onSessionSaving: async (session, tokens) => {
      if (!tokens) return session;
      if (!tokens.idToken()) return session;

      // optional: Add custom claims to the session
      // This example adds the first and last name from the idToken to the session
      const idToken = JSON.parse(
        Buffer.from(tokens.idToken().split(".")[1], "base64").toString()
      );

      if ("given_name" in idToken && typeof idToken.given_name === "string")
        session["firstName"] = idToken.given_name;

      if ("family_name" in idToken && typeof idToken.family_name === "string")
        session["lastName"] = idToken.family_name;

      return session;
    },
  });
