import { CreateLightAuthClient } from "@light-auth/express/client";

export const { getSession, getUser, signIn, signOut } = CreateLightAuthClient({
  basePath: "/api/auth",
});
