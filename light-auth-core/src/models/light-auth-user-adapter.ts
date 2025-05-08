import { LightAuthConfig } from "./light-auth-config";
import { LightAuthUser } from "./light-auth-session";

export interface LightAuthUserAdapter {
  getUser: (args: { config: LightAuthConfig; id: string; [key: string]: unknown }) => LightAuthUser | null | Promise<LightAuthUser | null>;
  setUser: (args: { config: LightAuthConfig; user: LightAuthUser; [key: string]: unknown }) => Promise<void>;
  deleteUser: (args: { config: LightAuthConfig; user: LightAuthUser; [key: string]: unknown }) => Promise<void>;
}
