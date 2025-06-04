import { Google, MicrosoftEntraId } from "arctic";
import { LightAuthProvider } from "@light-auth/core";
import { CreateLightAuth } from "@light-auth/express";

const googleProvider: LightAuthProvider = {
  providerName: "google",
  arctic: new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, process.env.REDIRECT_URI!),
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

export const { providers, handlers, middleware, signIn, signOut, getAuthSession, getUser } = CreateLightAuth({
  providers: [googleProvider, microsoftProvider],
  basePath: "/api/auth", // Optional: specify a custom base path for the handlers
});
