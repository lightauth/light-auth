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
  providers?: LightAuthProvider[];
  handlers?: {
    GET: (...args: any[]) => any;
    POST: (...args: any[]) => any;
  };
  signIn?: (args: any) => any;
  signOut?: (args: any) => any;
  basePath?: string;
  getSession?: (args: any) => any;
  getUser?: (args: any) => any;
}
