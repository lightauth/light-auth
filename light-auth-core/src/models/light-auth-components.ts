import { BaseRequest, BaseResponse } from "./light-auth-base";
import { LightAuthProvider } from "./light-auth-provider";
import { LightAuthSession, LightAuthUser } from "./light-auth-session";

/**
 * LightAuthComponents is an interface that defines the structure of the LightAuth components.
 * It includes the providers, base path, handlers for GET and POST requests, and functions for signing in,
 * signing out, and retrieving the light auth session and user.
 * It also provides methods for managing user sessions and authentication states.
 */
export interface LightAuthComponents {
  providers: LightAuthProvider[];
  handlers: {
    GET: (req: BaseRequest, res: BaseResponse, ...params: any[]) => Promise<BaseResponse>;
    POST: (req: BaseRequest, res: BaseResponse, ...params: any[]) => Promise<BaseResponse>;
  };
  signIn: ({ req, res, providerName }: { req?: BaseRequest; res?: BaseResponse; providerName: string }) => Promise<BaseResponse>;
  signOut: ({ req, res }: { req?: BaseRequest; res?: BaseResponse }) => Promise<BaseResponse>;
  basePath: string;
  getSession: (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthSession | null | undefined>;
  getUser: (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthUser | null | undefined>;
}
