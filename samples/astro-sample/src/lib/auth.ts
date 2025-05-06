import { Google, MicrosoftEntraId } from "arctic";
import { type LightAuthProvider } from "@light-auth/core";
import { CreateLightAuth } from "./light-auth";

const googleProvider: LightAuthProvider = {
  providerName: "google",
  artic: new Google(import.meta.env.GOOGLE_CLIENT_ID || "", import.meta.env.GOOGLE_CLIENT_SECRET || "", "http://localhost:4321/api/auth/callback/google"),
  searchParams: new Map([["access_type", "offline"]]),
};

const microsoftProvider: LightAuthProvider = {
  providerName: "microsoft",
  artic: new MicrosoftEntraId(
    import.meta.env.MICROSOFT_ENTRA_ID_TENANT_ID || "",
    import.meta.env.MICROSOFT_ENTRA_ID_CLIENT_ID || "",
    import.meta.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || "",
    "http://localhost:8000/api/auth/callback/microsoft"
  ),
  scopes: ["offline_access"],
};

export const { providers, handlers, signIn, signOut, getSession, getUser, getAstroSession } = CreateLightAuth({
  providers: [googleProvider, microsoftProvider],
  basePath: "/api/auth", // Optional: specify a custom base path for the handlers
});
