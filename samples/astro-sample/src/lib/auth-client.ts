import { CreateLightAuthClient } from "../light-auth/light-auth-client";

export const { signIn, signOut } = CreateLightAuthClient({
  basePath: "/api/auth", // Optional: specify a custom base path for the handlers
});
