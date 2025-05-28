import { CreateLightAuthClient } from "@light-auth/astro/client";

export const { getAuthSession, getUser, signIn, signOut } = CreateLightAuthClient({
  basePath: "/api/auth",
  env: import.meta.env,
});
