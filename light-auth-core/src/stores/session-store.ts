import { BaseRequest, BaseResponse } from "../models/base";
import { LightAuthSession } from "../models/light-auth-session";

export interface SessionStore {
  getSession: ({ req, res }: { req?: BaseRequest; res?: BaseResponse }) => LightAuthSession | null | Promise<LightAuthSession | null>;
  setSession: ({ req, res, session }: { req?: BaseRequest; res?: BaseResponse; session: LightAuthSession }) => Promise<void>;
  deleteSession: ({ req, res }: { req?: BaseRequest; res?: BaseResponse }) => Promise<void>;
  generateSessionId: () => string;
}
