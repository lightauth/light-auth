import { Google, MicrosoftEntraId } from "arctic";
import { LightAuthProvider } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { CreateLightAuth } from "./light-auth/light-auth";

const googleProvider: LightAuthProvider = {
  providerName: "google",
  artic: new Google(process.env.GOOGLE_CLIENT_ID || "", process.env.GOOGLE_CLIENT_SECRET || "", "http://localhost:8000/api/auth/callback/google"),
  searchParams: new Map([["access_type", "offline"]]),
};

const microsoftProvider: LightAuthProvider = {
  providerName: "microsoft",
  artic: new MicrosoftEntraId(
    process.env.MICROSOFT_ENTRA_ID_TENANT_ID || "",
    process.env.MICROSOFT_ENTRA_ID_CLIENT_ID || "",
    process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || "",
    "http://localhost:8000/api/auth/callback/microsoft"
  ),
  scopes: ["offline_access"],
};

export const { providers, handlers, middleware, signIn, signOut, getSession, getUser } = CreateLightAuth({
  providers: [googleProvider, microsoftProvider],
  basePath: "/api/auth", // Optional: specify a custom base path for the handlers
});
