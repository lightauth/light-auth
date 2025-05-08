import { BaseResponse } from "./light-auth-base";
import { LightAuthConfig } from "./light-auth-config";

import { LightAuthSession } from "./light-auth-session";

export interface LightAuthSessionStore {
  getSession: (args: { config: LightAuthConfig; [key: string]: unknown }) => LightAuthSession | null | Promise<LightAuthSession | null>;
  setSession: (args: { config: LightAuthConfig; session: LightAuthSession; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  deleteSession: (args: { config: LightAuthConfig; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  generateSessionId: () => string;
}
