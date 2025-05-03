import { BaseRequest, BaseResponse } from "./base";
import { LightAuthProvider } from "./light-auth-provider";
import { LightAuthSession } from "./light-auth-session";

export interface LightAuthComponents {
  providers: LightAuthProvider[];
  handlers: {
    GET: (req: BaseRequest, res: BaseResponse, ...params: any[]) => Promise<BaseResponse>;
    POST: (req: BaseRequest, res: BaseResponse, ...params: any[]) => Promise<BaseResponse>;
  };
  signIn: ({ req, res, providerName }: { req?: BaseRequest; res?: BaseResponse; providerName: string }) => Promise<BaseResponse>;
  signOut: ({ req, res }: { req?: BaseRequest; res?: BaseResponse }) => Promise<BaseResponse>;
  basePath: string;
  lightAuth: (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthSession | null | undefined>;
}
