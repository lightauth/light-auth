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
    // userAdapter: nextJsLightAuthUserAdapterCookie,

    providers: [googleProvider, microsoftProvider],
  });
