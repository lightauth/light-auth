import { BaseResponse } from "./light-auth-base";
import { LightAuthConfig } from "./light-auth-config";

export interface LightAuthRouter {
  redirectTo: (args: { config: LightAuthConfig; url: string; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: (args: { config: LightAuthConfig; search?: string | RegExp; [key: string]: unknown }) => Headers | Promise<Headers>;
  setHeaders: (args: { config: LightAuthConfig; headers?: Headers; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getUrl: (args: { config: LightAuthConfig; endpoint?: string; [key: string]: unknown }) => string | Promise<string>;
  writeJson: (args: { config: LightAuthConfig; data: {} | null; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
}
