import { LightAuthUser } from "./light-auth-session";

export interface LightAuthUserAdapter {
  getUser: (args: { id: string; [key: string]: unknown }) => LightAuthUser | null | Promise<LightAuthUser | null>;
  setUser: (args: { user: LightAuthUser; [key: string]: unknown }) => Promise<void>;
  deleteUser: (args: { user: LightAuthUser; [key: string]: unknown }) => Promise<void>;
}
