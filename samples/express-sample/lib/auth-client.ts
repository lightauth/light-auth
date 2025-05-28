import { CreateLightAuthClient } from "@light-auth/express/client";

export const { getAuthSession, getUser, signIn, signOut } = CreateLightAuthClient({
  basePath: "/api/auth",
});
