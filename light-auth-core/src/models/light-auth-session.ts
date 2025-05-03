/**
 * LightAuthSession interface represents a session in the LightAuth system.
 *
 */
export interface LightAuthSession {
  id: string;
  userId: string | number;
  email: string;
  name: string;
  expiresAt: Date;
  providerName: string;
  [key: string]: any;
}

export interface LightAuthUser extends LightAuthSession {
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
}
