/**
 * LightAuthSession interface represents a session in the LightAuth system.
 *
 * The session instance is saved using the sessionStore.
 */
export type LightAuthSession = {
  id: string;
  email: string;
  name: string;
  expiresAt: Date;
  providerName: string;
  providerUserId: string | number;
};

/**
 * LightAuthUser interface represents a user in the LightAuth system.
 *
 * It extends the LightAuthSession interface but omits the expiresAt property.
 *
 * This interface includes optional properties for user profile and authentication tokens.
 *
 * Still, you can add more properties as needed.
 *
 * The user instance is saved in your data store using the userAdapter.
 */
export type LightAuthUser<T extends LightAuthSession = LightAuthSession> = Omit<T, "expiresAt" | "id"> & {
  // we are not using expiresAt in the user object as session can be updated anytime and we don't want to call update on user for this
  picture?: string | null | undefined;
  accessToken?: string | null | undefined;
  accessTokenExpiresAt?: Date | null | undefined;
  refreshToken?: string | null | undefined;
};
