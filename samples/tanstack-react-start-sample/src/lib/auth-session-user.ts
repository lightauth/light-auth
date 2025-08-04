import { LightAuthSession, LightAuthUser } from "@light-auth/core";

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
