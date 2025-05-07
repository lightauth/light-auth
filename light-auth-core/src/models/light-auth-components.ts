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
    GET: (...args: any[]) => BaseResponse | Promise<BaseResponse>;
    POST: (...args: any[]) => BaseResponse | Promise<BaseResponse>;
  };
  signIn: (...args: any[]) => Promise<BaseResponse>;
  signOut: (...args: any[]) => Promise<BaseResponse>;
  basePath: string;
  getSession: (...args: any[]) => Promise<LightAuthSession | null | undefined>;
  getUser: (...args: any[]) => Promise<LightAuthUser | null | undefined>;
}
