import type { LightAuthSession, LightAuthUser } from "@light-auth/core";
import { CreateLightAuthClient } from "@light-auth/nuxt/client";

export type MyLightAuthSession = LightAuthSession & {
  // Add any additional properties you want to include in your custom session type
  firstName?: string;
  lastName?: string;
};

export type MyLightAuthUser = LightAuthUser<MyLightAuthSession> & {
  // Add any additional properties you want to include in your custom user type
  email_verified?: boolean;
  iss?: string;
  sub?: string;
};

export const { signIn, signOut, getSession, getUser } = CreateLightAuthClient<MyLightAuthSession, MyLightAuthUser>();
